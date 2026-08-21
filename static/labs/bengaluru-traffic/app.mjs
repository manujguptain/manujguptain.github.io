const START_KEY='2026-08-21';
const END_KEY='2026-12-31';
const EMPTY_SIGNALS={generatedAt:null,weather:[],events:[],advisories:[],notes:[]};
const zoneSelect=document.querySelector('#zoneSelect');
const monthSelect=document.querySelector('#monthSelect');
const calendar=document.querySelector('#calendar');
const summary=document.querySelector('#summary');
const legend=document.querySelector('#legend');

try{
  const [config,holidayData,historical,liveSignals]=await Promise.all([
    loadJson('./data/config.json'),
    loadJson('./data/holidays-2026.json'),
    loadJson('./data/historical-baseline-2025.json'),
    loadJson('./data/live-signals.json',EMPTY_SIGNALS)
  ]);
  const holidayByDate=new Map((holidayData.holidays??[]).map(h=>[h.date,h]));
  const weatherByKey=new Map((liveSignals.weather??[]).map(w=>[`${w.date}|${w.windowId}`,w]));
  const dateKeys=buildDateKeys(START_KEY,END_KEY);
  const months=[...new Set(dateKeys.map(monthKey))];

  for(const z of config.zones??[]){const o=document.createElement('option');o.value=z.id;o.textContent=`${z.name} — ${z.examples.join(', ')}`;zoneSelect.append(o);}
  months.forEach((key,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=monthLabel(key);monthSelect.append(o);});
  legend.innerHTML='<span>Best: lighter roads</span><span>Busy: allow extra time</span><span>Very heavy: avoid if flexible</span>';

  function dayCode(dateKey){return['sun','mon','tue','wed','thu','fri','sat'][weekday(dateKey)];}
  function typicalMinutes(dateKey,windowId,zoneId){
    const city=historical.windows?.[windowId]?.[dayCode(dateKey)];
    const factor=historical.zoneTravelTimeFactors?.[zoneId]??1;
    return Number((Number(city)*factor).toFixed(0));
  }
  function trafficBand(minutes){
    if(minutes<=30)return{label:'Light',className:'lighter',advice:'Usually a good time to travel'};
    if(minutes<=35)return{label:'Moderate',className:'lighter',advice:'Generally manageable'};
    if(minutes<=40)return{label:'Busy',className:'same',advice:'Allow some extra time'};
    if(minutes<=45)return{label:'Heavy',className:'heavier',advice:'Expect slow traffic'};
    return{label:'Very heavy',className:'heavier',advice:'Avoid this window if you can'};
  }

  function holidayLabel(h){
    if(!h)return'';
    if(h.governmentStatus==='general')return `Public holiday: ${h.name}`;
    if(h.schoolImpact==='partial-confirmed')return `Some schools closed: ${h.name}`;
    return `Restricted holiday: ${h.name}`;
  }

  function specialEffect(dateKey,windowId,zoneId){
    const texts=[];
    let direction='normal';
    let strength=0;
    const h=holidayByDate.get(dateKey);
    if(h?.governmentStatus==='general'){
      direction='lighter';strength=2;
      texts.push(`${h.name} is a statewide public holiday, so many normal office, school and government trips will not happen.`);
    }else if(h?.schoolImpact==='partial-confirmed'){
      if(['early-am','am-peak','late-am'].includes(windowId)){direction='lighter';strength=1;}
      texts.push(`${h.name} is not a citywide holiday, but some Bengaluru schools are closed. School-run traffic should be lower while many offices remain open.`);
    }else if(h){
      texts.push(`${h.name} is a restricted holiday. We are not assuming Bengaluru-wide traffic will fall without evidence of broader closures.`);
    }

    const day=weekday(dateKey);
    const tomorrow=holidayByDate.get(addDaysKey(dateKey,1));
    if(day===4&&tomorrow&&weekday(tomorrow.date)===5&&['pm-build','pm-peak'].includes(windowId)&&tomorrow.longWeekendPotential!=='low'){
      direction='heavier';strength=Math.max(strength,1);
      texts.push('A Friday holiday can shift holiday departures into Thursday evening, especially on roads leaving Bengaluru.');
    }

    const fridayKey=addDaysKey(dateKey,day===6?-1:day===0?-2:day===1?-3:0);
    const fridayHoliday=(day===6||day===0||day===1)?holidayByDate.get(fridayKey):null;
    const weekend=fridayHoliday&&fridayHoliday.longWeekendPotential!=='low';
    if(weekend&&day===6){
      direction='lighter';strength=Math.max(strength,1);
      texts.push('This follows a Friday holiday, so some residents may still be out of the city and Saturday traffic can be lighter than usual.');
    }
    if(weekend&&day===0){
      if(['pm-build','pm-peak','late-event'].includes(windowId)){
        direction='heavier';strength=2;
        texts.push('Long-weekend return traffic typically builds on Sunday evening. Bengaluru Traffic Police has reported roughly 10–20% higher congestion after 6 PM on such return days.');
      }else{
        direction='lighter';strength=Math.max(strength,1);
        texts.push('Many long-weekend travellers may still be away during the daytime, so roads can be quieter than a normal Sunday.');
      }
    }
    if(weekend&&day===1&&['early-am','am-peak'].includes(windowId)){
      direction='heavier';strength=Math.max(strength,1);
      texts.push('Normal Monday office and school traffic resumes while some travellers may still be returning, so the morning can be busier than a normal Monday.');
    }

    const weather=weatherByKey.get(`${dateKey}|${windowId}`);
    if(weather?.zones?.includes(zoneId)&&Number(weather.delta||0)>0){
      direction='heavier';strength=Math.max(strength,1);
      const rainProb=Number(weather.maxPrecipitationProbability??0);
      texts.push(`Rain is likely${rainProb?` (${rainProb}% chance)`:''}, which can slow traffic further.`);
    }
    if(!texts.length)texts.push('No major known holiday, long-weekend, weather or disruption effect is changing the normal historical pattern yet.');
    return{direction,strength,text:texts.join(' ')};
  }

  function todayText(effect){
    if(effect.direction==='normal')return'No major change from the normal pattern';
    if(effect.direction==='lighter')return effect.strength>=2?'Likely much lighter than normal':'Likely somewhat lighter than normal';
    return effect.strength>=2?'Likely much heavier than normal':'Likely somewhat heavier than normal';
  }

  function forecast(dateKey,windowId,zoneId){
    const typical=typicalMinutes(dateKey,windowId,zoneId);
    const band=trafficBand(typical);
    const effect=specialEffect(dateKey,windowId,zoneId);
    return{typical,band,effect};
  }

  function bestAndWorst(items){
    const sorted=[...items].sort((a,b)=>a.forecast.typical-b.forecast.typical);
    return{best:sorted[0],worst:sorted[sorted.length-1]};
  }

  function render(){
    const zone=config.zones.find(z=>z.id===zoneSelect.value)??config.zones[0];
    if(!zone)throw new Error('No areas are configured.');
    const selectedMonth=months[Number(monthSelect.value)||0];
    const dates=dateKeys.filter(key=>monthKey(key)===selectedMonth);
    const visibleWindows=config.timeWindows.filter(w=>!w.conditional);
    if(!dates.length||!visibleWindows.length)throw new Error('No forecast dates or time windows are available.');
    summary.innerHTML=`<h2>${monthLabel(selectedMonth)} · ${zone.name}</h2><p><strong>Choose your travel time using the historical traffic level first.</strong> Then check whether a holiday, long weekend, rain or disruption is likely to make that time better or worse than normal.</p><p class="meta">Historical backbone: TomTom Bengaluru 2025 weekday/hour travel-time patterns. Broad area factors are estimates, not measured TomTom zone data.</p>`;

    calendar.innerHTML=dates.map(dateKey=>{
      const holiday=holidayByDate.get(dateKey);
      const items=visibleWindows.map(w=>({window:w,forecast:forecast(dateKey,w.id,zone.id)}));
      const {best,worst}=bestAndWorst(items);
      const windows=items.map(({window,forecast:f})=>`<div class="window simple-window"><div class="time">${window.label}</div><div><div class="plain-result ${f.band.className}">${f.band.label} · about ${f.typical} min per 10 km</div><div class="travel-advice">${f.band.advice}</div><div class="today-change ${f.effect.direction}"><strong>For this date:</strong> ${todayText(f.effect)}</div><div class="plain-why"><strong>Why:</strong> ${f.effect.text}</div></div></div>`).join('');
      return`<article class="day"><div class="day-head"><div><div class="date">${dayLabel(dateKey)}</div><div class="day-result lighter">Best window: ${best.window.label} · ~${best.forecast.typical} min/10 km</div><div class="day-worst">Most difficult: ${worst.window.label} · ~${worst.forecast.typical} min/10 km</div></div>${holiday?`<span class="holiday">${holidayLabel(holiday)}</span>`:''}</div><div class="windows">${windows}</div></article>`;
    }).join('');
  }

  function safeRender(){try{render();}catch(error){console.error(error);summary.innerHTML='<h2>Forecast temporarily unavailable</h2><p>Please refresh shortly.</p>';calendar.innerHTML=`<article class="day"><div class="windows"><p>${escapeHtml(error?.message??'Unknown rendering error')}</p></div></article>`;}}
  zoneSelect.addEventListener('change',safeRender);monthSelect.addEventListener('change',safeRender);safeRender();
}catch(error){console.error(error);summary.innerHTML='<h2>Forecast data could not be loaded</h2><p>Please refresh shortly.</p>';}

async function loadJson(url,fallback){try{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}`);return await response.json();}catch(error){if(fallback!==undefined)return fallback;throw error;}}
function buildDateKeys(startKey,endKey){const result=[];let cursor=parseKey(startKey);const end=parseKey(endKey);while(cursor<=end){result.push(formatKey(cursor));cursor.setUTCDate(cursor.getUTCDate()+1);}return result;}
function parseKey(key){const[y,m,d]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12));}
function formatKey(date){return`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;}
function addDaysKey(key,days){const date=parseKey(key);date.setUTCDate(date.getUTCDate()+days);return formatKey(date);}
function weekday(key){return parseKey(key).getUTCDay();}
function monthKey(key){return key.slice(0,7);}
function monthLabel(key){const[y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1,12)));}
function dayLabel(key){return new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(parseKey(key));}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}

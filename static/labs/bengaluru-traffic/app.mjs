const START_KEY='2026-08-21';
const END_KEY='2026-12-31';
const EMPTY_SIGNALS={generatedAt:null,weather:[],events:[],advisories:[],notes:[]};
const zoneSelect=document.querySelector('#zoneSelect');
const monthSelect=document.querySelector('#monthSelect');
const calendar=document.querySelector('#calendar');
const summary=document.querySelector('#summary');
const legend=document.querySelector('#legend');

const windowBase={'early-am':28,'am-peak':67,'late-am':52,'midday':47,'pm-build':56,'pm-peak':72,'late-event':40};
const zoneBias={'orr-east':8,'whitefield':6,'south-east':7,'north-airport':4,'central':5,'south':2,'west':3};

try{
  const [config,holidayData,liveSignals]=await Promise.all([
    loadJson('./data/config.json'),
    loadJson('./data/holidays-2026.json'),
    loadJson('./data/live-signals.json',EMPTY_SIGNALS)
  ]);
  const holidayByDate=new Map((holidayData.holidays??[]).map(h=>[h.date,h]));
  const weatherByKey=new Map((liveSignals.weather??[]).map(w=>[`${w.date}|${w.windowId}`,w]));
  const dateKeys=buildDateKeys(START_KEY,END_KEY);
  const months=[...new Set(dateKeys.map(monthKey))];

  for(const z of config.zones??[]){
    const o=document.createElement('option');o.value=z.id;o.textContent=`${z.name} — ${z.examples.join(', ')}`;zoneSelect.append(o);
  }
  months.forEach((key,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=monthLabel(key);monthSelect.append(o);});
  legend.innerHTML='<span>↓ Lighter than usual</span><span>≈ About usual</span><span>↑ Heavier than usual</span>';

  function clamp(n){return Math.max(0,Math.min(100,Math.round(n)));}
  function weekdayAdjust(day,windowId){if(day===0)return-22;if(day===6)return-14;if(day===5&&windowId==='pm-peak')return 8;if(day===1)return-2;return 0;}
  function normalScore(dateKey,windowId,zoneId){return clamp(windowBase[windowId]+(zoneBias[zoneId]??0)+weekdayAdjust(weekday(dateKey),windowId));}

  function trafficShadow(dateKey,windowId,zoneId){
    const holiday=holidayByDate.get(dateKey);
    const tomorrowHoliday=holidayByDate.get(addDaysKey(dateKey,1));
    const yesterdayHoliday=holidayByDate.get(addDaysKey(dateKey,-1));
    let delta=0;let explanation='';
    if(holiday){
      delta-=(windowId==='am-peak'||windowId==='pm-peak')?20:13;
      explanation=`${holiday.name} is a holiday, so routine school and office travel is expected to be lower.`;
    }
    if(tomorrowHoliday&&(windowId==='pm-build'||windowId==='pm-peak')){
      delta+=10;
      if(['west','north-airport','south-east'].includes(zoneId))delta+=5;
      explanation=`Tomorrow is ${tomorrowHoliday.name}. Some people may leave work early or start holiday travel, so evening traffic can be heavier.`;
    }
    if(yesterdayHoliday&&weekday(dateKey)===0&&['pm-build','pm-peak','late-event'].includes(windowId)){
      delta+=8;
      explanation='People returning after the holiday break may make evening traffic heavier.';
    }
    return{delta,explanation};
  }

  function liveAdjustment(dateKey,windowId,zoneId){
    const weather=weatherByKey.get(`${dateKey}|${windowId}`);
    if(!weather||!weather.zones?.includes(zoneId))return{delta:0,confidenceBoost:0,explanation:'',live:false};
    const rainProb=Number(weather.maxPrecipitationProbability??0);
    const rainMm=Number(weather.precipitationMm??0);
    return{
      delta:Number(weather.delta||0),
      confidenceBoost:Number(weather.confidenceBoost||0),
      explanation:Number(weather.delta||0)>0?`Rain is likely (${rainProb}% chance${rainMm?`, around ${rainMm} mm`:''}), which usually slows Bengaluru traffic.`:'Weather is not expected to add much traffic pressure.',
      live:true
    };
  }

  function forecast(dateKey,windowId,zoneId){
    const usual=normalScore(dateKey,windowId,zoneId);
    const shadow=trafficShadow(dateKey,windowId,zoneId);
    const live=liveAdjustment(dateKey,windowId,zoneId);
    const score=clamp(usual+shadow.delta+live.delta);
    const changePct=usual?Math.round(((score-usual)/usual)*100):0;
    const daysAhead=daysBetween(START_KEY,dateKey);
    const baseConfidence=daysAhead<=7?64:daysAhead<=30?55:46;
    const explanations=[];
    if(shadow.explanation)explanations.push(shadow.explanation);
    if(live.explanation)explanations.push(live.explanation);
    if(!explanations.length)explanations.push('No major known holiday or weather effect is changing the usual pattern for this time.');
    return{score,usual,changePct,confidence:clamp(baseConfidence+live.confidenceBoost),explanation:explanations.join(' '),live:live.live};
  }

  function comparisonText(changePct){
    const abs=Math.abs(changePct);
    if(abs<6)return 'About the usual traffic';
    if(changePct<0)return `About ${abs}% lighter than usual`;
    return `About ${abs}% heavier than usual`;
  }
  function comparisonClass(changePct){return Math.abs(changePct)<6?'same':changePct<0?'lighter':'heavier';}
  function dayHeadline(items){
    const avg=Math.round(items.reduce((s,x)=>s+x.forecast.changePct,0)/items.length);
    return comparisonText(avg);
  }

  function render(){
    const zone=config.zones.find(z=>z.id===zoneSelect.value)??config.zones[0];
    if(!zone)throw new Error('No zones are configured.');
    const selectedMonth=months[Number(monthSelect.value)||0];
    const dates=dateKeys.filter(key=>monthKey(key)===selectedMonth);
    const visibleWindows=config.timeWindows.filter(w=>!w.conditional);
    if(!dates.length||!visibleWindows.length)throw new Error('No forecast dates or time windows are available.');
    const allForecasts=dates.flatMap(dateKey=>visibleWindows.map(w=>forecast(dateKey,w.id,zone.id)));
    const avgChange=Math.round(allForecasts.reduce((s,f)=>s+f.changePct,0)/allForecasts.length);
    const generated=liveSignals.generatedAt?new Date(liveSignals.generatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):null;
    summary.innerHTML=`<h2>${monthLabel(selectedMonth)} · ${zone.name}</h2><p><strong>${comparisonText(avgChange)}</strong> across the month based on what is currently known.</p><p class="meta">Long-range dates mainly use weekday and holiday patterns.${generated?` Weather/news last checked ${generated}.`:' Near-term weather has not refreshed yet.'}</p>`;

    calendar.innerHTML=dates.map(dateKey=>{
      const holiday=holidayByDate.get(dateKey);
      const dayForecasts=visibleWindows.map(w=>({window:w,forecast:forecast(dateKey,w.id,zone.id)}));
      const headline=dayHeadline(dayForecasts);
      const overallClass=comparisonClass(Math.round(dayForecasts.reduce((s,x)=>s+x.forecast.changePct,0)/dayForecasts.length));
      const windows=dayForecasts.map(({window,forecast:f})=>`<div class="window simple-window"><div class="time">${window.label}</div><div><div class="plain-result ${comparisonClass(f.changePct)}">${comparisonText(f.changePct)}</div><div class="plain-why"><strong>Why:</strong> ${f.explanation}</div></div></div>`).join('');
      const conf=Math.round(dayForecasts.reduce((sum,item)=>sum+item.forecast.confidence,0)/dayForecasts.length);
      return`<article class="day"><div class="day-head"><div><div class="date">${dayLabel(dateKey)}</div><div class="day-result ${overallClass}">${headline}</div></div>${holiday?`<span class="holiday">Holiday: ${holiday.name}</span>`:''}</div><div class="windows">${windows}</div><div class="confidence">How certain are we? ${confidenceWords(conf)}</div></article>`;
    }).join('');
  }

  function confidenceWords(conf){if(conf>=70)return'fairly confident';if(conf>=55)return'moderate confidence';return'early estimate — details can change closer to the date';}
  function safeRender(){try{render();}catch(error){console.error(error);summary.innerHTML='<h2>Forecast temporarily unavailable</h2><p>Please refresh shortly.</p>';calendar.innerHTML=`<article class="day"><div class="windows"><p>${escapeHtml(error?.message??'Unknown rendering error')}</p></div></article>`;}}
  zoneSelect.addEventListener('change',safeRender);monthSelect.addEventListener('change',safeRender);safeRender();
}catch(error){console.error(error);summary.innerHTML='<h2>Forecast data could not be loaded</h2><p>Please refresh shortly.</p>';}

async function loadJson(url,fallback){try{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}`);return await response.json();}catch(error){if(fallback!==undefined)return fallback;throw error;}}
function buildDateKeys(startKey,endKey){const result=[];let cursor=parseKey(startKey);const end=parseKey(endKey);while(cursor<=end){result.push(formatKey(cursor));cursor.setUTCDate(cursor.getUTCDate()+1);}return result;}
function parseKey(key){const[y,m,d]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12));}
function formatKey(date){return`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;}
function addDaysKey(key,days){const date=parseKey(key);date.setUTCDate(date.getUTCDate()+days);return formatKey(date);}
function weekday(key){return parseKey(key).getUTCDay();}
function daysBetween(a,b){return Math.round((parseKey(b)-parseKey(a))/86400000);}
function monthKey(key){return key.slice(0,7);}
function monthLabel(key){const[y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1,12)));}
function dayLabel(key){return new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(parseKey(key));}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}

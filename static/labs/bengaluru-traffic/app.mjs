const START_KEY='2026-08-21';
const END_KEY='2026-12-31';
const EMPTY_SIGNALS={generatedAt:null,weather:[],events:[],advisories:[],notes:[]};
const zoneSelect=document.querySelector('#zoneSelect');
const monthSelect=document.querySelector('#monthSelect');
const calendar=document.querySelector('#calendar');
const summary=document.querySelector('#summary');
const legend=document.querySelector('#legend');

try{
  const [config,holidayData,historical,zoneData,liveSignals]=await Promise.all([
    loadJson('./data/config.json'),loadJson('./data/holidays-2026.json'),loadJson('./data/historical-baseline-2025.json'),loadJson('./data/zone-profiles.json'),loadJson('./data/live-signals.json',EMPTY_SIGNALS)
  ]);
  const holidayByDate=new Map((holidayData.holidays??[]).map(h=>[h.date,h]));
  const weatherByKey=new Map((liveSignals.weather??[]).map(w=>[`${w.date}|${w.windowId}`,w]));
  const dateKeys=buildDateKeys(START_KEY,END_KEY);
  const months=[...new Set(dateKeys.map(monthKey))];
  for(const z of config.zones??[]){const o=document.createElement('option');o.value=z.id;o.textContent=`${z.name} — ${z.examples.join(', ')}`;zoneSelect.append(o);}
  months.forEach((key,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=monthLabel(key);monthSelect.append(o);});
  legend.innerHTML='<span>Light: good time to travel</span><span>Busy: allow extra time</span><span>Very heavy: avoid if flexible</span>';

  function dayCode(k){return['sun','mon','tue','wed','thu','fri','sat'][weekday(k)];}
  function typicalMinutes(k,w){return Math.round(Number(historical.windows?.[w]?.[dayCode(k)]));}
  function band(minutes){if(minutes<=30)return{label:'Light',cls:'lighter'};if(minutes<=35)return{label:'Moderate',cls:'lighter'};if(minutes<=40)return{label:'Busy',cls:'same'};if(minutes<=45)return{label:'Heavy',cls:'heavier'};return{label:'Very heavy',cls:'heavier'};}
  function holidayLabel(h){if(!h)return'';if(h.governmentStatus==='general')return`Public holiday: ${h.name}`;if(h.schoolImpact==='partial-confirmed')return`Some schools closed: ${h.name}`;return`Restricted holiday: ${h.name}`;}
  function zoneProfile(zoneId){return zoneData.profiles?.[zoneId]??null;}
  function zoneWindowNote(zoneId,windowId){const p=zoneProfile(zoneId);if(!p||!p.sensitiveWindows?.includes(windowId))return'';return `Area context: ${p.message}`;}

  function isWeekendHoliday(h){return h&&h.longWeekendPotential&&h.longWeekendPotential!=='low';}
  function precedingFridayHoliday(k){const d=weekday(k);if(![0,1,6].includes(d))return null;const shift=d===6?-1:d===0?-2:-3;return holidayByDate.get(addDaysKey(k,shift));}

  function adjustments(dateKey,windowId,zoneId){
    let factor=1;const reasons=[];
    const h=holidayByDate.get(dateKey);const tomorrow=holidayByDate.get(addDaysKey(dateKey,1));const day=weekday(dateKey);
    if(h?.governmentStatus==='general'){
      const pct=['am-peak','pm-peak'].includes(windowId)?-0.20:-0.14;factor*=1+pct;
      reasons.push(`${h.name} is a statewide public holiday, so many routine office, school and government trips will not happen.`);
    }else if(h?.schoolImpact==='partial-confirmed'){
      if(['early-am','am-peak','late-am'].includes(windowId))factor*=0.92;
      reasons.push(`${h.name} is not a citywide holiday, but some Bengaluru schools are closed. School-run traffic should be lower while many offices remain open.`);
    }else if(h){reasons.push(`${h.name} is a restricted holiday. We are not assuming Bengaluru-wide traffic will fall without broader closure evidence.`);}

    if(tomorrow?.governmentStatus==='general'&&['pm-build','pm-peak','late-event'].includes(windowId)){
      factor*=1.10;reasons.push(`Tomorrow is the public holiday ${tomorrow.name}. Evening traffic can build as people leave work early, shop or start intercity trips.`);
      if(isWeekendHoliday(tomorrow)&&['west','north-airport','south-east','orr-east'].includes(zoneId)){factor*=1.05;reasons.push('The effect can be stronger on roads leading out of Bengaluru because the holiday connects to a longer break.');}
    }

    const fri=precedingFridayHoliday(dateKey);const longWeekend=isWeekendHoliday(fri);
    if(longWeekend&&day===6){factor*=0.92;reasons.push('This follows a Friday holiday, so some residents may still be away and Saturday city traffic can be quieter.');}
    if(longWeekend&&day===0){
      if(['pm-build','pm-peak','late-event'].includes(windowId)){factor*=1.15;reasons.push('The long weekend is ending. Bengaluru Traffic Police has reported roughly 10–20% higher congestion after 6 PM on holiday-return Sundays.');}
      else{factor*=0.94;reasons.push('Many long-weekend travellers may still be away during the daytime, so roads can be quieter than a normal Sunday.');}
    }
    if(longWeekend&&day===1&&['early-am','am-peak'].includes(windowId)){factor*=1.07;reasons.push('Normal Monday office and school traffic resumes while some travellers may still be returning from the long weekend.');}

    const weather=weatherByKey.get(`${dateKey}|${windowId}`);
    if(weather?.zones?.includes(zoneId)&&Number(weather.delta||0)>0){factor*=1.08;const p=Number(weather.maxPrecipitationProbability??0);reasons.push(`Rain is likely${p?` (${p}% chance)`:''}, which can slow traffic further.`);}
    const local=zoneWindowNote(zoneId,windowId);if(local)reasons.push(local);
    if(!reasons.length)reasons.push('No major known holiday, long-weekend, weather or disruption effect is changing the normal historical pattern yet.');
    return{factor,reasons};
  }

  function forecast(dateKey,windowId,zoneId){const normal=typicalMinutes(dateKey,windowId);const a=adjustments(dateKey,windowId,zoneId);const expected=Math.max(10,Math.round(normal*a.factor));const delta=Math.round((a.factor-1)*100);return{normal,expected,delta,band:band(expected),reasons:a.reasons};}
  function changeText(f){if(Math.abs(f.delta)<5)return'Close to the normal pattern';if(f.delta<0)return'Likely lighter than normal';return'Likely heavier than normal';}
  function rangeText(f){if(Math.abs(f.delta)<5)return'';if(f.reasons.some(r=>r.includes('10–20%')))return'About 10–20% heavier than a normal Sunday evening';return changeText(f);}
  function bestWorst(items){const sorted=[...items].sort((a,b)=>a.forecast.expected-b.forecast.expected);return{best:sorted[0],worst:sorted.at(-1)};}

  function render(){
    const zone=config.zones.find(z=>z.id===zoneSelect.value)??config.zones[0];const selectedMonth=months[Number(monthSelect.value)||0];const dates=dateKeys.filter(k=>monthKey(k)===selectedMonth);const windows=config.timeWindows.filter(w=>!w.conditional);const profile=zoneProfile(zone.id);
    const profileText=profile?`<p class="zone-note"><strong>Area evidence:</strong> ${profile.message}${profile.junctions?.length?` Documented junctions: ${profile.junctions.join(', ')}.`:''}</p>`:'';
    summary.innerHTML=`<h2>${monthLabel(selectedMonth)} · ${zone.name}</h2><p><strong>The main label is the expected traffic for that date and time.</strong> The historical average is shown only as a reference underneath.</p>${profileText}<p class="meta">Historical backbone: TomTom Bengaluru 2025 citywide weekday/hour travel-time patterns. Zone context comes from public Bengaluru mobility-plan junction counts; it is used as a caution layer, not a made-up travel-time multiplier.</p>`;
    calendar.innerHTML=dates.map(dateKey=>{const h=holidayByDate.get(dateKey);const items=windows.map(w=>({window:w,forecast:forecast(dateKey,w.id,zone.id)}));const {best,worst}=bestWorst(items);const rows=items.map(({window,forecast:f})=>`<div class="window simple-window"><div class="time">${window.label}</div><div><div class="plain-result ${f.band.cls}">${f.band.label} · expected ~${f.expected} min per 10 km</div><div class="travel-advice">Normal ${dayName(dateKey)} at this time: ~${f.normal} min/10 km · ${rangeText(f)||changeText(f)}</div><div class="plain-why"><strong>Why:</strong> ${f.reasons.join(' ')}</div></div></div>`).join('');return`<article class="day"><div class="day-head"><div><div class="date">${dayLabel(dateKey)}</div><div class="day-result lighter">Best expected window: ${best.window.label} · ~${best.forecast.expected} min/10 km</div><div class="day-worst">Hardest expected window: ${worst.window.label} · ~${worst.forecast.expected} min/10 km</div></div>${h?`<span class="holiday">${holidayLabel(h)}</span>`:''}</div><div class="windows">${rows}</div></article>`;}).join('');
  }
  function safeRender(){try{render();}catch(e){console.error(e);summary.innerHTML='<h2>Forecast temporarily unavailable</h2><p>Please refresh shortly.</p>';}}
  zoneSelect.addEventListener('change',safeRender);monthSelect.addEventListener('change',safeRender);safeRender();
}catch(e){console.error(e);summary.innerHTML='<h2>Forecast data could not be loaded</h2><p>Please refresh shortly.</p>';}

async function loadJson(url,fallback){try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url} returned HTTP ${r.status}`);return await r.json();}catch(e){if(fallback!==undefined)return fallback;throw e;}}
function buildDateKeys(a,b){const out=[];let d=parseKey(a),end=parseKey(b);while(d<=end){out.push(formatKey(d));d.setUTCDate(d.getUTCDate()+1);}return out;}
function parseKey(k){const[y,m,d]=k.split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12));}
function formatKey(d){return`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}
function addDaysKey(k,n){const d=parseKey(k);d.setUTCDate(d.getUTCDate()+n);return formatKey(d);}
function weekday(k){return parseKey(k).getUTCDay();}
function monthKey(k){return k.slice(0,7);}
function monthLabel(k){const[y,m]=k.split('-').map(Number);return new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1,12)));}
function dayLabel(k){return new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(parseKey(k));}
function dayName(k){return new Intl.DateTimeFormat('en-IN',{weekday:'long',timeZone:'UTC'}).format(parseKey(k));}

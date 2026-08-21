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
  legend.innerHTML='<span class="legend-light">Light</span><span class="legend-moderate">Moderate</span><span class="legend-busy">Busy</span><span class="legend-heavy">Heavy</span><span class="legend-rush">Area rush hour</span>';

  function dayCode(k){return['sun','mon','tue','wed','thu','fri','sat'][weekday(k)];}
  function typicalMinutes(k,w){return Math.round(Number(historical.windows?.[w]?.[dayCode(k)]));}
  function band(minutes){if(minutes<=30)return{label:'Light',cls:'traffic-light',level:1};if(minutes<=35)return{label:'Moderate',cls:'traffic-moderate',level:2};if(minutes<=40)return{label:'Busy',cls:'traffic-busy',level:3};if(minutes<=45)return{label:'Heavy',cls:'traffic-heavy',level:4};return{label:'Very heavy',cls:'traffic-severe',level:5};}
  function holidayLabel(h){if(!h)return'';if(h.governmentStatus==='general')return`Public holiday · ${h.name}`;if(h.schoolImpact==='partial-confirmed')return`Some schools closed · ${h.name}`;return`Restricted holiday · ${h.name}`;}
  function zoneProfile(zoneId){return zoneData.profiles?.[zoneId]??null;}
  function isLocalPeak(zoneId,windowId){return zoneProfile(zoneId)?.peakWindowIds?.includes(windowId)??false;}
  function zoneWindowNote(zoneId,windowId){const p=zoneProfile(zoneId);if(!p||!isLocalPeak(zoneId,windowId))return'';return `This is usually a rush-hour period around ${p.junctions?.slice(0,3).join(', ')||'this area'}.`;}
  function scaleHtml(f){return `<div class="traffic-scale" aria-label="Traffic level ${f.band.label}"><span class="scale-label">Traffic level</span><div class="scale-steps">${[1,2,3,4,5].map(n=>`<i class="scale-step ${n<=f.band.level?f.band.cls:''}"></i>`).join('')}</div><strong>${f.band.label}</strong></div>`;}

  function isWeekendHoliday(h){return h&&h.longWeekendPotential&&h.longWeekendPotential!=='low';}
  function precedingFridayHoliday(k){const d=weekday(k);if(![0,1,6].includes(d))return null;const shift=d===6?-1:d===0?-2:-3;return holidayByDate.get(addDaysKey(k,shift));}
  function schoolClosureFactor(w){if(w==='early-am')return.94;if(w==='am-peak')return.90;if(w==='late-am')return.96;if(w==='midday')return.98;if(w==='pm-build')return.94;return 1;}
  function schoolClosureReason(w,name){if(w==='early-am'||w==='am-peak')return`${name}: fewer school-drop trips, while offices mostly continue normally.`;if(w==='late-am'||w==='midday')return`${name}: slightly fewer school-related trips, but normal city activity continues.`;if(w==='pm-build')return`${name}: fewer school-pickup trips should ease some traffic.`;return`${name}: school closures alone should have little effect on the main office evening peak.`;}

  function adjustments(dateKey,windowId,zoneId){
    let factor=1;const reasons=[];
    const h=holidayByDate.get(dateKey),tomorrow=holidayByDate.get(addDaysKey(dateKey,1)),day=weekday(dateKey);
    if(h?.governmentStatus==='general'){factor*=1+(['am-peak','pm-peak'].includes(windowId)?-.20:-.14);reasons.push(`${h.name} is a statewide public holiday, reducing routine office, school and government trips.`);}
    else if(h?.schoolImpact==='partial-confirmed'){factor*=schoolClosureFactor(windowId);reasons.push(schoolClosureReason(windowId,h.name));}
    else if(h){reasons.push(`${h.name} is a restricted holiday, so no citywide traffic reduction is assumed.`);}

    if(tomorrow?.governmentStatus==='general'&&['pm-build','pm-peak','late-event'].includes(windowId)){
      factor*=1.10;reasons.push(`Tomorrow is ${tomorrow.name}; early departures, shopping and intercity trips can make the evening busier.`);
      if(isWeekendHoliday(tomorrow)&&['west','north-airport','south-east','orr-east'].includes(zoneId)){factor*=1.05;reasons.push('This can be stronger on roads leading out of Bengaluru.');}
    }

    const fri=precedingFridayHoliday(dateKey),longWeekend=isWeekendHoliday(fri);
    if(longWeekend&&day===6){factor*=.92;reasons.push('Some residents may still be away for the long weekend, easing city traffic.');}
    if(longWeekend&&day===0){if(['pm-build','pm-peak','late-event'].includes(windowId)){factor*=1.15;reasons.push('Long-weekend return traffic can make Sunday evening roughly 10–20% heavier.');}else{factor*=.94;reasons.push('Many long-weekend travellers may still be away during the daytime.');}}
    if(longWeekend&&day===1&&['early-am','am-peak'].includes(windowId)){factor*=1.07;reasons.push('Normal Monday commuting resumes while some travellers may still be returning.');}

    const weather=weatherByKey.get(`${dateKey}|${windowId}`);
    if(weather?.zones?.includes(zoneId)&&Number(weather.delta||0)>0){factor*=1.08;const p=Number(weather.maxPrecipitationProbability??0);reasons.push(`Rain is likely${p?` (${p}% chance)`:''}, which can slow traffic.`);}
    const local=zoneWindowNote(zoneId,windowId);if(local)reasons.push(local);
    if(!reasons.length)reasons.push('No major known factor is changing the normal pattern yet.');
    return{factor,reasons};
  }

  function forecast(dateKey,windowId,zoneId){const normal=typicalMinutes(dateKey,windowId),a=adjustments(dateKey,windowId,zoneId),expected=Math.max(10,Math.round(normal*a.factor)),delta=Math.round((a.factor-1)*100);return{normal,expected,delta,band:band(expected),reasons:a.reasons,localPeak:isLocalPeak(zoneId,windowId)};}
  function changeText(f){if(Math.abs(f.delta)<5)return'Near normal';if(f.delta<0)return`${Math.abs(f.delta)}% lighter than usual`;return`${f.delta}% heavier than usual`;}
  function changeClass(f){if(Math.abs(f.delta)<5)return'change-normal';return f.delta<0?'change-lighter':'change-heavier';}
  function bestWorst(items){const sorted=[...items].sort((a,b)=>a.forecast.expected-b.forecast.expected);return{best:sorted[0],worst:sorted.at(-1)};}

  function render(){
    const zone=config.zones.find(z=>z.id===zoneSelect.value)??config.zones[0],selectedMonth=months[Number(monthSelect.value)||0],dates=dateKeys.filter(k=>monthKey(k)===selectedMonth),windows=config.timeWindows.filter(w=>!w.conditional),profile=zoneProfile(zone.id);
    const rush=profile?.localPeaks?.length?`<div class="summary-pill rush-pill"><span>Area rush hours</span><strong>${profile.localPeaks.join(' · ')}</strong></div>`:`<div class="summary-pill"><span>Area timing</span><strong>Bengaluru-wide pattern</strong></div>`;
    summary.innerHTML=`<div class="summary-top"><div><p class="summary-kicker">${zone.name}</p><h2>${monthLabel(selectedMonth)}</h2></div>${rush}</div><p class="summary-copy">The <strong>traffic level</strong> shows how busy the roads are expected to be. The percentage separately tells you how this date compares with a normal ${dayName(dates[0]) || 'day'} at that time.</p>`;

    calendar.innerHTML=dates.map(dateKey=>{
      const h=holidayByDate.get(dateKey),items=windows.map(w=>({window:w,forecast:forecast(dateKey,w.id,zone.id)})),{best,worst}=bestWorst(items);
      const rows=items.map(({window,forecast:f})=>`<div class="traffic-row ${f.localPeak?'rush-row':''}"><div class="row-top"><div class="row-time">${window.label}${f.localPeak?'<span class="rush-badge">Area rush hour</span>':''}</div></div>${scaleHtml(f)}<div class="row-metrics"><strong>Expected: ~${f.expected} min / 10 km</strong><span class="change-chip ${changeClass(f)}">${changeText(f)}</span></div><div class="normal-ref">Usual ${dayName(dateKey)} at this time: ~${f.normal} min / 10 km</div><div class="why-text"><strong>Why:</strong> ${f.reasons.join(' ')}</div></div>`).join('');
      return`<article class="day"><div class="day-head"><div><div class="date">${dayLabel(dateKey)}</div>${h?`<div class="holiday">${holidayLabel(h)}</div>`:''}</div><div class="day-picks"><div class="pick best-pick"><span>Best</span><strong>${best.window.label}</strong><small>~${best.forecast.expected} min</small></div><div class="pick worst-pick"><span>Hardest</span><strong>${worst.window.label}</strong><small>~${worst.forecast.expected} min</small></div></div></div><div class="windows">${rows}</div></article>`;
    }).join('');
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

const START_KEY='2026-08-21';
const END_KEY='2026-12-31';
const EMPTY_SIGNALS={generatedAt:null,weather:[],events:[],advisories:[],notes:[]};
const zoneSelect=document.querySelector('#zoneSelect');
const monthSelect=document.querySelector('#monthSelect');
const calendar=document.querySelector('#calendar');
const summary=document.querySelector('#summary');
const legend=document.querySelector('#legend');

try{
  const [config,holidayData,historical,zoneData,eventData,liveSignals]=await Promise.all([
    loadJson('./data/config.json'),loadJson('./data/holidays-2026.json'),loadJson('./data/historical-baseline-2025.json'),loadJson('./data/zone-profiles.json'),loadJson('./data/event-profiles.json',{profiles:[]}),loadJson('./data/live-signals.json',EMPTY_SIGNALS)
  ]);
  const holidayByDate=new Map((holidayData.holidays??[]).map(h=>[h.date,h]));
  const weatherByKey=new Map((liveSignals.weather??[]).map(w=>[`${w.date}|${w.windowId}`,w]));
  const dateKeys=buildDateKeys(START_KEY,END_KEY);
  const months=[...new Set(dateKeys.map(monthKey))];
  const todayKey=indiaTodayKey();

  for(const z of config.zones??[]){const o=document.createElement('option');o.value=z.id;o.textContent=`${z.name} — ${z.examples.join(', ')}`;zoneSelect.append(o);}
  months.forEach((key,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=monthLabel(key);monthSelect.append(o);});
  const currentMonthIndex=months.indexOf(monthKey(todayKey));if(currentMonthIndex>=0)monthSelect.value=String(currentMonthIndex);
  legend.innerHTML='<span class="legend-light">Light</span><span class="legend-moderate">Moderate</span><span class="legend-busy">Busy</span><span class="legend-heavy">Heavy</span><span class="legend-rush">Area rush hour</span>';

  function dayCode(k){return['sun','mon','tue','wed','thu','fri','sat'][weekday(k)];}
  function typicalMinutes(k,w){return Math.round(Number(historical.windows?.[w]?.[dayCode(k)]));}
  function band(minutes){if(minutes<=30)return{label:'Light',cls:'traffic-light',level:1};if(minutes<=35)return{label:'Moderate',cls:'traffic-moderate',level:2};if(minutes<=40)return{label:'Busy',cls:'traffic-busy',level:3};if(minutes<=45)return{label:'Heavy',cls:'traffic-heavy',level:4};return{label:'Very heavy',cls:'traffic-severe',level:5};}
  function holidayLabel(h){if(!h)return'';if(h.governmentStatus==='general')return`Public holiday · ${h.name}`;if(h.schoolImpact==='partial-confirmed')return`Some schools closed · ${h.name}`;return`Restricted holiday · ${h.name}`;}
  function zoneProfile(zoneId){return zoneData.profiles?.[zoneId]??null;}
  function isLocalPeak(zoneId,windowId){return zoneProfile(zoneId)?.peakWindowIds?.includes(windowId)??false;}
  function zoneWindowNote(zoneId,windowId){const p=zoneProfile(zoneId);if(!p||!isLocalPeak(zoneId,windowId))return'';return `This is usually a rush-hour period around ${p.junctions?.slice(0,3).join(', ')||'this area'}.`;}
  function scaleHtml(f){return `<div class="traffic-scale" aria-label="Traffic level ${f.band.label}"><span class="scale-label">Traffic level</span><div class="scale-steps">${[1,2,3,4,5].map(n=>`<i class="scale-step ${n<=f.band.level?f.band.cls:''}"></i>`).join('')}</div><strong>${f.band.label}</strong></div>`;}
  function eventProfile(name){if(!name)return null;return (eventData.profiles??[]).find(p=>(p.match??[]).some(m=>name.toLowerCase().includes(String(m).toLowerCase())))??null;}
  function positiveFactor(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
  function eventDayFactor(h,windowId){const p=eventProfile(h?.name);const factor=positiveFactor(p?.dayFactors?.[windowId]);return factor?{profile:p,factor}:null;}
  function eventPreDayFactor(h,windowId){const p=eventProfile(h?.name);const factor=positiveFactor(p?.preDayFactors?.[windowId]);return factor?{profile:p,factor}:null;}
  function eventZoneFactor(p,kind,zoneId,windowId){const map=kind==='pre'?p?.zonePreDayFactors:p?.zoneDayFactors;return positiveFactor(map?.[zoneId]?.[windowId]);}
  function confidenceText(p){return p?.confidence?` Evidence confidence: ${String(p.confidence).replace('-', ' ')}.`:'';}

  function isWeekendHoliday(h){return h&&h.longWeekendPotential&&h.longWeekendPotential!=='low';}
  function strongLongWeekendAnchor(h,key){if(!h)return false;const wd=weekday(key),p=eventProfile(h.name),strongEvent=['observed-strong','general-long-weekend'].includes(p?.profileType);return [1,2,4,5].includes(wd)&&(isWeekendHoliday(h)||h.governmentStatus==='general'||strongEvent);}
  function longWeekendGeometry(anchorKey){const wd=weekday(anchorKey);if(wd===5)return{outbound:-1,awayStart:0,awayEnd:2,returnDay:2,rebound:3};if(wd===1)return{outbound:-3,awayStart:-2,awayEnd:0,returnDay:0,rebound:1};if(wd===4)return{outbound:-1,awayStart:0,awayEnd:3,returnDay:3,rebound:4};if(wd===2)return{outbound:-4,awayStart:-3,awayEnd:0,returnDay:0,rebound:1};return null;}
  function longWeekendContext(dateKey){
    for(let shift=-4;shift<=4;shift++){
      const anchorKey=addDaysKey(dateKey,shift),h=holidayByDate.get(anchorKey);if(!strongLongWeekendAnchor(h,anchorKey))continue;
      const g=longWeekendGeometry(anchorKey);if(!g)continue;
      const rel=dayDiff(anchorKey,dateKey);
      if(rel===g.outbound)return{role:'outbound',holiday:h,anchorKey};
      if(rel===g.returnDay)return{role:'return',holiday:h,anchorKey};
      if(rel>=g.awayStart&&rel<=g.awayEnd)return{role:'away',holiday:h,anchorKey};
      if(rel===g.rebound)return{role:'rebound',holiday:h,anchorKey};
    }
    return null;
  }
  function schoolClosureFactor(w){if(w==='early-am')return.94;if(w==='am-peak')return.90;if(w==='late-am')return.96;if(w==='midday')return.98;if(w==='pm-build')return.94;return 1;}
  function schoolClosureReason(w,name){if(w==='early-am'||w==='am-peak')return`${name}: fewer school-drop trips, while offices mostly continue normally.`;if(w==='late-am'||w==='midday')return`${name}: slightly fewer school-related trips, but normal city activity continues.`;if(w==='pm-build')return`${name}: fewer school-pickup trips should ease some traffic.`;return`${name}: school closures alone should have little effect on the main office evening peak.`;}

  function adjustments(dateKey,windowId,zoneId){
    let factor=1;const reasons=[];
    const h=holidayByDate.get(dateKey),tomorrow=holidayByDate.get(addDaysKey(dateKey,1));
    const eventToday=eventDayFactor(h,windowId);
    if(eventToday){factor*=eventToday.factor;reasons.push(`${h.name}: ${eventToday.profile.reason}${confidenceText(eventToday.profile)}`);const localFactor=eventZoneFactor(eventToday.profile,'day',zoneId,windowId);if(localFactor&&Math.abs(localFactor-1)>=.02){factor*=localFactor;reasons.push('This selected area has a documented event hotspot, so its local pattern differs from the citywide festival pattern.');}}
    else if(h?.governmentStatus==='general'){factor*=1+(['am-peak','pm-peak'].includes(windowId)?-.20:-.14);reasons.push(`${h.name} is a statewide public holiday, reducing routine office, school and government trips.`);}
    else if(h?.schoolImpact==='partial-confirmed'){factor*=schoolClosureFactor(windowId);reasons.push(schoolClosureReason(windowId,h.name));}
    else if(h){reasons.push(`${h.name} is a restricted holiday and no strong Bengaluru-specific traffic history is available, so no broad reduction is assumed.`);}

    const preEvent=eventPreDayFactor(tomorrow,windowId);
    if(preEvent){factor*=preEvent.factor;reasons.push(`Tomorrow is ${tomorrow.name}; historical Bengaluru evidence shows a pre-event shopping/outbound effect at this time.`);const localPreFactor=eventZoneFactor(preEvent.profile,'pre',zoneId,windowId);if(localPreFactor&&Math.abs(localPreFactor-1)>=.02){factor*=localPreFactor;reasons.push('The pre-event effect is stronger in this area because of known market/outbound activity.');}}

    const lw=longWeekendContext(dateKey);
    if(lw?.role==='outbound'&&!preEvent&&['pm-build','pm-peak','late-event'].includes(windowId)){factor*=1.10;reasons.push(`${lw.holiday.name} creates a long-weekend pattern; historical Bengaluru evidence shows heavier outbound traffic before the break.`);if(['west','north-airport','south-east','orr-east'].includes(zoneId)){factor*=1.05;reasons.push('This can be stronger on roads leading out of Bengaluru.');}}
    if(lw?.role==='away'&&!h){const wd=weekday(dateKey),awayFactor=wd===6?.80:wd===0?.85:.82;factor*=awayFactor;reasons.push(`This date sits inside the ${lw.holiday.name} long-weekend away period. Historical Bengaluru patterns show materially lighter inner-city traffic while many residents are out of town or staying home.`);}
    if(lw?.role==='return'){
      if(['pm-build','pm-peak','late-event'].includes(windowId)){factor*=1.15;reasons.push(`${lw.holiday.name} long-weekend return traffic is expected to build as travellers re-enter Bengaluru.`);}
      else if(!h){factor*=.85;reasons.push(`Many ${lw.holiday.name} long-weekend travellers are still away during the daytime, keeping city traffic lighter than usual.`);}
    }
    if(lw?.role==='rebound'&&['early-am','am-peak'].includes(windowId)){factor*=1.07;reasons.push(`The ${lw.holiday.name} long weekend has ended; normal commuting resumes while some travellers may still be returning.`);}

    const weather=weatherByKey.get(`${dateKey}|${windowId}`);
    if(weather?.zones?.includes(zoneId)&&Number(weather.delta||0)>0){const weatherDelta=Math.min(20,Math.max(0,Number(weather.delta||0)));factor*=1+weatherDelta/100;const p=Number(weather.maxPrecipitationProbability??0);reasons.push(`Weather adds about ${weatherDelta}% slowdown risk${p?` (${p}% rain chance)`:''}.`);}
    const local=zoneWindowNote(zoneId,windowId);if(local)reasons.push(local);
    if(!reasons.length)reasons.push('No major known factor is changing the normal pattern yet.');
    return{factor,reasons};
  }

  function forecast(dateKey,windowId,zoneId){const normal=typicalMinutes(dateKey,windowId),a=adjustments(dateKey,windowId,zoneId),expected=Math.max(10,Math.round(normal*a.factor)),delta=Math.round((a.factor-1)*100);return{normal,expected,delta,band:band(expected),reasons:a.reasons,localPeak:isLocalPeak(zoneId,windowId)};}
  function changeText(f){if(Math.abs(f.delta)<5)return'Near normal';return f.delta<0?`${Math.abs(f.delta)}% lighter than usual`:`${f.delta}% heavier than usual`;}
  function changeClass(f){if(Math.abs(f.delta)<5)return'change-normal';return f.delta<0?'change-lighter':'change-heavier';}
  function bestWorst(items){const sorted=[...items].sort((a,b)=>a.forecast.expected-b.forecast.expected);return{best:sorted[0],worst:sorted.at(-1)};}

  function dayCard(dateKey,zone,windows){
    const h=holidayByDate.get(dateKey),items=windows.map(w=>({window:w,forecast:forecast(dateKey,w.id,zone.id)})),{best,worst}=bestWorst(items),rel=dayDiff(todayKey,dateKey),isToday=rel===0,isTomorrow=rel===1,isNear=rel>=0&&rel<=3;
    const rows=items.map(({window,forecast:f})=>`<div class="traffic-row ${f.localPeak?'rush-row':''}"><div class="row-top"><div class="row-time">${window.label}${f.localPeak?'<span class="rush-badge">Area rush hour</span>':''}</div></div>${scaleHtml(f)}<div class="row-metrics"><strong>Expected: ~${f.expected} min / 10 km</strong><span class="change-chip ${changeClass(f)}">${changeText(f)}</span></div><div class="normal-ref">Usual ${dayName(dateKey)} at this time: ~${f.normal} min / 10 km</div><div class="why-text"><strong>Why:</strong> ${f.reasons.join(' ')}</div></div>`).join('');
    const marker=isToday?'<span class="date-marker today-marker">Today</span>':isTomorrow?'<span class="date-marker tomorrow-marker">Tomorrow</span>':'';
    return`<details class="day ${isToday?'today-card':''} ${isTomorrow?'tomorrow-card':''}" ${isNear?'open':''}><summary class="day-head"><div><div class="date">${marker}${dayLabel(dateKey)}</div>${h?`<div class="holiday">${holidayLabel(h)}</div>`:''}</div><div class="day-picks"><div class="pick best-pick"><span>Best</span><strong>${best.window.label}</strong><small>~${best.forecast.expected} min</small></div><div class="pick worst-pick"><span>Hardest</span><strong>${worst.window.label}</strong><small>~${worst.forecast.expected} min</small></div></div></summary><div class="windows">${rows}</div></details>`;
  }

  function render(){
    const zone=config.zones.find(z=>z.id===zoneSelect.value)??config.zones[0],selectedMonth=months[Number(monthSelect.value)||0],dates=dateKeys.filter(k=>monthKey(k)===selectedMonth),windows=config.timeWindows.filter(w=>!w.conditional),profile=zoneProfile(zone.id);
    const rush=profile?.localPeaks?.length?`<div class="summary-pill rush-pill"><span>Area rush hours</span><strong>${profile.localPeaks.join(' · ')}</strong></div>`:`<div class="summary-pill"><span>Area timing</span><strong>Bengaluru-wide pattern</strong></div>`;
    summary.innerHTML=`<div class="summary-top"><div><p class="summary-kicker">${zone.name}</p><h2>${monthLabel(selectedMonth)}</h2></div>${rush}</div><p class="summary-copy"><strong>Today and the next three days stay expanded.</strong> Later forecasts and past dates are collapsed until you select them. Festival history, long-weekend carry-over and documented local hotspots are applied automatically.</p>`;
    const immediate=dates.filter(k=>{const r=dayDiff(todayKey,k);return r>=0&&r<=3;});
    const future=dates.filter(k=>dayDiff(todayKey,k)>3);
    const past=dates.filter(k=>dayDiff(todayKey,k)<0).reverse();
    const chunks=[];
    if(immediate.length)chunks.push('<div class="calendar-group">Now & next 3 days</div>',...immediate.map(k=>dayCard(k,zone,windows)));
    if(future.length)chunks.push('<div class="calendar-group">Later — select a day to expand</div>',...future.map(k=>dayCard(k,zone,windows)));
    if(past.length)chunks.push('<div class="calendar-group past-group">Earlier days</div>',...past.map(k=>dayCard(k,zone,windows)));
    if(!chunks.length)chunks.push(...dates.map(k=>dayCard(k,zone,windows)));
    calendar.innerHTML=chunks.join('');
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
function dayDiff(a,b){return Math.round((parseKey(b)-parseKey(a))/86400000);}
function indiaTodayKey(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`;}
function monthLabel(k){const[y,m]=k.split('-').map(Number);return new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1,12)));}
function dayLabel(k){return new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(parseKey(k));}
function dayName(k){return new Intl.DateTimeFormat('en-IN',{weekday:'long',timeZone:'UTC'}).format(parseKey(k));}

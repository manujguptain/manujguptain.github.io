const START = new Date('2026-08-21T00:00:00+05:30');
const END = new Date('2026-12-31T00:00:00+05:30');

const [config, holidayData, liveSignals] = await Promise.all([
  fetch('./data/config.json').then(r => r.json()),
  fetch('./data/holidays-2026.json').then(r => r.json()),
  fetch('./data/live-signals.json').then(r => r.ok ? r.json() : ({weather:[],events:[],advisories:[],notes:['Live signals unavailable']})).catch(()=>({weather:[],events:[],advisories:[],notes:['Live signals unavailable']}))
]);

const holidayByDate = new Map(holidayData.holidays.map(h => [h.date, h]));
const weatherByKey = new Map((liveSignals.weather ?? []).map(w => [`${w.date}|${w.windowId}`, w]));
const zoneSelect = document.querySelector('#zoneSelect');
const monthSelect = document.querySelector('#monthSelect');
const calendar = document.querySelector('#calendar');
const summary = document.querySelector('#summary');
const legend = document.querySelector('#legend');

for (const z of config.zones) {
  const o = document.createElement('option'); o.value = z.id; o.textContent = `${z.name} — ${z.examples.join(', ')}`; zoneSelect.append(o);
}

const months = [...new Set([...dateRange()].map(d => d.toLocaleString('en-IN',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'})))];
months.forEach((m,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=m;monthSelect.append(o)});
legend.innerHTML = config.riskScale.map(r => `<span>${r.label}: ${r.min}–${r.max}</span>`).join('');
zoneSelect.addEventListener('change', render);
monthSelect.addEventListener('change', render);
render();

function* dateRange(){ for(let d=new Date(START);d<=END;d.setDate(d.getDate()+1)) yield new Date(d); }
function iso(d){ return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(d); }
function riskLabel(score){ return config.riskScale.find(r => score >= r.min && score <= r.max)?.label ?? 'Unknown'; }
function clamp(n){ return Math.max(0,Math.min(100,Math.round(n))); }

const windowBase = {'early-am':28,'am-peak':67,'late-am':52,'midday':47,'pm-build':56,'pm-peak':72,'late-event':40};
const zoneBias = {'orr-east':8,'whitefield':6,'south-east':7,'north-airport':4,'central':5,'south':2,'west':3};

function weekdayAdjust(day, windowId){
  if(day===0) return -22;
  if(day===6) return -14;
  if(day===5 && windowId==='pm-peak') return 8;
  if(day===1) return -2;
  return 0;
}

function trafficShadow(d, windowId, zoneId){
  const holiday=holidayByDate.get(iso(d));
  const prev=new Date(d); prev.setDate(prev.getDate()-1);
  const next=new Date(d); next.setDate(next.getDate()+1);
  const tomorrowHoliday=holidayByDate.get(iso(next));
  const yesterdayHoliday=holidayByDate.get(iso(prev));
  let delta=0; const reasons=[];
  if(holiday){ delta -= (windowId==='am-peak'||windowId==='pm-peak') ? 20 : 13; reasons.push(`${holiday.name}: lower routine commute`); }
  if(tomorrowHoliday && (windowId==='pm-build'||windowId==='pm-peak')){
    delta += 10; reasons.push(`pre-holiday travel before ${tomorrowHoliday.name}`);
    if(zoneId==='west'||zoneId==='north-airport'||zoneId==='south-east') delta += 5;
  }
  if(yesterdayHoliday && d.getDay()===0 && (windowId==='pm-build'||windowId==='pm-peak'||windowId==='late-event')){
    delta += 8; reasons.push('return traffic after holiday break');
  }
  return {delta,reasons};
}

function liveAdjustment(d, windowId, zoneId){
  const weather = weatherByKey.get(`${iso(d)}|${windowId}`);
  if (!weather || !weather.zones?.includes(zoneId)) return {delta:0,confidenceBoost:0,reasons:[],live:false};
  return {delta:Number(weather.delta||0),confidenceBoost:Number(weather.confidenceBoost||0),reasons:[weather.reason],live:true};
}

function forecast(d, windowId, zoneId){
  let score = windowBase[windowId] + (zoneBias[zoneId] ?? 0) + weekdayAdjust(d.getDay(),windowId);
  const shadow = trafficShadow(d,windowId,zoneId); score += shadow.delta;
  const live = liveAdjustment(d,windowId,zoneId); score += live.delta;
  const reasons=[];
  if(d.getDay()===0) reasons.push('Sunday baseline');
  else if(d.getDay()===6) reasons.push('Saturday baseline');
  else reasons.push('weekday baseline');
  if(windowId==='am-peak') reasons.push('morning commute peak');
  if(windowId==='pm-peak') reasons.push('evening commute peak');
  reasons.push(...shadow.reasons,...live.reasons);
  const daysAhead=Math.max(0,Math.round((d-START)/86400000));
  const baseConfidence = daysAhead <= 7 ? 64 : daysAhead <= 30 ? 55 : 46;
  return {score:clamp(score),confidence:clamp(baseConfidence+live.confidenceBoost),reasons,live:live.live};
}

function render(){
  const zone=config.zones.find(z=>z.id===zoneSelect.value) ?? config.zones[0];
  const monthName=months[Number(monthSelect.value)||0];
  const dates=[...dateRange()].filter(d=>d.toLocaleString('en-IN',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'})===monthName);
  const visibleWindows=config.timeWindows.filter(w=>!w.conditional);
  const all=dates.flatMap(d=>visibleWindows.map(w=>forecast(d,w.id,zone.id).score));
  const avg=Math.round(all.reduce((a,b)=>a+b,0)/all.length);
  const liveCount=dates.flatMap(d=>visibleWindows.map(w=>forecast(d,w.id,zone.id))).filter(f=>f.live).length;
  const generated=liveSignals.generatedAt ? new Date(liveSignals.generatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}) : 'not yet refreshed';
  const candidateCount=(liveSignals.advisories??[]).length;

  summary.innerHTML=`<h2>${monthName} · ${zone.name}</h2><p>Monthly risk: <strong>${riskLabel(avg)} (${avg}/100)</strong>. ${liveCount ? `${liveCount} time windows include weather intelligence.` : 'Long-range dates currently use calendar intelligence.'}</p><p class="meta">Live data refresh: ${generated} · ${candidateCount} disruption headlines held for verification (not scored).</p>`;

  calendar.innerHTML=dates.map(d=>{
    const key=iso(d); const holiday=holidayByDate.get(key);
    const windows=visibleWindows.map(w=>{
      const f=forecast(d,w.id,zone.id);
      return `<div class="window"><span class="time">${w.label}</span><span class="bar"><i style="width:${f.score}%"></i></span><span class="risk">${riskLabel(f.score)} ${f.score}${f.live?' · live':''}</span><span class="reason">${f.reasons.slice(0,4).join(' · ')}</span></div>`;
    }).join('');
    const forecasts=visibleWindows.map(w=>forecast(d,w.id,zone.id));
    const conf=Math.round(forecasts.reduce((n,f)=>n+f.confidence,0)/forecasts.length);
    const hasLive=forecasts.some(f=>f.live);
    return `<article class="day"><div class="day-head"><div><div class="date">${d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Kolkata'})}</div></div>${holiday?`<span class="holiday">${holiday.name}</span>`:''}</div><div class="windows">${windows}</div><div class="confidence">Confidence ${conf}% · ${hasLive?'calendar + near-term weather':'calendar baseline'}</div></article>`;
  }).join('');
}

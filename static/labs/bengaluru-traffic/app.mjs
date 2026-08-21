const START_KEY = '2026-08-21';
const END_KEY = '2026-12-31';
const EMPTY_SIGNALS = { generatedAt: null, weather: [], events: [], advisories: [], notes: [] };

const zoneSelect = document.querySelector('#zoneSelect');
const monthSelect = document.querySelector('#monthSelect');
const calendar = document.querySelector('#calendar');
const summary = document.querySelector('#summary');
const legend = document.querySelector('#legend');

try {
  const [config, holidayData, liveSignals] = await Promise.all([
    loadJson('./data/config.json'),
    loadJson('./data/holidays-2026.json'),
    loadJson('./data/live-signals.json', EMPTY_SIGNALS)
  ]);

  const holidayByDate = new Map((holidayData.holidays ?? []).map(h => [h.date, h]));
  const weatherByKey = new Map((liveSignals.weather ?? []).map(w => [`${w.date}|${w.windowId}`, w]));
  const dateKeys = buildDateKeys(START_KEY, END_KEY);
  const months = [...new Set(dateKeys.map(monthKey))];

  for (const z of config.zones ?? []) {
    const o = document.createElement('option');
    o.value = z.id;
    o.textContent = `${z.name} — ${z.examples.join(', ')}`;
    zoneSelect.append(o);
  }

  months.forEach((key, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = monthLabel(key);
    monthSelect.append(o);
  });

  legend.innerHTML = (config.riskScale ?? []).map(r => `<span>${r.label}: ${r.min}–${r.max}</span>`).join('');
  zoneSelect.addEventListener('change', safeRender);
  monthSelect.addEventListener('change', safeRender);
  safeRender();

  function safeRender() {
    try {
      render();
    } catch (error) {
      console.error('Bengaluru traffic calendar render failed', error);
      summary.innerHTML = '<h2>Forecast temporarily unavailable</h2><p>The calendar data loaded, but the forecast renderer hit an error. Please refresh shortly.</p>';
      calendar.innerHTML = `<article class="day"><div class="day-head"><div class="date">Render diagnostic</div></div><div class="windows"><p class="reason">${escapeHtml(error?.message ?? 'Unknown rendering error')}</p></div></article>`;
    }
  }

  function riskLabel(score) {
    return config.riskScale.find(r => score >= r.min && score <= r.max)?.label ?? 'Unknown';
  }

  function clamp(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  const windowBase = {
    'early-am': 28,
    'am-peak': 67,
    'late-am': 52,
    'midday': 47,
    'pm-build': 56,
    'pm-peak': 72,
    'late-event': 40
  };

  const zoneBias = {
    'orr-east': 8,
    'whitefield': 6,
    'south-east': 7,
    'north-airport': 4,
    'central': 5,
    'south': 2,
    'west': 3
  };

  function weekdayAdjust(day, windowId) {
    if (day === 0) return -22;
    if (day === 6) return -14;
    if (day === 5 && windowId === 'pm-peak') return 8;
    if (day === 1) return -2;
    return 0;
  }

  function trafficShadow(dateKey, windowId, zoneId) {
    const holiday = holidayByDate.get(dateKey);
    const tomorrowHoliday = holidayByDate.get(addDaysKey(dateKey, 1));
    const yesterdayHoliday = holidayByDate.get(addDaysKey(dateKey, -1));
    let delta = 0;
    const reasons = [];

    if (holiday) {
      delta -= (windowId === 'am-peak' || windowId === 'pm-peak') ? 20 : 13;
      reasons.push(`${holiday.name}: lower routine commute`);
    }

    if (tomorrowHoliday && (windowId === 'pm-build' || windowId === 'pm-peak')) {
      delta += 10;
      reasons.push(`pre-holiday travel before ${tomorrowHoliday.name}`);
      if (zoneId === 'west' || zoneId === 'north-airport' || zoneId === 'south-east') delta += 5;
    }

    if (yesterdayHoliday && weekday(dateKey) === 0 && (windowId === 'pm-build' || windowId === 'pm-peak' || windowId === 'late-event')) {
      delta += 8;
      reasons.push('return traffic after holiday break');
    }

    return { delta, reasons };
  }

  function liveAdjustment(dateKey, windowId, zoneId) {
    const weather = weatherByKey.get(`${dateKey}|${windowId}`);
    if (!weather || !weather.zones?.includes(zoneId)) {
      return { delta: 0, confidenceBoost: 0, reasons: [], live: false };
    }
    return {
      delta: Number(weather.delta || 0),
      confidenceBoost: Number(weather.confidenceBoost || 0),
      reasons: [weather.reason],
      live: true
    };
  }

  function forecast(dateKey, windowId, zoneId) {
    const day = weekday(dateKey);
    let score = windowBase[windowId] + (zoneBias[zoneId] ?? 0) + weekdayAdjust(day, windowId);
    const shadow = trafficShadow(dateKey, windowId, zoneId);
    score += shadow.delta;
    const live = liveAdjustment(dateKey, windowId, zoneId);
    score += live.delta;

    const reasons = [];
    if (day === 0) reasons.push('Sunday baseline');
    else if (day === 6) reasons.push('Saturday baseline');
    else reasons.push('weekday baseline');
    if (windowId === 'am-peak') reasons.push('morning commute peak');
    if (windowId === 'pm-peak') reasons.push('evening commute peak');
    reasons.push(...shadow.reasons, ...live.reasons);

    const daysAhead = daysBetween(START_KEY, dateKey);
    const baseConfidence = daysAhead <= 7 ? 64 : daysAhead <= 30 ? 55 : 46;
    return {
      score: clamp(score),
      confidence: clamp(baseConfidence + live.confidenceBoost),
      reasons,
      live: live.live
    };
  }

  function render() {
    const zone = config.zones.find(z => z.id === zoneSelect.value) ?? config.zones[0];
    if (!zone) throw new Error('No zones are configured.');

    const selectedMonth = months[Number(monthSelect.value) || 0];
    const dates = dateKeys.filter(key => monthKey(key) === selectedMonth);
    const visibleWindows = config.timeWindows.filter(w => !w.conditional);
    if (!dates.length || !visibleWindows.length) throw new Error('No forecast dates or time windows are available.');

    const forecasts = dates.flatMap(dateKey => visibleWindows.map(w => forecast(dateKey, w.id, zone.id)));
    const avg = Math.round(forecasts.reduce((sum, item) => sum + item.score, 0) / forecasts.length);
    const liveCount = forecasts.filter(item => item.live).length;
    const generated = liveSignals.generatedAt
      ? new Date(liveSignals.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : 'not yet refreshed';
    const candidateCount = (liveSignals.advisories ?? []).length;

    summary.innerHTML = `<h2>${monthLabel(selectedMonth)} · ${zone.name}</h2><p>Monthly risk: <strong>${riskLabel(avg)} (${avg}/100)</strong>. ${liveCount ? `${liveCount} time windows include weather intelligence.` : 'Long-range dates currently use calendar intelligence.'}</p><p class="meta">Live data refresh: ${generated} · ${candidateCount} disruption headlines held for verification (not scored).</p>`;

    calendar.innerHTML = dates.map(dateKey => {
      const holiday = holidayByDate.get(dateKey);
      const dayForecasts = visibleWindows.map(w => ({ window: w, forecast: forecast(dateKey, w.id, zone.id) }));
      const windows = dayForecasts.map(({ window, forecast: f }) =>
        `<div class="window"><span class="time">${window.label}</span><span class="bar"><i style="width:${f.score}%"></i></span><span class="risk">${riskLabel(f.score)} ${f.score}${f.live ? ' · live' : ''}</span><span class="reason">${f.reasons.slice(0, 4).join(' · ')}</span></div>`
      ).join('');
      const conf = Math.round(dayForecasts.reduce((sum, item) => sum + item.forecast.confidence, 0) / dayForecasts.length);
      const hasLive = dayForecasts.some(item => item.forecast.live);
      return `<article class="day"><div class="day-head"><div><div class="date">${dayLabel(dateKey)}</div></div>${holiday ? `<span class="holiday">${holiday.name}</span>` : ''}</div><div class="windows">${windows}</div><div class="confidence">Confidence ${conf}% · ${hasLive ? 'calendar + near-term weather' : 'calendar baseline'}</div></article>`;
    }).join('');
  }
} catch (error) {
  console.error('Bengaluru traffic calendar startup failed', error);
  summary.innerHTML = '<h2>Forecast data could not be loaded</h2><p>The page shell is available, but one or more forecast data files failed to load.</p>';
  calendar.innerHTML = `<article class="day"><div class="day-head"><div class="date">Load diagnostic</div></div><div class="windows"><p class="reason">${escapeHtml(error?.message ?? 'Unknown startup error')}</p></div></article>`;
}

async function loadJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

function buildDateKeys(startKey, endKey) {
  const result = [];
  let cursor = parseKey(startKey);
  const end = parseKey(endKey);
  while (cursor <= end) {
    result.push(formatKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function parseKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function addDaysKey(key, days) {
  const date = parseKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return formatKey(date);
}

function weekday(key) {
  return parseKey(key).getUTCDay();
}

function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 86400000);
}

function monthKey(key) {
  return key.slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

function dayLabel(key) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(parseKey(key));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

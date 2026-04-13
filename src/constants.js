export const C = {
  bg:     '#17140d', s1: '#201c13', s2: '#292418', s3: '#343020',
  text:   '#f0e4c8', muted: '#9c8b6c', dim: '#5a5040', amber: '#df7618',
  gold:   '#c8a44a', sage: '#7aaa7c', warn: '#e8b840', bc: '#68a8ca',
  border: '#38301e', border2: '#272012',
};

export const WMO_CODES = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Fog', 48:'Icy fog',
  51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain',
  71:'Light snow', 73:'Snow', 75:'Heavy snow',
  77:'Snow grains',
  80:'Light showers', 81:'Showers', 82:'Heavy showers',
  85:'Light snow showers', 86:'Snow showers',
  95:'Thunderstorm', 96:'Thunderstorm w/ hail', 99:'Thunderstorm w/ heavy hail',
};

export function fmtTime(isoOrDate) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Vancouver' });
}

export const TAG_META = {
  gf:          { label: 'GF',    bg: '#c8a44a22', color: '#c8a44a' },
  pescatarian: { label: 'fish',  bg: '#68a8ca22', color: '#68a8ca' },
  vegetarian:  { label: 'veg',   bg: '#7aaa7c22', color: '#7aaa7c' },
  vegan:       { label: 'vegan', bg: '#7aaa7c22', color: '#7aaa7c' },
};

export const DURATION_LABELS = [
  { max: 3,  label: 'Evening fire' },
  { max: 5,  label: 'Into the night' },
  { max: 7,  label: 'Late night' },
  { max: 11, label: 'Overnight' },
  { max: 13, label: 'Near-dawn' },
  { max: 16, label: 'Afternoon to sunrise ★', star: true },
  { max: 23, label: 'Full overnight' },
  { max: 29, label: 'Day & a night' },
  { max: 36, label: 'Weekend retreat' },
];

export const THRESHOLDS = [
  { h: 4,  label: 'layering' },
  { h: 6,  label: 'late night' },
  { h: 8,  label: 'overnight' },
  { h: 12, label: 'pre-dawn' },
  { h: 14, label: '★ sunrise', star: true },
  { h: 15, label: 'morning after' },
  { h: 24, label: 'full day' },
];

export function getDurationLabel(h) {
  return DURATION_LABELS.find(d => h <= d.max) || DURATION_LABELS[DURATION_LABELS.length - 1];
}

export const DIETARY = [
  { tag: 'celiac', color: C.gold, label: 'Celiac (mild, 20 ppm)',
    detail: 'GF products recommended. Strict cross-contamination protocols not required. Shared skewers fine. Wheat beer off-limits.' },
  { tag: 'pescatarian', color: C.bc, label: 'Pescatarian',
    detail: 'No land meat. Dedicated fish/seafood skewers needed. Colour-code skewers.' },
];

// Only these kinds surface in the checklist. 'do' = on-situ advice, stays in tree only.
export const CHECKLIST_KINDS = new Set(['check', 'get']);

/**
 * Returns "HH:MM" alarm time 30 minutes before civil twilight.
 * Borrows from the hour correctly — e.g. 06:10 → 05:40, not 06:00.
 */
export function sunriseAlarm(civilTwilightHHMM) {
  const [hh, mm] = civilTwilightHHMM.split(':').map(Number);
  let h = hh, m = mm - 30;
  if (m < 0) { m += 60; h -= 1; }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Returns the relevant wind speed km/h for fire-safety decisions.
 * Prefers live current weather; falls back to forecast wind max for future trips.
 * Used by both LiveStatusBar (resolveLive) and ChecklistView (autoCheckLive)
 * so the two surfaces always agree.
 */
export function resolveWindKmh(live) {
  return live?.weather?.windKmh ?? live?.forecast?.windMax?.[0] ?? null;
}

// Context-derived deep links — falls back to node.url if no context available.
// urlCtx: optional semantic hint on tree nodes for non-liveKey nodes that still benefit from site context.
export function resolveUrl(node, site, live) {
  const lk = node.liveKey;
  const uc = node.urlCtx;

  // Weather-based links → Environment Canada location page
  if (lk && ['forecast', 'rainRisk', 'windFire', 'overnightTemp', 'weatherAlert'].includes(lk)) {
    if (site?.coords) {
      const { lat, lng } = site.coords;
      return `https://weather.gc.ca/en/location?coords=${lat},${lng}`;
    }
  }

  // Park status / park page → site's bcparks URL
  if (lk === 'parkStatus' || uc === 'parkPage') {
    return site?.bcparks || node.url || null;
  }

  // Booking → live reservation deep link > site static > fallback
  if (uc === 'booking') {
    return live?.reservationUrl || site?.discoverCamping || site?.parkUrl || node.url || null;
  }

  // Tides → Tides Canada station page
  if (lk === 'tides') {
    const code = live?.tides?.stationCode;
    if (code) {
      // Station codes are numeric strings like "07795"; strip leading zeros for the URL
      const numCode = parseInt(code, 10);
      if (!isNaN(numCode)) return `https://tides.gc.ca/en/stations/${numCode}`;
    }
    return node.url || null;
  }

  // Road conditions → DriveBC event map centered on site
  if (lk === 'roadConditions') {
    if (site?.coords) {
      const { lat, lng } = site.coords;
      return `https://www.drivebc.ca/#${lat},${lng},12`;
    }
  }

  // Air quality → AQHI station page for nearest location
  if (lk === 'airQuality') {
    if (site?.coords) {
      const { lat, lng } = site.coords;
      return `https://weather.gc.ca/airquality/pages/bcaq-001_e.html#map=${Math.round(lat)},${Math.round(lng)},8`;
    }
  }

  // Fire bans → BCWS fire bans page
  if (lk === 'fireBans') {
    return 'https://www2.gov.bc.ca/gov/content/safety/wildfire-status/fire-bans-and-restrictions';
  }

  // Nearby fires → BCWS fire map
  if (lk === 'nearbyFires') {
    return 'https://wildfiresituation.nrs.gov.bc.ca/map';
  }

  return node.url || null;
}

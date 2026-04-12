import { useState, useEffect, createContext, useContext, useCallback } from "react";

const DurationCtx = createContext(14);
const LiveDataCtx = createContext(null);
const SiteCtx     = createContext(null);

function useLiveData(lat, lng, bcparksSlug, open511Road) {
  const [data, setData] = useState({
    weather: null, forecast: null, sunrise: null, sunset: null,
    fireBans: null, activeFires: null, aqhi: null,
    parkStatus: null, parkAdvisories: null, reservationUrl: null,
    roadEvents: null,
    loading: true, error: null, lastUpdated: null,
  });

  const fetchAll = useCallback(async () => {
    const hasCoords = lat != null && lng != null;
    const coordLat  = hasCoords ? lat  : 49.2827;
    const coordLng  = hasCoords ? lng  : -123.1207;

    const queries = [
      // Open-Meteo: current + 3-day hourly forecast
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coordLat}&longitude=${coordLng}` +
        `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
        `&hourly=precipitation_probability&timezone=America%2FVancouver&forecast_days=3`
      ).then(r => r.json()),

      // Sunrise-Sunset API
      fetch(
        `https://api.sunrise-sunset.org/json?lat=${coordLat}&lng=${coordLng}&formatted=0`
      ).then(r => r.json()),

      // BCWS ArcGIS — active bans (layer 14), point-in-polygon bbox
      fetch(
        `https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/BCWS_ActiveFires_PublicView/FeatureServer/14/query` +
        `?where=1%3D1&geometry=${coordLng-0.5}%2C${coordLat-0.5}%2C${coordLng+0.5}%2C${coordLat+0.5}` +
        `&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=FIRE_STATUS_CODE%2CFIRE_ZONE_CODE&f=json`
      ).then(r => r.json()),

      // BCWS ArcGIS — active fires nearby (layer 0)
      fetch(
        `https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/BCWS_ActiveFires_PublicView/FeatureServer/0/query` +
        `?where=1%3D1&geometry=${coordLng-1}%2C${coordLat-1}%2C${coordLng+1}%2C${coordLat+1}` +
        `&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=FIRE_NAME%2CFIRE_STATUS&returnCountOnly=true&f=json`
      ).then(r => r.json()),

      // MSC GeoMet AQHI — nearest station
      fetch(
        `https://geomet.weather.gc.ca/api/collections/aqhi-observations-realtime/items` +
        `?bbox=${coordLng-1}%2C${coordLat-1}%2C${coordLng+1}%2C${coordLat+1}&limit=1&f=json`
      ).then(r => r.json()),

      // BC Parks GraphQL (only if slug provided)
      bcparksSlug
        ? fetch('https://bcparks.api.gov.bc.ca/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `{
              protectedArea(slug: "${bcparksSlug}") {
                hasCampfireBan parkContact status
                advisories { title description urgency }
                reservations { reservationUrl }
              }
            }` }),
          }).then(r => r.json())
        : Promise.resolve(null),

      // DriveBC Open511 (only if road name provided)
      open511Road
        ? fetch(`/api/drivebc/events?road_name=${encodeURIComponent(open511Road)}&status=ACTIVE&format=json`)
            .then(r => r.json())
        : Promise.resolve(null),
    ];

    const results = await Promise.allSettled(queries);
    const [meteoRes, astroRes, bansRes, firesRes, aqhiRes, parksRes, drivebcRes] = results;

    const meteo   = meteoRes.status   === 'fulfilled' ? meteoRes.value   : null;
    const astro   = astroRes.status   === 'fulfilled' ? astroRes.value   : null;
    const bans    = bansRes.status    === 'fulfilled' ? bansRes.value    : null;
    const fires   = firesRes.status   === 'fulfilled' ? firesRes.value   : null;
    const aqhi    = aqhiRes.status    === 'fulfilled' ? aqhiRes.value    : null;
    const parks   = parksRes.status   === 'fulfilled' ? parksRes.value   : null;
    const drivebc = drivebcRes.status === 'fulfilled' ? drivebcRes.value : null;

    const cur = meteo?.current;
    const daily = meteo?.daily;

    // Sunrise / sunset from api.sunrise-sunset.org (UTC ISO strings)
    const sunriseISO = astro?.results?.civil_twilight_begin;
    const sunsetISO  = astro?.results?.sunset;

    // AQHI value
    const aqhiVal = aqhi?.features?.[0]?.properties?.aqhi ?? null;

    // Park data
    const park = parks?.data?.protectedArea || null;

    // Road events
    const roadEvents = drivebc?.events || null;

    setData({
      weather: cur ? {
        tempC:        Math.round(cur.temperature_2m),
        feelsC:       Math.round(cur.apparent_temperature),
        code:         cur.weather_code,
        windKmh:      Math.round(cur.wind_speed_10m),
        windDir:      cur.wind_direction_10m,
        humidity:     cur.relative_humidity_2m,
      } : null,
      forecast: daily ? {
        codes:    daily.weather_code,
        maxTemps: daily.temperature_2m_max,
        minTemps: daily.temperature_2m_min,
        popMax:   daily.precipitation_probability_max,
        windMax:  daily.wind_speed_10m_max,
        times:    daily.time,
      } : null,
      sunrise: sunriseISO ? fmtTime(sunriseISO) : null,
      sunset:  sunsetISO  ? fmtTime(sunsetISO)  : null,
      fireBans: bans?.features ?? null,
      activeFires: fires?.count ?? null,
      aqhi: aqhiVal,
      parkStatus:     park?.status ?? null,
      parkAdvisories: park?.advisories ?? null,
      hasCampfireBan: park?.hasCampfireBan ?? null,
      reservationUrl: park?.reservations?.[0]?.reservationUrl ?? null,
      roadEvents: roadEvents,
      loading: false, error: null, lastUpdated: new Date(),
    });
  }, [lat, lng, bcparksSlug, open511Road]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return data;
}

function LiveStatusBar() {
  const live = useContext(LiveDataCtx);
  const { site } = useContext(SiteCtx) || {};

  if (!live || live.loading) return (
    <div style={{ padding: '8px 28px', background: C.s1, borderBottom: `1px solid ${C.border}`,
      fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>
      Loading live data…
    </div>
  );
  if (live.error) return null;

  const w     = live.weather;
  const bans  = live.fireBans;
  const hasBans = bans && bans.length > 0;

  const rowStyle = {
    display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
    fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
  };
  const sep = { borderLeft: `1px solid ${C.border}`, paddingLeft: 14 };

  return (
    <div style={{ background: C.s1, borderBottom: `1px solid ${C.border}`, padding: '8px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>

      {/* Row 1: weather · fire bans · AQHI · sunrise/sunset */}
      <div style={rowStyle}>
        {w && (
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: C.text, fontWeight: 500 }}>{w.tempC}°C</span>
            <span style={{ color: C.muted }}>feels {w.feelsC}°C</span>
            <span style={{ color: C.muted }}>{WMO_CODES[w.code] ?? `WMO ${w.code}`}</span>
            <span style={{ color: C.muted }}>wind {w.windKmh} km/h</span>
            <span style={{ color: C.muted }}>humidity {w.humidity}%</span>
          </div>
        )}

        <div style={sep}>
          {live.hasCampfireBan ? (
            <span style={{ color: C.warn, fontWeight: 600 }}>⚠ campfire ban in effect</span>
          ) : hasBans ? (
            <span style={{ color: C.warn, fontWeight: 600 }}>⚠ {bans.length} fire ban{bans.length !== 1 ? 's' : ''} nearby</span>
          ) : (
            <span style={{ color: C.sage }}>✓ No fire bans</span>
          )}
          {live.activeFires != null && live.activeFires > 0 && (
            <span style={{ color: C.warn, marginLeft: 10 }}>🔥 {live.activeFires} active fire{live.activeFires !== 1 ? 's' : ''} within 100 km</span>
          )}
        </div>

        {live.aqhi != null && (
          <div style={sep}>
            <span style={{ color: live.aqhi <= 3 ? C.sage : live.aqhi <= 6 ? C.gold : C.warn }}>
              AQHI {live.aqhi}
            </span>
          </div>
        )}

        {(live.sunrise || live.sunset) && (
          <div style={{ ...sep, display: 'flex', gap: 10 }}>
            {live.sunrise && <span style={{ color: C.amber }}>↑ {live.sunrise}</span>}
            {live.sunset  && <span style={{ color: C.dim }}>↓ {live.sunset}</span>}
          </div>
        )}

        {live.lastUpdated && (
          <span style={{ color: C.dim, marginLeft: 'auto', fontSize: 10 }}>
            {live.lastUpdated.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Row 2: park status + road events (only when site selected) */}
      {site && (live.parkStatus || live.parkAdvisories?.length || live.roadEvents?.length > 0) && (
        <div style={{ ...rowStyle, paddingTop: 4, borderTop: `1px solid ${C.border2}` }}>
          {live.parkStatus && (
            <span style={{ color: live.parkStatus === 'Open' ? C.sage : C.warn }}>
              {live.parkStatus === 'Open' ? '✓' : '⚠'} Park: {live.parkStatus}
            </span>
          )}
          {live.parkAdvisories?.map((a, i) => (
            <span key={i} style={{ color: a.urgency === 'High' ? C.warn : C.gold }}>
              ⚑ {a.title}
            </span>
          ))}
          {live.roadEvents?.length > 0 && (
            <span style={{ color: C.warn }}>
              ⚠ {live.roadEvents.length} road event{live.roadEvents.length !== 1 ? 's' : ''} on {site.open511Road}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const C = {
  bg:     '#17140d', s1: '#201c13', s2: '#292418', s3: '#343020',
  text:   '#f0e4c8', muted: '#9c8b6c', dim: '#5a5040', amber: '#df7618',
  gold:   '#c8a44a', sage: '#7aaa7c', warn: '#e8b840', bc: '#68a8ca',
  border: '#38301e', border2: '#272012',
};

const WMO_CODES = {
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

function fmtTime(isoOrDate) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Vancouver' });
}

const TAG_META = {
  gf:          { label: 'GF',    bg: '#c8a44a22', color: '#c8a44a' },
  pescatarian: { label: 'fish',  bg: '#68a8ca22', color: '#68a8ca' },
  vegetarian:  { label: 'veg',   bg: '#7aaa7c22', color: '#7aaa7c' },
  vegan:       { label: 'vegan', bg: '#7aaa7c22', color: '#7aaa7c' },
};

const DURATION_LABELS = [
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

const THRESHOLDS = [
  { h: 4,  label: 'layering' },
  { h: 6,  label: 'late night' },
  { h: 8,  label: 'overnight' },
  { h: 12, label: 'pre-dawn' },
  { h: 14, label: '★ sunrise', star: true },
  { h: 15, label: 'morning after' },
  { h: 24, label: 'full day' },
];

function getDurationLabel(h) {
  return DURATION_LABELS.find(d => h <= d.max) || DURATION_LABELS[DURATION_LABELS.length - 1];
}

const DIETARY = [
  { tag: 'celiac', color: C.gold, label: 'Celiac (mild, 20 ppm)',
    detail: 'GF products recommended. Strict cross-contamination protocols not required. Shared skewers fine. Wheat beer off-limits.' },
  { tag: 'pescatarian', color: C.bc, label: 'Pescatarian',
    detail: 'No land meat. Dedicated fish/seafood skewers needed. Colour-code skewers.' },
];

const DEPARTURE = {
  label: 'SFU Burnaby Campus',
  coords: { lat: 49.2786, lng: -122.9198 },
};

const SITES = [
  {
    id: 'porteau',
    name: 'Porteau Cove Provincial Park',
    short: 'Porteau Cove',
    coords: { lat: 49.5535, lng: -123.2362 },
    driveTimeMin: 50,
    highway: 'Hwy 99 (Sea-to-Sky)',
    driveBC: '99',
    open511Road: 'Highway 99',
    bcparks: 'https://bcparks.ca/porteau-cove-provincial-park/',
    bcparksSlug: 'porteau-cove-park',
    discoverCamping: 'https://camping.bcparks.ca/',
    fireAllowed: true,
    cell: 'good',
    notes: 'Oceanfront. West-facing — alpenglow on Howe Sound at sunrise. Pier is best vantage.',
  },
  {
    id: 'golden_ears',
    name: 'Golden Ears Provincial Park',
    short: 'Golden Ears',
    coords: { lat: 49.3497, lng: -122.4724 },
    driveTimeMin: 70,
    highway: 'Hwy 7 (Lougheed)',
    driveBC: '7',
    open511Road: 'Highway 7',
    bcparks: 'https://bcparks.ca/golden-ears-provincial-park/',
    bcparksSlug: 'golden-ears-park',
    discoverCamping: 'https://camping.bcparks.ca/',
    fireAllowed: true,
    cell: 'spotty',
    notes: 'Forested. Interior cell spotty. Walk to lakeshore for open sky.',
  },
  {
    id: 'alice_lake',
    name: 'Alice Lake Provincial Park',
    short: 'Alice Lake',
    coords: { lat: 49.7784, lng: -123.1277 },
    driveTimeMin: 65,
    highway: 'Hwy 99 (Sea-to-Sky)',
    driveBC: '99',
    open511Road: 'Highway 99',
    bcparks: 'https://bcparks.ca/alice-lake-provincial-park/',
    bcparksSlug: 'alice-lake-park',
    discoverCamping: 'https://camping.bcparks.ca/',
    fireAllowed: true,
    cell: 'moderate',
    notes: 'Quiet hours 10 PM (earlier than BC Parks standard).',
  },
  {
    id: 'rocky_point',
    name: 'Rocky Point Park',
    short: 'Rocky Point (Port Moody)',
    coords: { lat: 49.2837, lng: -122.8673 },
    driveTimeMin: 35,
    highway: 'Barnet Hwy',
    driveBC: null,
    open511Road: null,
    bcparks: null,
    bcparksSlug: null,
    discoverCamping: null,
    parkUrl: 'https://www.portmoody.ca/en/parks-recreation-culture/parks/rocky-point-park.aspx',
    fireAllowed: false,
    cell: 'good',
    notes: 'Municipal park. Best transit access. Day-use only — no overnight camping.',
  },
  {
    id: 'sasamat',
    name: 'White Pine Beach / Sasamat Lake',
    short: 'Sasamat Lake (Belcarra)',
    coords: { lat: 49.2995, lng: -122.8766 },
    driveTimeMin: 40,
    highway: 'Ioco Rd (Belcarra)',
    driveBC: null,
    open511Road: null,
    bcparks: null,
    bcparksSlug: null,
    discoverCamping: null,
    parkUrl: 'https://metrovancouver.org/parks-outdoors/parks/belcarra-regional-park',
    fireAllowed: false,
    cell: 'moderate',
    notes: 'Metro Vancouver Regional Park. Day-use only. Calm lake.',
  },
  {
    id: 'barnet',
    name: 'Barnet Marine Park',
    short: 'Barnet Marine (Burnaby)',
    coords: { lat: 49.2844, lng: -122.9363 },
    driveTimeMin: 25,
    highway: 'Barnet Hwy',
    driveBC: null,
    bcparks: null,
    discoverCamping: null,
    parkUrl: 'https://metrovancouver.org/parks-outdoors/parks/barnet-marine-park',
    fireAllowed: false,
    cell: 'good',
    notes: 'Closest option. Day-use only. No fire pits.',
  },
];

const NICE_TO_HAVES = [
  { label: 'Bluetooth speaker for music' },
  { label: 'Cards or games for around the fire' },
  { label: 'Thermoses for keeping coffee hot' },
  { label: 'Extra tarps for ground cover' },
  { label: 'Portable phone charger' },
  { label: 'String lights for camp ambiance' },
  { label: 'Folding camp chairs (2–3 minimum)' },
  { label: 'Lantern for camp area lighting' },
  { label: 'Star map app or printed constellation guide' },
  { label: 'Sketchbooks or journals for the slow hours' },
];

const TREE = [
  { id: 'preflight', label: 'Pre-Flight Checks', emoji: '✓', minHours: 0,
    desc: 'Must resolve before departure', children: [
    { label: 'Fire & Environment', children: [
      { label: 'BC fire ban status — bcwildfire.ca', note: 'Check day-of, not just day-before', type: 'bc', liveKey: 'fireBans', kind: 'check' },
      { label: 'Burn restrictions / air quality advisories', kind: 'check' },
    ]},
    { label: 'Site', children: [
      { label: 'Campsite reservation confirmed', note: 'DiscoverCamping.ca', kind: 'check' },
      { label: 'Park opening status', note: 'bcparks.ca', kind: 'check' },
      { label: 'Highway and road conditions', note: 'DriveBC.ca', kind: 'check' },
    ]},
    { label: 'Weather', children: [
      { label: '48-hour forecast', note: 'rain, wind, overnight low', liveKey: 'forecast', kind: 'check' },
      { label: 'Rain plan confirmed', note: 'Tarp rigged on arrival if >40% precip', liveKey: 'rainRisk', kind: 'check' },
    ]},
    { label: 'Gear', children: [
      { label: 'Headlamp batteries tested', kind: 'check' },
      { label: 'Phone & power banks fully charged', kind: 'check' },
      { label: 'Ice box pre-chilled', note: '1–2 hrs before loading food', kind: 'check' },
    ]},
    { label: 'Guests', children: [
      { label: 'Dietary confirmed', note: 'celiac 20ppm + pescatarian', dietary: ['celiac','pescatarian'], kind: 'check' },
      { label: 'Firewood purchase delegated', note: 'Buy near site — BC 10km rule', type: 'bc', kind: 'check' },
      { label: 'Designated driver / overnight plan confirmed', type: 'warn', kind: 'check' },
    ]},
    { label: 'Timing', children: [
      { label: 'Departure set for 3:00–4:00 PM arrival', kind: 'check' },
      { label: 'Sunrise alarm pre-set', note: '4:30 AM', kind: 'check' },
    ]},
  ]},
  { id: 'smores', label: "S'mores", emoji: '🍫', minHours: 0,
    desc: 'Root-level ritual — elevated above The Meal', children: [
    { label: 'Marshmallows', kind: 'get' },
    { label: 'Chocolate', note: 'Dark or milk', kind: 'get' },
    { label: 'Graham crackers', note: 'Carry GF grahams separately; standard GF label (20ppm) safe for celiac guest', dietary: ['celiac'], kind: 'get' },
    { label: 'Roasting sticks', dep: 'The Fire' },
  ]},
  { id: 'fire', label: 'The Fire', emoji: '🔥', minHours: 0,
    desc: 'Central dep — anchors Meal, Night, Sunrise, Music', children: [
    { label: 'BC Regulatory', type: 'bc', children: [
      { label: 'Fire ban status', note: 'Category 1 in designated rings. Bans activate <24hrs notice.', type: 'bc', dep: 'Pre-Flight → Fire & Env.', kind: 'do' },
      { label: 'Campfire permit', note: 'Provincial Parks: fee covers it. FLNRORD: free permit at bcwildfire.ca. Backcountry: always required.', type: 'bc', kind: 'check' },
      { label: 'Firewood transport rule (10 km)', note: 'BC Wildfire Act. Do not bring wood from Vancouver. Buy at or within 10km of site.', type: 'warn', kind: 'do' },
      { label: 'Fire ring rule', note: 'Designated metal ring only. No ground fires, no moved rocks.', kind: 'do' },
      { label: 'Extinguishing requirement', note: 'Cold to touch — drown, stir, check with bare hand.', kind: 'do' },
    ]},
    { label: 'Fuel', children: [
      { label: 'Firewood', note: '2–3 bundles min (14-hr arc). Hardwood preferred. Reserve 1 bundle for 4:30 AM rebuild.', kind: 'get' },
      { label: 'Kindling', note: 'Often missing from bundles — #1 reason fires fail. Buy fatwood near site.', type: 'warn', kind: 'get' },
      { label: 'Tinder', note: 'Firestarter cubes, WetFire, or newspaper. Pack in sealed zip-lock — April humidity 70–85%.', kind: 'get' },
    ]},
    { label: 'Ignition', children: [
      { label: 'Butane lighter (primary)', kind: 'get' },
      { label: 'Waterproof matches (backup)', note: 'Separate dry bag', kind: 'get' },
      { label: 'Fire starter cubes or fatwood', note: 'Bridges tinder to kindling in damp', kind: 'get' },
    ]},
    { label: 'Fire Structure Knowledge', type: 'know', children: [
      { label: 'Modified teepee for April damp', note: 'Tinder centre, kindling teepee, two logs A-frame. Elevate off ground on bark.' },
      { label: 'Light from windward side' },
      { label: 'Allow kindling 5–7 min before large wood' },
      { label: 'Transition to log cabin / parallel log for sustained coals' },
    ]},
    { label: 'Wind Management', children: [
      { label: 'April: 10–20 km/h; higher at Porteau Cove', kind: 'do' },
      { label: 'Body windbreak or tarp baffle during lighting', kind: 'do' },
      { label: 'Abandon attempt if sustained >30 km/h', type: 'warn', kind: 'do' },
    ]},
    { label: 'Damp Conditions Mitigation', children: [
      { label: 'Dry bark platform under tinder', kind: 'get' },
      { label: 'Clear standing water from ring before building', kind: 'do' },
      { label: 'Spare tinder in dry bag until needed', kind: 'get' },
    ]},
    { label: 'Tending Equipment', children: [
      { label: 'Fire poker (metal rod or 60cm+ stick)', kind: 'get' },
      { label: 'Work gloves (heat-resistant)', kind: 'get' },
      { label: 'Camp axe or hatchet (optional)', kind: 'get' },
      { label: 'Headlamp', dep: 'Shared Dep' },
    ]},
    { label: 'Safety Equipment', children: [
      { label: 'Water bucket or large pot', note: 'Min 8L. Fill on arrival.', type: 'warn', kind: 'get' },
      { label: 'Small folding shovel', kind: 'get' },
      { label: '1m clear radius around fire ring', kind: 'do' },
      { label: 'Identify nearest water source on arrival', kind: 'do' },
      { label: 'Brief group on extinguishing before first light', kind: 'do' },
    ]},
  ]},
  { id: 'meal', label: 'The Meal', emoji: '🍢', minHours: 0,
    desc: 'Depends on The Fire (heat) and Cold Chain (proteins)', children: [
    { label: 'Dinner', children: [
      { label: 'Skewers / roasting sticks', children: [
        { label: 'Sausages', dep: 'Cold Chain', dietary: ['pescatarian'], kind: 'get' },
        { label: 'Fish / shrimp', note: 'Shrimp, salmon chunks', dep: 'Cold Chain', kind: 'get' },
        { label: 'Halloumi', note: 'GF, vegetarian, grills directly on skewer', kind: 'get' },
        { label: 'Vegetables', note: 'Peppers, mushrooms, zucchini. GF + pescatarian-safe.', kind: 'get' },
      ]},
      { label: 'Pre-made chili or stew', note: 'Made at home, reheated in pot over fire.', dietary: ['celiac'], kind: 'get' },
      { label: 'Corn tortillas', note: 'GF. Universal base — wraps anything.', kind: 'get' },
    ]},
    { label: 'Sweets', children: [
      { label: 'Bananas', kind: 'get' },
      { label: 'Nutella', kind: 'get' },
      { label: 'Chocolate', dep: "S'mores (shared)" },
      { label: 'Marshmallows', dep: "S'mores (shared)" },
      { label: 'Corn tortillas', dep: 'The Meal → Dinner' },
      { label: 'Butter', dep: 'The Meal → Cooking Gear' },
      { label: 'Brown sugar', note: 'Optional — for grilled banana', kind: 'get' },
    ]},
    { label: 'Snacks', children: [
      { label: 'Early Evening (6–9 PM)', children: [
        { label: 'Cheese', kind: 'get' },
        { label: 'GF crackers', dietary: ['celiac'], kind: 'get' },
        { label: 'Fruit (apples, oranges)', kind: 'get' },
        { label: 'Hummus + cut vegetables', note: 'No cold chain required in April ambient temps', kind: 'get' },
      ]},
      { label: 'Late Night (10 PM–2 AM)', minHours: 6, children: [
        { label: 'Hot chocolate packets', dep: 'The Meal → Drinks' },
        { label: 'Spiced nuts', kind: 'get' },
        { label: 'Jerky', note: 'Check marinade labels for gluten', dietary: ['celiac'], kind: 'get' },
      ]},
      { label: 'Pre-Dawn (4:30 AM)', minHours: 12, children: [
        { label: 'Granola bars', note: 'Check labels', dietary: ['celiac'], kind: 'get' },
        { label: 'Dates or dried fruit', kind: 'get' },
        { label: 'Trail mix', kind: 'get' },
      ]},
    ]},
    { label: 'Drinks', children: [
      { label: 'Coffee (percolator or instant)', kind: 'get' },
      { label: 'Hot chocolate packets', kind: 'get' },
      { label: 'Beer, wine, or spirits', dietary: ['celiac'], kind: 'get' },
      { label: 'Water', note: '2L per person minimum', kind: 'get' },
    ]},
    { label: 'Morning Fuel', minHours: 12, children: [
      { label: 'Coffee / thermos', kind: 'get' },
      { label: 'Pastries or granola bars', dietary: ['celiac'], kind: 'get' },
    ]},
    { label: 'Cold Chain', type: 'dep', children: [
      { label: 'Ice box / passive cooler', note: 'April ambient temps help. Preferred over 12V fridge.' },
      { label: 'Ice + dry ice on top for longevity' },
      { label: 'Raw proteins in sealed containers', note: 'Bottom of cooler, coldest zone.', dietary: ['pescatarian'] },
    ]},
    { label: 'Cooking Gear', children: [
      { label: 'Medium pot', dep: 'The Fire', kind: 'get' },
      { label: 'Metal skewers', note: 'Colour-code one set for fish only', dietary: ['pescatarian'], kind: 'get' },
      { label: 'Cutting board and knife', kind: 'get' },
      { label: 'Plates, bowls, utensils (or disposable)', kind: 'get' },
      { label: 'Trash bags + dish soap', kind: 'get' },
    ]},
  ]},
  { id: 'night', label: 'The Night', emoji: '🌙', minHours: 8,
    desc: 'The 12–3 AM window. Car / tent / fire devotee.', children: [
    { label: 'Sleeping Gear', children: [
      { label: 'Sleeping bag rated 0–5°C per person', note: 'April overnight lows 5–7°C in Metro Vancouver', kind: 'get' },
      { label: 'Sleeping pad (R-2.0 min, R-3.0+ recommended)', note: 'R-values are additive — stack a cheap foam pad (R-1.2) under an inflatable (R-2.5) = R-3.7', type: 'know' },
      { label: 'Real pillow', note: 'Compressible camping pillow or your home pillow in a stuff sack. Bunched-up jackets = "never again."', kind: 'get' },
      { label: 'Earplugs (foam)', note: 'Campground noise, tent rustling, wildlife. $2 and transformative for beginners.', kind: 'get' },
      { label: 'Eye mask', note: 'April sunrise ~6:15 AM — tent fabric transmits all of it', kind: 'get' },
    ]},
    { label: 'Shelter', children: [
      { label: 'Car Camping', note: 'Warmest, driest. 1–2 car spots available (carpool).', children: [
        { label: 'Fold rear seats flat, remove headrests', note: 'Test the setup at home. Fill seat-to-cargo gaps with rolled towels.', kind: 'do' },
        { label: 'Self-inflating pad (2"+ thick) on folded seats', note: 'Simpler than car-specific air mattress. R-value 2.0+.', kind: 'get' },
        { label: 'Window covers (Reflectix or pop-up shades)', note: 'Privacy + insulation. Trace windows with newspaper, cut to shape.', kind: 'get' },
        { label: 'Crack windows 1–2" on opposite sides', note: 'Cross-ventilation for condensation. Each person exhales ~1L moisture/night.', type: 'know' },
        { label: 'Rain guards / wind deflectors', note: '~$30/set, stick-on. Allow cracked windows in rain. #1 car-sleep accessory.', kind: 'get' },
        { label: 'Park with head-end slightly uphill', note: 'Use phone level app — if >3° slope, add foam wedge under foot end.', type: 'know' },
        { label: 'NEVER run engine while sleeping', note: 'CO is colourless, odourless, lethal. Exhaust pools under vehicle and seeps through cracked windows.', type: 'warn', kind: 'do' },
      ]},
      { label: 'Tent', note: '2–4 person, double-wall with rain fly.', children: [
        { label: 'Footprint / groundsheet under tent', note: 'Must be slightly smaller than tent floor to avoid rain pooling between layers.', kind: 'get' },
        { label: 'Practice setup at home before the trip', note: '10-min YouTube video for your specific model. Fumbling by headlamp at 10pm = #1 "never again" trigger.', type: 'know' },
        { label: 'Pitch on high, flat ground', note: 'Cold air pools in depressions. Under tree canopy if possible — canopy radiates heat, reduces dew.', type: 'know' },
        { label: 'Stake rain fly taut with all guylines', note: 'Saggy fly = fly touches inner wall = condensation wicks through.', type: 'know' },
        { label: 'Orient door away from prevailing wind', note: 'Typically W/SW in Metro Vancouver April.', type: 'know' },
        { label: 'Open upper rain fly vents even if cold', note: 'Ventilation tradeoff is always worth it for condensation control.', type: 'know' },
        { label: 'Wet gear stays in the vestibule', note: 'Boots and rain shells — never inside the tent.', type: 'know' },
      ]},
    ]},
    { label: 'Layering (per person)', minHours: 4, children: [
      { label: 'Moisture-wicking base layer', kind: 'get' },
      { label: 'Fleece or insulated mid layer', kind: 'get' },
      { label: 'Waterproof rain shell', note: 'Non-negotiable', kind: 'get' },
      { label: 'Warm hat and gloves', kind: 'get' },
      { label: '2–3 pairs of socks', kind: 'get' },
      { label: 'Dedicated dry sleep socks', note: 'Not the ones worn during the day. Dry feet = warm body.', kind: 'get' },
      { label: 'Extra dry layer in ziplock', note: 'If clothes get damp from evening dew, having something completely dry at bedtime is a morale multiplier.', kind: 'get' },
    ]},
    { label: 'Communal Shelter', children: [
      { label: "Tarp (10×12' minimum)", kind: 'get' },
      { label: 'Rope or paracord for rigging', kind: 'get' },
    ]},
    { label: 'Fire Schedule', type: 'know', children: [
      { label: 'Evening burn: upside-down fire lay', note: 'Largest logs on bottom, kindling on top. Self-feeds downward ~4hrs without tending.', type: 'know', dep: 'The Fire' },
      { label: 'Budget 2–3 bundles for full evening (5–6 hrs)', dep: 'The Fire → Fuel' },
      { label: 'Quiet hours: extinguish fire completely', note: 'BC Parks rule. Drown-stir-drown-feel. If too hot to touch, too hot to leave.', type: 'warn' },
      { label: 'Morning re-light from scratch', note: 'Keep dry kindling + newspaper in sealed bag overnight. Do not attempt overnight maintenance.', dep: 'The Fire → Ignition' },
    ]},
    { label: 'Wildlife Protocol', type: 'warn', children: [
      { label: 'Black bears active in April', note: 'Males emerge March–April, hungry and food-motivated. Assume bears are active at any Metro Van campground.', type: 'warn', kind: 'do' },
      { label: 'Raccoons — the more likely nuisance', note: 'Bold at established campgrounds. Will open cooler latches and unzip tent vestibules.', kind: 'do' },
      { label: 'Food lockup: all food + scented items in locked vehicle', note: 'Includes toothpaste, sunscreen, deodorant. "Bare Campsite" rule: nothing out when sleeping.', type: 'bc', dep: 'The Meal → Cold Chain', kind: 'do' },
      { label: 'Do NOT hang food at frontcountry campgrounds', note: 'Counterintuitive but official BC Parks policy — hanging attracts wildlife to the campground.', type: 'bc', kind: 'do' },
      { label: 'Trash in bear-proof bins or locked vehicle', note: 'Never at the site overnight.', kind: 'do' },
    ]},
    { label: 'Comfort Kit (per person)', note: 'The gap between "never again" and "when\'s the next one."', children: [
      { label: 'Headlamp with red-light mode', note: 'One per person. Red mode preserves night vision. Clip to tent loop, not buried in bag.', dep: 'Shared Dep', kind: 'get' },
      { label: 'Camp chair', note: 'Standing around a fire for 6 hours is miserable. Borrow if needed — everyone needs a seat.', kind: 'get' },
      { label: 'Hot water bottle (Nalgene)', note: 'Fill with boiling water, wrap in sock, put in sleeping bag 15 min before bed.', kind: 'get' },
      { label: 'Hand/toe warmers (chemical)', note: 'Cheap insurance for cold sleepers. Toss one in the foot of the sleeping bag.', kind: 'get' },
      { label: 'Camp towel (small)', note: 'Wipe condensation from car windows or tent walls in the morning.', kind: 'get' },
    ]},
    { label: 'Quiet Hours & Etiquette', type: 'bc', children: [
      { label: 'BC Parks quiet hours: 11 PM – 7 AM', note: 'Some parks differ (e.g., Alice Lake 10 PM). Check specific park page.', type: 'bc', kind: 'do' },
      { label: 'Speaker off or whisper volume at quiet hours', note: 'Sound carries extremely well over water and between sites. #1 campground complaint.', kind: 'do' },
      { label: 'Campfires out before sleeping', note: 'Enforced. Fines apply.', type: 'warn', dep: 'The Night → Fire Schedule', kind: 'do' },
      { label: 'Alcohol: legal only at registered campsite', note: 'No open alcohol in common areas.', type: 'bc', kind: 'do' },
    ]},
    { label: 'Safety Protocol', children: [
      { label: 'CO warning: never run engine or use propane inside car/tent', note: 'Colourless, odourless, lethal. Not even "just for heat." Battery CO detector ~$25 if anyone sleeps in car.', type: 'warn', kind: 'do' },
      { label: 'Mark tent guylines with reflective cord or glow sticks', note: 'If tent is near foot traffic path.', kind: 'get' },
      { label: 'Clear bathroom path before dark', note: 'Walk the route once by headlamp. Designate a direction for overnight bathroom trips.', kind: 'do' },
      { label: 'Head count before lights-out', kind: 'do' },
      { label: 'Nobody walks alone beyond campsite perimeter', note: 'Within campsite solo is fine. Trail walks: pairs.', type: 'know' },
      { label: 'First aid kit', note: 'Bandages, antiseptic, blister pads, ibuprofen, antihistamine, tweezers.', kind: 'get' },
      { label: 'Nearest hospital saved offline', note: 'Cell coverage variable — Porteau Cove: good; Golden Ears interior: spotty.', kind: 'check' },
      { label: 'Set up camp fully BEFORE dark', note: 'Tents, sleeping gear, food storage, fire prep. All done in daylight. Non-negotiable for mixed-experience groups.', type: 'warn', kind: 'do' },
    ]},
  ]},
  { id: 'sunrise', label: 'The Sunrise', emoji: '🌅', minHours: 14,
    desc: 'Aspirational — plan for 2–3 motivated early risers, not the whole group.', children: [
    { label: 'Timing', children: [
      { label: 'Alarm: 60–75 min before sunrise', note: 'Late April sunrise ~5:50–6:10 AM. Early April ~6:30–6:50 AM. Adjust to actual trip date.', liveKey: 'sunrise', kind: 'check' },
      { label: 'Civil twilight starts 30–35 min before sunrise', note: 'Sky starts colouring then. Best colour is 10–15 min before sun crests.', type: 'know' },
      { label: 'Be in position during civil twilight', note: 'Not after sunrise — the best light happens before.', kind: 'do' },
    ]},
    { label: 'Viewing Location', children: [
      { label: 'Pre-scout east-facing vantage the evening before', note: 'None of the candidate sites have classic ocean-sunrise views.', dep: 'Site Selection', kind: 'do' },
      { label: 'Porteau Cove: west-facing campsites', note: 'Sunrise is behind you, over mountains. But alpenglow on Howe Sound + Anvil Island is spectacular. Pier is best vantage.', type: 'know' },
      { label: 'Golden Ears / Alice Lake: forested, enclosed', note: 'Walk to lakeshore for open sky. Sunrise light filters through trees — pleasant but not dramatic.' },
      { label: 'Sasamat Lake: NE shore, faces SW', note: 'Calm lake catches early light. Peaceful, not dramatic.' },
    ]},
    { label: 'Pre-Dawn Protocol', type: 'know', children: [
      { label: 'Prep grab-and-go pile the night before', note: 'Clothing, headlamp, thermos, chair — all in one spot. No rummaging in the dark.' },
      { label: 'Red-light headlamp only', note: 'White light destroys night vision (20–30 min to recover) and blinds sleeping campers through tent walls.', dep: 'Shared Dep' },
      { label: 'Zipper discipline: one slow continuous motion', note: 'Tent zippers are the loudest pre-dawn sound.' },
      { label: 'Footwear staged outside tent in a bag' },
      { label: 'No talking at camp — whisper only. Regroup at viewing spot.' },
    ]},
    { label: 'Coffee at the viewpoint', children: [
      { label: 'Thermos pre-filled the night before', note: 'No stove, no kettle, no boiling water at 4:30 AM. Silence is part of the experience.', dep: 'The Meal → Drinks', kind: 'do' },
      { label: 'Bring a camp chair or blanket to wrap in', dep: 'The Night → Comfort Kit', kind: 'do' },
    ]},
    { label: 'Full layering on', dep: 'The Night → Layering', kind: 'do' },
    { label: 'Dawn Chorus', type: 'know', children: [
      { label: 'Birds begin 30–60 min before sunrise', note: 'April Vancouver: robins and thrushes from ~4–5 AM, full chorus by 5:00–5:30 AM.' },
      { label: 'This IS the soundtrack', note: 'No music, no talking. Let it happen.' },
    ]},
    { label: 'Pre-dawn fire rebuild (optional)', note: 'Loud — crackling, blowing on coals. Only if the viewing spot is at the fire pit, not near tents.', dep: 'The Fire', kind: 'do' },
    { label: 'Photography', type: 'know', children: [
      { label: 'Clean phone lens (overnight condensation)' },
      { label: 'Lock exposure on brightest sky — let foreground silhouette', note: 'Silhouettes of friends holding coffee, the fire’s last embers with dawn sky behind.' },
      { label: 'Shoot every few minutes — light changes fast', note: 'Underwhelming at 5:40 can be extraordinary at 5:47.' },
      { label: 'Include human elements', note: 'A person holding coffee > an empty sky. Campfire foreground + dawn sky = the shot.' },
      { label: 'Also put the phone down', note: 'The point is the experience.' },
    ]},
  ]},
  { id: 'music', label: 'Music & Games', emoji: '🎸', minHours: 0,
    desc: 'Orbits The Fire. Arc: upbeat evening → mellow late night → contemplative pre-dawn.', children: [
    { label: 'Guitar', note: 'Everett — see HAN-2', children: [
      { label: 'Clip-on tuner (Snark or similar)', note: 'Cold makes strings go flat unpredictably. Retune between songs.', kind: 'get' },
      { label: 'Let guitar acclimate 30 min in closed case', note: 'Prevents finish checking from rapid temp change.', type: 'know' },
      { label: 'Case stays closed when not playing', note: 'Damp can swell the top. One night won’t cause permanent damage, but don’t leave it out.' },
      { label: 'If rain threatens: guitar in case immediately', note: 'A garbage bag over the case is a reasonable backup.', kind: 'do' },
    ]},
    { label: 'Bluetooth speaker', children: [
      { label: 'IPX7-rated (waterproof)', note: 'JBL Flip series or Anker Soundcore. Survives rain and spills.', kind: 'get' },
      { label: 'Battery: 8–10 usable hours in April cold', note: 'Cold (<5°C) cuts battery 20–30%. Plan at 30–40% volume.', kind: 'do' },
      { label: 'Power bank as backup charger', dep: 'Shared Dep', kind: 'get' },
      { label: 'Strategy: guitar for singalongs, speaker for ambient', note: 'Extends both guitar player stamina and battery life.', type: 'know' },
    ]},
    { label: 'Playlist Arc', type: 'know', children: [
      { label: 'Evening (3–7 PM): upbeat acoustic, indie folk', note: 'Setup energy, cooking soundtrack.' },
      { label: 'Dusk/dinner (7–9 PM): guitar singalong block', note: 'Wagon Wheel, Country Roads, Sweet Caroline, Stand By Me, Free Fallin’.' },
      { label: 'Late night (9 PM–midnight): low-key instrumental, jazz, lo-fi', note: 'Conversation volume. Speaker barely audible.' },
      { label: 'Pre-dawn (midnight–4 AM): ambient, classical guitar, or silence', note: 'Bon Iver territory. Or just the fire and the night.' },
    ]},
    { label: 'Card & Board Games', children: [
      { label: 'Waterproof playing cards', note: 'Hoyle or similar, ~$8. One deck enables dozens of games. Resist wind better than paper.', kind: 'get' },
      { label: 'Love Letter', note: '16 cards, fast rounds (5 min), easy to teach. 2–6 players.', kind: 'get' },
      { label: 'Coup', note: '15 cards, bluffing/deduction. 2–6 players.', kind: 'get' },
      { label: 'The Mind', note: 'Cooperative, eerie, works great at night. 2–4 players.', kind: 'get' },
      { label: "We're Not Really Strangers", note: 'Conversation card game. Perfect for firelight — read one card at a time.', kind: 'get' },
      { label: "Bluff / Liar's Dice", note: '5 dice + cup per person. Works in total darkness.', kind: 'get' },
    ]},
    { label: 'Verbal / No-Equipment Games', type: 'know', children: [
      { label: 'Mafia / Werewolf', note: 'Purely verbal with eyes-closed mechanic. 4–6 players ideal. Works perfectly in firelight.' },
      { label: 'Contact', note: 'One person picks a secret word, others ask cryptic clue questions.' },
      { label: 'Two Truths and a Lie', note: 'Good icebreaker for mixed friend groups.' },
      { label: 'Fortunately/Unfortunately', note: 'Alternating storytelling. Hilarious.' },
    ]},
    { label: 'Stargazing', children: [
      { label: 'Stellarium Mobile (free app)', note: 'Point phone at sky, identifies constellations in real time.', kind: 'get' },
      { label: 'April sky: Leo overhead, Summer Triangle rising pre-dawn', note: 'Orion setting in west early evening. Vega, Deneb, Altair rising east by 4 AM.', type: 'know' },
      { label: 'Invent your own constellations', note: 'Name them after people in the group. Low-effort, high-memory-making.', type: 'know' },
    ]},
    { label: 'Practical', children: [
      { label: 'Headlamp on red mode for game lighting', dep: 'Shared Dep', kind: 'do' },
      { label: 'LED lantern on low at centre of game circle', note: 'Firelight alone is enough for Uno but not standard playing cards.', kind: 'get' },
      { label: 'Flat surface: cooler lid, cutting board, or camp chair tray', note: 'Cards on the ground = lost cards.', kind: 'do' },
      { label: 'If windy: pivot to verbal games', note: 'Have the backup plan ready. Wind is the enemy of card games.', type: 'know' },
    ]},
    { label: 'Sage bundle', note: 'Toss into fire — mosquito deterrent, smells excellent', kind: 'get' },
  ]},
  { id: 'morning', label: 'The Morning After', emoji: '☕', minHours: 15,
    desc: 'Post-sunrise. Break camp, hit a diner.', children: [
    { label: 'Breakfast Run', children: [
      { label: "Fergie's Café, Squamish", note: 'Opens 9:00 AM. GF options. Sunwolf Resort, Brackendale. No reservations.', dietary: ['celiac'], kind: 'check' },
      { label: 'Peaked Pies, Squamish', note: 'Opens 7:00 AM', kind: 'check' },
      { label: 'Freebird Table & Bar, Squamish', note: 'Opens 7:00 AM. Earliest Squamish option.', kind: 'check' },
      { label: 'Copper Beach Bar + Kitchen, Britannia Beach', note: 'Closest to Porteau Cove. Miners Breakfast.', kind: 'check' },
      { label: 'Dutch Pannekoek Haus, Chilliwack', note: 'Opens 8:00 AM. 2+ hrs from all candidate sites — only if heading east after.', dietary: ['celiac'], type: 'warn', kind: 'check' },
    ]},
    { label: 'Camp Breakdown', children: [
      { label: 'Extinguish fire completely', note: 'Drown, stir, drown, feel with back of hand. If warm, repeat.', dep: 'The Fire → Safety', kind: 'do' },
      { label: 'Full-site trash sweep', note: 'Grid-walk the campsite. Micro-trash (bottle caps, foil bits, twist ties) is most commonly missed.', kind: 'do' },
      { label: 'Pack out ALL waste', note: 'Including food scraps, fruit peels, eggshells. Double-bag wet trash.', kind: 'do' },
      { label: 'Greywater: strain solids, scatter water 200ft from water source', note: 'Pack out the strained food particles.', type: 'bc', kind: 'do' },
      { label: 'Restore site to natural state', note: 'Replace moved rocks/logs. Fluff matted grass. Scatter leaves/needles over bare spots.', kind: 'do' },
      { label: 'Check bear cache / food locker emptied', dep: 'The Night → Wildlife', kind: 'do' },
      { label: 'Final walk-through before departure', kind: 'do' },
    ]},
    { label: 'Post-Trip Gear Care', note: 'Do same-day — mildew starts within 24–48 hours.', children: [
      { label: 'Tent: set up at home to dry before storing', note: 'Storing wet = mildew = ruined tent.', kind: 'do' },
      { label: 'Sleeping bags: hang or drape, never stuff wet', kind: 'do' },
      { label: 'Tarps: hang to dry', kind: 'do' },
      { label: 'Cooler: drain at site, wash with baking soda at home', note: 'If fish/meat stored: dilute bleach wash, rinse thoroughly.', kind: 'do' },
      { label: 'Car: tarp/garbage bags in trunk before loading wet gear', kind: 'do' },
    ]},
    { label: 'Trip Memory', children: [
      { label: 'Shared photo album (Google Photos or Apple Shared)', note: 'Create before the trip, share link in group chat. Everyone uploads.', kind: 'do' },
      { label: 'Group photo before breaking camp', note: 'Easiest to forget in the departure rush.', kind: 'do' },
    ]},
  ]},
  { id: 'ntg', label: 'Nice-to-Haves', emoji: '✶', minHours: 0,
    desc: 'Elevate the experience. None are blocking.', children: NICE_TO_HAVES },
];

const RECIPES = [
  { name: 'Shrimp Tacos', timing: 'Dinner',
    ingredients: ['Shrimp', 'Corn tortillas', 'Peppers + onions', 'Butter + garlic', 'Hot sauce + lime'],
    method: 'Skewer shrimp, grill over coals 2 min/side. Warm tortillas briefly over grate. Sauté peppers and onions in pot with butter and garlic. Assemble.',
    tags: ['pescatarian','gf'], effort: 'Low' },
  { name: 'Halloumi & Veggie Skewers', timing: 'Dinner',
    ingredients: ['Halloumi', 'Peppers + onions + zucchini', 'Butter + garlic', 'Hot sauce + lime'],
    method: 'Cube halloumi, thread with veg. Grill over medium coals 3–4 min/side until grill marks appear. Finish with lime.',
    tags: ['vegetarian','gf','pescatarian'], effort: 'Low' },
  { name: 'Sausage Wraps', timing: 'Dinner',
    ingredients: ['Sausages', 'Corn tortillas', 'Peppers + onions', 'Hot sauce + lime'],
    method: 'Roast sausages on sticks over coals. Warm tortillas. Load with sautéed peppers and onions. Hit with hot sauce.',
    tags: ['gf'], effort: 'Very Low' },
  { name: 'Butter Garlic Shrimp', timing: 'Dinner / Late Night',
    ingredients: ['Shrimp', 'Butter + garlic', 'Corn tortillas'],
    method: 'Melt butter in pot. Add crushed garlic, 1 min. Add shrimp, toss until pink (3–4 min). Serve in tortilla or directly from pot.',
    tags: ['pescatarian','gf'], effort: 'Low' },
  { name: 'Late-Night Quesadillas', timing: 'Late Night',
    ingredients: ['Corn tortillas', 'Cheese', 'Sausage (optional)'],
    method: 'Layer cheese (+ sliced sausage if desired) between two tortillas. Hold flat over dying coals or balance on fire ring edge. Flip once.',
    tags: ['gf'], effort: 'Very Low' },
  { name: 'Pre-Dawn Scrambled Eggs', timing: 'Pre-Dawn (4:30 AM)',
    ingredients: ['Eggs', 'Butter + garlic', 'Cheese'],
    method: 'Crack eggs into pot with butter over rebuilt coals. Stir continuously. Add cheese before done. Fast, warm, fortifying.',
    tags: ['vegetarian','gf','pescatarian'], effort: 'Low' },
  { name: "S'mores", timing: 'Late Night',
    ingredients: ['Marshmallows', 'Chocolate', 'Graham crackers'],
    method: 'Roast marshmallow until golden. Sandwich with chocolate between crackers. Carry GF grahams separately for celiac guest.',
    tags: ['vegetarian'], effort: 'None',
    note: 'Terminal branch — ingredients do not recombine with the savoury set.' },
];

const INGREDIENTS = [
  { name: 'Corn tortillas',            tags: ['gf','vegan'],        recipes: ['Shrimp Tacos','Sausage Wraps','Butter Garlic Shrimp','Late-Night Quesadillas'] },
  { name: 'Shrimp',                    tags: ['pescatarian','gf'],  recipes: ['Shrimp Tacos','Butter Garlic Shrimp'] },
  { name: 'Halloumi',                  tags: ['vegetarian','gf'],   recipes: ['Halloumi & Veggie Skewers'] },
  { name: 'Peppers, onions, zucchini', tags: ['vegan','gf'],        recipes: ['Shrimp Tacos','Halloumi & Veggie Skewers','Sausage Wraps'] },
  { name: 'Eggs',                      tags: ['vegetarian','gf'],   recipes: ['Pre-Dawn Scrambled Eggs'] },
  { name: 'Cheese',                    tags: ['vegetarian','gf'],   recipes: ['Late-Night Quesadillas','Pre-Dawn Scrambled Eggs'] },
  { name: 'Sausages',                  tags: [],                    recipes: ['Sausage Wraps','Late-Night Quesadillas (opt.)'] },
  { name: 'Butter + garlic',           tags: ['vegetarian','gf'],   recipes: ['Shrimp Tacos','Halloumi & Veggie Skewers','Butter Garlic Shrimp','Pre-Dawn Scrambled Eggs'] },
  { name: 'Hot sauce + lime',          tags: ['vegan','gf'],        recipes: ['Shrimp Tacos','Halloumi & Veggie Skewers','Sausage Wraps','Butter Garlic Shrimp'] },
];

const SHARED_DEPS = [
  { dep: 'Site Selection',  needs: ['The Fire','The Sunrise','The Sunrise → Viewing'] },
  { dep: 'The Fire',        needs: ['The Meal','The Night','The Sunrise','Music & Games',"S'mores"] },
  { dep: "S'mores",         needs: ['The Meal → Sweets (chocolate, marshmallows)'] },
  { dep: 'Cold Chain',      needs: ['The Meal → Dinner (proteins)','The Night → Wildlife (food lockup)'] },
  { dep: 'Layering System', needs: ['The Night','The Sunrise'] },
  { dep: 'Headlamps',       needs: ['The Night','The Sunrise','The Fire (tending)','Music & Games'] },
  { dep: 'Firewood',        needs: ['The Fire','The Meal (cooking heat)','The Night → Fire Schedule'] },
  { dep: 'Camp Chairs',     needs: ['The Night → Comfort Kit','The Sunrise','Music & Games'] },
  { dep: 'Power Bank',      needs: ['Music & Games → Speaker','Pre-Flight → Gear'] },
  { dep: 'Wildlife Protocol', needs: ['The Night','The Morning After → Breakdown'] },
];

//  Helpers 
function Tag({ t }) {
  const m = TAG_META[t];
  if (!m) return null;
  return <span style={{ fontSize: 10, background: m.bg, color: m.color,
    borderRadius: 3, padding: '1px 5px', marginLeft: 4 }}>{m.label}</span>;
}
function DietBadge({ d }) {
  const color = d === 'celiac' ? C.gold : C.bc;
  return <span style={{ fontSize: 10, color, border: `1px solid ${color}44`,
    borderRadius: 3, padding: '1px 5px', marginLeft: 5 }}>⚠ {d}</span>;
}
function DepBadge({ label }) {
  return <span style={{ fontSize: 10, color: C.sage, border: `1px solid ${C.sage}44`,
    borderRadius: 3, padding: '1px 5px', marginLeft: 5 }}>→ {label}</span>;
}

//  Drive Times (OSRM)
function useDriveTimes() {
  const [times, setTimes] = useState({});
  useEffect(() => {
    const { lat, lng } = DEPARTURE.coords;
    Promise.all(
      SITES.map(async site => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${site.coords.lng},${site.coords.lat}?overview=false`;
          const data = await fetch(url).then(r => r.json());
          const route = data.routes?.[0];
          if (route) return [site.id, { minutes: Math.round(route.duration / 60), km: Math.round(route.distance / 1000) }];
        } catch (_) {}
        return [site.id, null];
      })
    ).then(entries => setTimes(Object.fromEntries(entries)));
  }, []);
  return times;
}

//  Site Selector
function SiteSelector() {
  const { site, setSite, driveTimes } = useContext(SiteCtx);
  const dt = site ? driveTimes[site.id] : null;
  const hasAllTimes = SITES.every(s => driveTimes[s.id] != null);
  return (
    <div style={{ padding: '9px 28px 10px', background: C.s1,
      borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono',monospace",
          textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Site</span>
        <select
          value={site?.id || ''}
          onChange={e => setSite(SITES.find(s => s.id === e.target.value) || null)}
          style={{ background: C.bg, color: site ? C.text : C.muted,
            border: `1px solid ${C.border}`, borderRadius: 4,
            padding: '4px 8px', fontSize: 12,
            fontFamily: "'JetBrains Mono',monospace",
            cursor: 'pointer', outline: 'none', minWidth: 230 }}
        >
          <option value=''>— not yet selected —</option>
          {SITES.map(s => {
            const t = driveTimes[s.id];
            const label = t ? `${t.minutes} min · ${t.km} km` : `~${s.driveTimeMin} min`;
            return <option key={s.id} value={s.id}>{s.short} · {label}</option>;
          })}
        </select>
        {site && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
            fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
            {dt
              ? <span style={{ color: C.text }}>{dt.minutes} min · {dt.km} km
                  <span style={{ color: C.dim }}> from {DEPARTURE.label}</span></span>
              : <span style={{ color: C.dim }}>routing…</span>
            }
            <span style={{ color: C.dim }}>·</span>
            <span style={{ color: C.dim }}>{site.highway}</span>
            <span style={{ color: site.fireAllowed ? C.sage : C.warn }}>
              {site.fireAllowed ? '✓ fire' : '✗ no fires'}
            </span>
            <span style={{
              color: site.cell === 'good' ? C.sage : site.cell === 'spotty' ? C.warn : C.muted
            }}>cell: {site.cell}</span>
          </div>
        )}
        {!site && !hasAllTimes && (
          <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono',monospace",
            fontStyle: 'italic' }}>routing from {DEPARTURE.label}…</span>
        )}
      </div>
      {site?.notes && (
        <div style={{ marginTop: 4, fontSize: 10, color: C.dim,
          fontFamily: "'JetBrains Mono',monospace", fontStyle: 'italic' }}>
          {site.notes}
        </div>
      )}
    </div>
  );
}

//  Duration Slider
function DurationSlider({ hours, setHours }) {
  const dl = getDurationLabel(hours);
  const pct = ((hours - 1) / 35) * 100;
  return (
    <div style={{ padding: '16px 28px 12px', background: C.s1,
      borderBottom: `1px solid ${C.border}` }}>
      <style>{`
        .dur-slider{-webkit-appearance:none;appearance:none;width:100%;height:4px;
          border-radius:2px;outline:none;cursor:pointer;
          background:linear-gradient(to right,${C.amber} ${pct}%,${C.border} ${pct}%)}
        .dur-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
          width:14px;height:14px;border-radius:50%;background:${C.amber};
          cursor:pointer;box-shadow:0 0 8px ${C.amber}88}
        .dur-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
          background:${C.amber};cursor:pointer;border:none}
      `}</style>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: 34, fontWeight: 700, color: C.amber, lineHeight: 1 }}>{hours}h</span>
        <span style={{ fontSize: 13, color: dl.star ? C.amber : C.muted,
          fontStyle: dl.star ? 'normal' : 'italic' }}>{dl.label}</span>
      </div>
      <input type="range" min={1} max={36} value={hours} className="dur-slider"
        onChange={e => setHours(+e.target.value)} />
      <div style={{ position: 'relative', height: 28, marginTop: 4 }}>
        {THRESHOLDS.map(t => {
          const left = ((t.h - 1) / 35) * 100;
          const active = hours >= t.h;
          return (
            <div key={t.h} style={{ position: 'absolute', left: `${left}%`,
              transform: 'translateX(-50%)', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 1, height: 5,
                background: active ? (t.star ? C.amber : C.muted) : C.dim }} />
              <span style={{ fontSize: 9, color: active ? (t.star ? C.amber : C.muted) : C.dim,
                whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono',monospace" }}>{t.h}h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function resolveLive(liveKey, live) {
  if (!live || live.loading || !liveKey) return null;

  if (liveKey === 'fireBans') {
    if (live.hasCampfireBan) return { text: 'Campfire ban in effect', color: C.warn };
    const bans = live.fireBans;
    if (!bans) return null;
    return bans.length === 0
      ? { text: 'No active bans', color: C.sage }
      : { text: `${bans.length} ban${bans.length !== 1 ? 's' : ''} nearby`, color: C.warn };
  }

  if (liveKey === 'forecast') {
    const f = live.forecast;
    if (!f) return null;
    const minT = f.minTemps?.[0];
    const maxT = f.maxTemps?.[0];
    const pop  = f.popMax?.[0];
    const wind = f.windMax?.[0];
    const parts = [];
    if (minT != null && maxT != null) parts.push(`${Math.round(minT)}–${Math.round(maxT)}°C`);
    if (pop  != null) parts.push(`rain ${pop}%`);
    if (wind != null) parts.push(`gusts ${Math.round(wind)} km/h`);
    if (f.minTemps?.[1] != null) parts.push(`tmrw ${Math.round(f.minTemps[1])}–${Math.round(f.maxTemps[1])}°C`);
    return parts.length ? { text: parts.join(' · '), color: C.bc } : null;
  }

  if (liveKey === 'rainRisk') {
    const pop = live.forecast?.popMax?.[0];
    if (pop == null) return null;
    if (pop >= 60) return { text: `⚠ ${pop}% rain — consider rescheduling`, color: C.warn };
    if (pop >= 40) return { text: `${pop}% rain — tarp required`, color: C.gold };
    return { text: `${pop}% rain — looking good`, color: C.sage };
  }

  if (liveKey === 'sunrise') {
    if (!live.sunrise) return null;
    // suggest alarm 30 min before civil twilight
    const [hh, mm] = live.sunrise.split(':').map(Number);
    const alarmH = String(hh).padStart(2, '0');
    const alarmM = String(Math.max(0, mm - 30)).padStart(2, '0');
    return { text: `Civil twilight ${live.sunrise} · Alarm ~${alarmH}:${alarmM}`, color: C.amber };
  }

  return null;
}

function LiveBadge({ liveKey }) {
  const live = useContext(LiveDataCtx);
  const resolved = resolveLive(liveKey, live);
  if (!resolved) return null;
  return (
    <span style={{ fontSize: 10, color: resolved.color, background: `${resolved.color}15`,
      border: `1px solid ${resolved.color}33`, borderRadius: 3, padding: '1px 6px',
      marginLeft: 6, fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap' }}>
      LIVE: {resolved.text}
    </span>
  );
}

//  TreeNode
function TreeNode({ node, depth = 0 }) {
  const hours = useContext(DurationCtx);
  const [open, setOpen] = useState(depth === 0);
  const allChildren = node.children || [];
  const visible = allChildren.filter(c => !c.minHours || hours >= c.minHours);
  const hiddenCount = allChildren.length - visible.length;
  const hasKids = visible.length > 0;
  const typeColor = node.type === 'bc' ? C.bc : node.type === 'warn' ? C.warn
    : node.type === 'dep' ? C.sage : node.type === 'know' ? '#b07fe0' : C.text;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 14 }}>
      <div onClick={() => hasKids && setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 7,
          padding: '3px 6px', borderRadius: 4,
          cursor: hasKids ? 'pointer' : 'default', color: typeColor,
          fontSize: depth === 0 ? 12.5 : 12,
          fontFamily: "'JetBrains Mono','Courier New',monospace",
          transition: 'background 0.12s' }}
        onMouseEnter={e => { if (hasKids) e.currentTarget.style.background = C.s3; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ flexShrink: 0, color: C.dim, fontSize: 10, marginTop: 3 }}>
          {hasKids ? (open ? '▾' : '▸') : '·'}
        </span>
        <div style={{ flex: 1 }}>
          <span>{node.label}</span>
          {node.liveKey && <LiveBadge liveKey={node.liveKey} />}
          {node.dep && <DepBadge label={node.dep} />}
          {node.dietary?.map(d => <DietBadge key={d} d={d} />)}
          {hiddenCount > 0 && (
            <span style={{ fontSize: 10, color: C.dim, marginLeft: 8, fontStyle: 'italic' }}>
              +{hiddenCount} at higher duration
            </span>
          )}
          {node.note && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontStyle: 'italic' }}>
              {node.note}
            </div>
          )}
        </div>
      </div>
      {hasKids && open && (
        <div style={{ borderLeft: `1px solid ${C.border2}`, marginLeft: 13,
          paddingLeft: 3, marginTop: 1, marginBottom: 2 }}>
          {visible.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

//  Tree View 
function TreeView() {
  const hours = useContext(DurationCtx);
  const [openNodes, setOpenNodes] = useState({ preflight: true, fire: true });
  const toggle = id => setOpenNodes(o => ({ ...o, [id]: !o[id] }));
  const visible = TREE.filter(n => !n.minHours || hours >= n.minHours);
  const hidden  = TREE.filter(n => n.minHours && hours < n.minHours);

  return (
    <div>
      {visible.map(node => (
        <div key={node.id} style={{ marginBottom: 10, border: `1px solid ${C.border}`,
          borderRadius: 8, overflow: 'hidden' }}>
          <div onClick={() => toggle(node.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 16px', background: C.s1, cursor: 'pointer',
              userSelect: 'none', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = C.s2}
            onMouseLeave={e => e.currentTarget.style.background = C.s1}
          >
            <span style={{ fontSize: 16 }}>{node.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 17, fontWeight: 600, color: C.amber, letterSpacing: '0.02em' }}>
                {node.label}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{node.desc}</div>
            </div>
            <span style={{ color: C.dim, fontSize: 12 }}>{openNodes[node.id] ? '▾' : '▸'}</span>
          </div>
          {openNodes[node.id] && (
            <div style={{ padding: '10px 14px 12px', background: C.bg }}>
              {node.children.map((c, i) => <TreeNode key={i} node={c} depth={0} />)}
            </div>
          )}
        </div>
      ))}
      {hidden.length > 0 && (
        <div style={{ padding: '10px 16px', border: `1px dashed ${C.border}`,
          borderRadius: 8, color: C.dim, fontSize: 11,
          fontFamily: "'JetBrains Mono',monospace",
          display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {hidden.map(n => (
            <span key={n.id}>
              {n.emoji} {n.label}
              <span style={{ marginLeft: 5, fontSize: 10 }}>unlocks at {n.minHours}h</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

//  Recipe Card 
function RecipeCard({ r }) {
  const [open, setOpen] = useState(false);
  const effortColor = r.effort === 'None' ? C.muted : r.effort === 'Very Low' ? C.sage
    : r.effort === 'Low' ? C.amber : C.warn;
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden',
      background: C.s1, marginBottom: 10 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '12px 16px', cursor: 'pointer', transition: 'background 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.background = C.s2}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
              fontSize: 16, fontWeight: 600, color: C.text }}>{r.name}</span>
            {r.tags.map(t => <Tag key={t} t={t} />)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: C.muted }}>{r.timing}</span>
            <span style={{ fontSize: 11, color: effortColor,
              border: `1px solid ${effortColor}44`, borderRadius: 3, padding: '1px 6px' }}>
              {r.effort}
            </span>
            <span style={{ color: C.dim, fontSize: 11 }}>{open ? '▾' : '▸'}</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.border2}` }}>
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 5 }}>Ingredients</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r.ingredients.map(ing => (
                <span key={ing} style={{ fontSize: 12, background: C.s3, color: C.muted,
                  borderRadius: 4, padding: '3px 8px',
                  fontFamily: "'JetBrains Mono',monospace" }}>{ing}</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 5 }}>Method</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{r.method}</div>
          </div>
          {r.note && (
            <div style={{ marginTop: 10, fontSize: 11, color: C.dim, fontStyle: 'italic',
              borderTop: `1px solid ${C.border2}`, paddingTop: 8 }}>{r.note}</div>
          )}
        </div>
      )}
    </div>
  );
}

//  Recipes View
function RecipesView() {
  return (
    <div>
      <div style={{ marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 8,
        background: C.s1, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
          fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, color: C.amber }}>
          Special Notes
        </div>
        {DIETARY.map(d => (
          <div key={d.tag} style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border2}`,
            display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: d.color, fontWeight: 600, flexShrink: 0 }}>⚠ {d.label}</span>
            <span style={{ fontSize: 11, color: C.muted }}>{d.detail}</span>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 20, padding: '12px 16px', background: C.s1,
        borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: 15, color: C.amber, marginBottom: 8 }}>Nine ingredients → seven dishes</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {INGREDIENTS.map(ing => (
            <div key={ing.name} style={{ fontSize: 11, background: C.s2, borderRadius: 5,
              padding: '4px 10px', border: `1px solid ${C.border}` }}>
              <span style={{ color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>{ing.name}</span>
              {ing.tags.map(t => <Tag key={t} t={t} />)}
              <span style={{ color: C.dim, fontSize: 10, marginLeft: 6 }}>
                → {ing.recipes.length} dish{ing.recipes.length !== 1 ? 'es' : ''}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.dim }}>
          Butter + garlic and hot sauce + lime each appear in 4 dishes. Corn tortillas are the universal base.
        </div>
      </div>
      {RECIPES.map(r => <RecipeCard key={r.name} r={r} />)}
    </div>
  );
}

//  Checklist View
// Only these kinds surface in the checklist. 'do' = on-situ advice, stays in tree only.
const CHECKLIST_KINDS = new Set(['check', 'get']);

function deriveChecklist(hours) {
  const checks = [];
  const gets = [];
  function collectLeaves(node, rootMeta) {
    if (node.type === 'know') return;
    if (node.type === 'dep') return;
    const children = (node.children || []).filter(c => !c.minHours || hours >= c.minHours);
    const actionableKids = children.filter(c => c.type !== 'know' && c.type !== 'dep');
    if (actionableKids.length === 0) {
      if (!CHECKLIST_KINDS.has(node.kind)) return;
      const item = { label: node.label, note: node.note, type: node.type, dietary: node.dietary, liveKey: node.liveKey, section: rootMeta };
      if (node.kind === 'check') checks.push(item);
      else if (node.kind === 'get') gets.push(item);
    } else {
      for (const child of children) collectLeaves(child, rootMeta);
    }
  }
  for (const root of TREE) {
    if (root.minHours && hours < root.minHours) continue;
    if (root.id === 'ntg') continue;
    const rootMeta = { id: root.id, label: root.label, emoji: root.emoji };
    for (const child of (root.children || [])) collectLeaves(child, rootMeta);
  }
  return { checks, gets };
}

// Returns 'yes' | 'no' | null — null means no signal (data absent or ambiguous)
function autoCheckLive(liveKey, live) {
  if (!live || live.loading || !liveKey) return null;
  if (liveKey === 'fireBans') {
    if (live.fireBans == null && live.hasCampfireBan == null) return null;
    return (live.hasCampfireBan || (live.fireBans?.length ?? 0) > 0) ? 'no' : 'yes';
  }
  if (liveKey === 'forecast') return live.forecast != null ? 'yes' : null;
  if (liveKey === 'rainRisk') {
    const pop = live.forecast?.popMax?.[0];
    if (pop == null) return null;
    if (pop < 40)  return 'yes';
    if (pop >= 60) return 'no';
    return null; // 40–59%: tarp zone, ambiguous
  }
  if (liveKey === 'sunrise') return live.sunrise != null ? 'yes' : null;
  return null;
}

const CYCLE = { undefined: 'yes', yes: 'no', no: 'ignored', ignored: undefined };

function ChecklistView() {
  const hours = useContext(DurationCtx);
  const live  = useContext(LiveDataCtx);
  // explicit: { [key]: 'yes' | 'no' | 'ignored' | undefined }
  const [explicit, setExplicit] = useState({});

  function cycle(key) {
    setExplicit(c => {
      const next = CYCLE[c[key]];
      const updated = { ...c };
      if (next === undefined) delete updated[key];
      else updated[key] = next;
      return updated;
    });
  }
  const { checks, gets } = deriveChecklist(hours);

  function groupBySection(items) {
    const map = new Map();
    for (const item of items) {
      const sid = item.section.id;
      if (!map.has(sid)) map.set(sid, { ...item.section, items: [] });
      map.get(sid).items.push(item);
    }
    return [...map.values()];
  }

  const checkSections = groupBySection(checks);
  const getSections = groupBySection(gets);
  function resolveState(i) {
    const key = `${i.section.id}:${i.label}`;
    return explicit[key] !== undefined ? explicit[key] : (autoCheckLive(i.liveKey, live) ?? undefined);
  }
  const doneChecks = checks.filter(i => resolveState(i) === 'yes').length;
  const doneGets   = gets.filter(i => resolveState(i) === 'yes').length;
  const doneTotal = doneChecks + doneGets;
  const totalItems = checks.length + gets.length;

  function renderItem(item) {
    const key      = `${item.section.id}:${item.label}`;
    const auto     = autoCheckLive(item.liveKey, live);   // 'yes' | 'no' | null
    const expVal   = explicit[key];                        // 'yes' | 'no' | 'ignored' | undefined
    const state    = expVal !== undefined ? expVal : auto; // effective state
    const isLive   = expVal === undefined && auto != null;

    const BOX = {
      yes:     { bg: isLive ? C.sage : C.amber, border: isLive ? C.sage : C.amber, glyph: '✓', glyphColor: C.bg },
      no:      { bg: C.warn,  border: C.warn,  glyph: '✗', glyphColor: C.bg },
      ignored: { bg: 'transparent', border: C.dim, glyph: '—', glyphColor: C.dim },
      default: { bg: 'transparent', border: item.type === 'bc' ? C.bc : item.type === 'warn' ? C.warn : C.dim, glyph: null, glyphColor: null },
    };
    const box = BOX[state] ?? BOX.default;
    const typeColor = item.type === 'bc' ? C.bc : item.type === 'warn' ? C.warn : null;
    const faded = state === 'yes' || state === 'ignored';

    return (
      <div key={key} onClick={() => cycle(key)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '7px 12px', cursor: 'pointer',
          borderBottom: `1px solid ${C.border2}`, transition: 'background 0.1s',
          opacity: faded ? 0.45 : 1 }}
        onMouseEnter={e => e.currentTarget.style.background = C.s2}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2,
          border: `1px solid ${box.border}`, borderRadius: 3, background: box.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s' }}>
          {box.glyph && <span style={{ color: box.glyphColor, fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{box.glyph}</span>}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: state === 'no' ? C.warn : (typeColor || C.text),
            fontFamily: "'JetBrains Mono',monospace",
            textDecoration: state === 'yes' || state === 'ignored' ? 'line-through' : 'none' }}>
            {item.label}
          </span>
          {item.dietary?.map(d => <DietBadge key={d} d={d} />)}
          {isLive && (
            <span style={{ fontSize: 9, color: auto === 'no' ? C.warn : C.sage,
              background: auto === 'no' ? `${C.warn}18` : `${C.sage}18`,
              border: `1px solid ${auto === 'no' ? C.warn : C.sage}33`,
              borderRadius: 3, padding: '0 5px', marginLeft: 6,
              fontFamily: "'JetBrains Mono',monospace" }}>
              LIVE
            </span>
          )}
          {item.note && (
            <div style={{ fontSize: 10, color: C.dim, marginTop: 1, fontStyle: 'italic' }}>
              {item.note}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderBucket(title, sections, done, total, accentColor) {
    if (sections.length === 0) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', background: C.s1,
          borderRadius: '8px 8px 0 0', border: `1px solid ${C.border}`,
          borderBottom: `2px solid ${accentColor}55` }}>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: 17, fontWeight: 700, color: accentColor }}>{title}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11,
            color: done === total ? C.sage : C.dim,
            fontFamily: "'JetBrains Mono',monospace" }}>{done} / {total}</span>
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderTop: 'none',
          borderRadius: '0 0 8px 8px', overflow: 'hidden', background: C.bg }}>
          {sections.map(sec => (
            <div key={sec.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 12px', background: C.s1,
                borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11 }}>{sec.emoji}</span>
                <span style={{ fontSize: 10, color: C.muted, letterSpacing: '0.03em',
                  fontFamily: "'JetBrains Mono',monospace" }}>{sec.label}</span>
              </div>
              {sec.items.map(item => renderItem(item))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, padding: '10px 16px', background: C.s1,
        borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: 15, color: C.amber }}>Everything Checklist</div>
        <div style={{ fontSize: 11, color: doneTotal === totalItems ? C.sage : C.muted,
          fontFamily: "'JetBrains Mono',monospace" }}>
          {doneTotal} / {totalItems}
        </div>
      </div>
      {renderBucket('Information Pulls', checkSections, doneChecks, checks.length, C.bc)}
      {renderBucket('Procurement', getSections, doneGets, gets.length, C.amber)}
    </div>
  );
}

//  Old Nice-to-Haves kept for reference (now in tree)
function NiceToHavesView() {
  const [checked, setChecked] = useState({});
  const toggle = i => setChecked(c => ({ ...c, [i]: !c[i] }));
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8,
      background: C.s1, padding: '16px 20px' }}>
      <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: 17, color: C.amber, marginBottom: 14 }}>Nice-to-Haves</div>
      {NICE_TO_HAVES.map((item, i) => (
        <div key={i} onClick={() => toggle(i)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 4px',
            cursor: 'pointer', borderBottom: `1px solid ${C.border2}`, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = C.s2}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 16, height: 16, border: `1px solid ${checked[i] ? C.amber : C.dim}`,
            borderRadius: 3, background: checked[i] ? C.amber : 'transparent', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            {checked[i] && <span style={{ color: C.bg, fontSize: 11, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, color: checked[i] ? C.dim : C.text,
            fontFamily: "'JetBrains Mono',monospace",
            textDecoration: checked[i] ? 'line-through' : 'none', transition: 'all 0.15s' }}>
            {i + 1}. {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

//  Shared Deps View 
function SharedDepsView() {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8,
      background: C.s1, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
        fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 17, color: C.amber }}>
        Shared Dependencies
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: C.s2 }}>
            {['Dependency','Required By'].map(h => (
              <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10,
                color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono',monospace", fontWeight: 400,
                borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHARED_DEPS.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border2}` }}
              onMouseEnter={e => e.currentTarget.style.background = C.s2}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '9px 16px', fontSize: 13, color: C.sage,
                fontFamily: "'JetBrains Mono',monospace" }}>{row.dep}</td>
              <td style={{ padding: '9px 16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {row.needs.map(n => (
                    <span key={n} style={{ fontSize: 11, background: C.s3, color: C.muted,
                      borderRadius: 3, padding: '2px 8px',
                      fontFamily: "'JetBrains Mono',monospace" }}>{n}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

//  Root App 
export default function App() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const [tab, setTab]     = useState('tree');
  const [hours, setHours] = useState(14);
  const [site, setSite]   = useState(null);
  const liveData   = useLiveData(site?.coords?.lat, site?.coords?.lng, site?.bcparksSlug ?? null, site?.open511Road ?? null);
  const driveTimes = useDriveTimes();

  const TABS = [
    { id: 'tree',      label: '⧁  Dep Tree' },
    { id: 'recipes',   label: '🍢  Recipes' },
    { id: 'checklist', label: '☑  Checklist' },
    { id: 'deps',      label: '⟳  Shared Deps' },
  ];

  return (
    <SiteCtx.Provider value={{ site, setSite, driveTimes }}>
    <DurationCtx.Provider value={hours}>
    <LiveDataCtx.Provider value={liveData}>
      <div style={{ background: C.bg, color: C.text, minHeight: '100vh',
        fontFamily: "'JetBrains Mono','Courier New',monospace" }}>

        {/* Header */}
        <div style={{ background: C.s1, borderBottom: `1px solid ${C.border}`,
          padding: '22px 28px 18px' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: 28, fontWeight: 700, color: C.amber,
            letterSpacing: '0.02em', lineHeight: 1 }}>A Nice Camping Trip</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Dependency Tree · April Edition · Metro Vancouver · Automobile Access
          </div>
        </div>

        {/* Live Status Bar */}
        <LiveStatusBar />

        {/* Duration Slider */}
        <DurationSlider hours={hours} setHours={setHours} />

        {/* Site Selector */}
        <SiteSelector />

        {/* Tab Bar */}
        <div style={{ display: 'flex', background: C.s1,
          borderBottom: `1px solid ${C.border}`, padding: '0 28px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', outline: 'none',
              borderBottom: tab === t.id ? `2px solid ${C.amber}` : '2px solid transparent',
              color: tab === t.id ? C.amber : C.muted,
              fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
              padding: '11px 16px', cursor: 'pointer', marginBottom: -1,
              transition: 'color 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 28px 40px', maxWidth: 880, margin: '0 auto' }}>
          {tab === 'tree'      && <TreeView />}
          {tab === 'recipes'   && <RecipesView />}
          {tab === 'checklist' && <ChecklistView />}
          {tab === 'deps'      && <SharedDepsView />}
        </div>
      </div>
    </LiveDataCtx.Provider>
    </DurationCtx.Provider>
    </SiteCtx.Provider>
  );
}


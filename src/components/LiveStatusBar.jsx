import { useContext } from "react";
import { C, WMO_CODES } from "../constants.js";
import { LiveDataCtx, SiteCtx, TripDateCtx } from "../context.js";

export function resolveLive(liveKey, live, site, driveTimes) {
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
    const [hh, mm] = live.sunrise.split(':').map(Number);
    const alarmH = String(hh).padStart(2, '0');
    const alarmM = String(Math.max(0, mm - 30)).padStart(2, '0');
    return { text: `Civil twilight ${live.sunrise} · Alarm ~${alarmH}:${alarmM}`, color: C.amber };
  }
  if (liveKey === 'parkStatus') {
    if (live.parkStatus == null) return null;
    return live.parkStatus === 'Open'
      ? { text: `Park: Open`, color: C.sage }
      : { text: `Park: ${live.parkStatus}`, color: C.warn };
  }
  if (liveKey === 'parkOpen') {
    if (live.parkStatus == null) return null;
    const base = live.parkStatus === 'Open' ? { text: 'Park: Open', color: C.sage } : { text: 'Park: Closed', color: C.warn };
    if (live.parkOpenNote) return { ...base, text: `${base.text} · ${live.parkOpenNote}` };
    return base;
  }
  if (liveKey === 'fireAllowed') {
    if (!site) return null;
    if (site.fireAllowed === false) return { text: 'No fire pits at this site', color: C.warn };
    if (live.hasCampfireBan == null) return null;
    return live.hasCampfireBan
      ? { text: 'Campfire ban in effect', color: C.warn }
      : { text: `Fires allowed · no ban`, color: C.sage };
  }
  if (liveKey === 'driveTime') {
    if (!site) return null;
    const dt = driveTimes?.[site.id];
    if (!dt) return null;
    return dt.minutes <= 90
      ? { text: `${dt.minutes} min · ${dt.km} km`, color: C.sage }
      : { text: `${dt.minutes} min · ${dt.km} km — over 1.5 h`, color: C.warn };
  }
  if (liveKey === 'roadConditions') {
    if (live.roadEvents == null) return null;
    return live.roadEvents.length === 0
      ? { text: 'No road events', color: C.sage }
      : { text: `${live.roadEvents.length} road event${live.roadEvents.length !== 1 ? 's' : ''} on route`, color: C.warn };
  }
  if (liveKey === 'airQuality') {
    if (live.aqhi == null) return null;
    const color = live.aqhi <= 3 ? C.sage : live.aqhi <= 6 ? C.gold : C.warn;
    const label = live.aqhi <= 3 ? 'good' : live.aqhi <= 6 ? 'moderate' : 'high risk';
    return { text: `AQHI ${live.aqhi} — ${label}`, color };
  }
  if (liveKey === 'nearbyFires') {
    if (live.activeFires == null) return null;
    return live.activeFires === 0
      ? { text: 'No active fires within 100 km', color: C.sage }
      : { text: `${live.activeFires} active fire${live.activeFires !== 1 ? 's' : ''} within 100 km`, color: C.warn };
  }
  if (liveKey === 'windFire') {
    const wind = live.weather?.windKmh;
    if (wind == null) return null;
    return wind < 30
      ? { text: `Wind ${wind} km/h — OK to light`, color: C.sage }
      : { text: `⚠ Wind ${wind} km/h — fire risky`, color: C.warn };
  }
  if (liveKey === 'overnightTemp') {
    const minT = live.forecast?.minTemps?.[0];
    if (minT == null) return null;
    const color = minT < -5 ? C.warn : minT < 3 ? C.gold : C.sage;
    return { text: `Overnight low ${Math.round(minT)}°C`, color };
  }
  if (liveKey === 'moonPhase') {
    if (!live.moonPhase) return null;
    const pct = Math.round(live.moonPhase.illumination * 100);
    const color = live.moonPhase.illumination < 0.25 ? C.sage : live.moonPhase.illumination > 0.75 ? C.muted : C.dim;
    return { text: `${live.moonPhase.phase} (${pct}% lit)`, color };
  }
  if (liveKey === 'weatherAlert') {
    if (live.weatherAlerts == null) return null;
    if (live.weatherAlerts.length === 0) return { text: 'No ECCC warnings', color: C.sage };
    const titles = live.weatherAlerts.slice(0, 2).map(f => f.properties?.event || 'Alert').join(', ');
    return { text: `⚠ ${live.weatherAlerts.length} ECCC warning${live.weatherAlerts.length !== 1 ? 's' : ''}: ${titles}`, color: C.warn };
  }
  if (liveKey === 'tides') {
    if (!live.tides?.predictions?.length) return null;
    const now = Date.now();
    const next = live.tides.predictions.find(p => new Date(p.iso).getTime() > now);
    if (!next) return null;
    const type = next.value > 2 ? 'High' : 'Low';
    return { text: `${type} tide ${next.value}m at ${next.time} · ${live.tides.station}`, color: C.bc };
  }

  return null;
}

export function LiveBadge({ liveKey }) {
  const live = useContext(LiveDataCtx);
  const { site, driveTimes } = useContext(SiteCtx) || {};
  const resolved = resolveLive(liveKey, live, site, driveTimes);
  if (!resolved) return null;
  return (
    <span style={{ fontSize: 10, color: resolved.color, background: `${resolved.color}15`,
      border: `1px solid ${resolved.color}33`, borderRadius: 3, padding: '1px 6px',
      marginLeft: 6, fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap' }}>
      LIVE: {resolved.text}
    </span>
  );
}

export function LiveStatusBar() {
  const live = useContext(LiveDataCtx);
  const { site } = useContext(SiteCtx) || {};
  const tripDateCtx = useContext(TripDateCtx);
  const today = new Date().toISOString().split('T')[0];
  const isFuture = live?.tripDate && live.tripDate !== today;

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
    <div style={{ background: C.s1, borderBottom: `1px solid ${C.border}`, padding: '8px 28px',
      display: 'flex', flexDirection: 'column', gap: 6 }}>

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

        {isFuture && (
          <div style={sep}>
            <span style={{ color: C.bc, fontSize: 10 }}>Forecast for {live.tripDate}</span>
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
            <span style={{ color: C.warn, marginLeft: 10 }}>
              🔥 {live.activeFires} active fire{live.activeFires !== 1 ? 's' : ''} within 100 km
            </span>
          )}
        </div>

        {live.aqhi != null && (
          <div style={sep}>
            <span style={{ color: live.aqhi <= 3 ? C.sage : live.aqhi <= 6 ? C.gold : C.warn }}>
              AQHI {live.aqhi}
            </span>
          </div>
        )}

        {live.uvIndex != null && (
          <div style={sep}>
            <span style={{ color: live.uvIndex <= 2 ? C.sage : live.uvIndex <= 5 ? C.gold : live.uvIndex <= 7 ? C.warn : C.warn }}>
              UV {live.uvIndex}
            </span>
          </div>
        )}

        {live.weatherAlerts != null && live.weatherAlerts.length > 0 && (
          <div style={sep}>
            <span style={{ color: C.warn, fontWeight: 600 }}>
              ⚠ {live.weatherAlerts.length} ECCC warning{live.weatherAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {(live.sunrise || live.sunset) && (
          <div style={{ ...sep, display: 'flex', gap: 10 }}>
            {live.sunrise && <span style={{ color: C.amber }}>↑ {live.sunrise}</span>}
            {live.sunset  && <span style={{ color: C.dim }}>↓ {live.sunset}</span>}
          </div>
        )}

        {live.moonPhase && (() => {
          const pct = Math.round(live.moonPhase.illumination * 100);
          const color = live.moonPhase.illumination < 0.25 ? C.sage : live.moonPhase.illumination > 0.75 ? C.muted : C.dim;
          return (
            <div style={sep}>
              <span style={{ color }}>◑ {live.moonPhase.phase} {pct}%</span>
            </div>
          );
        })()}

        {live.lastUpdated && (
          <span style={{ color: C.dim, marginLeft: 'auto', fontSize: 10 }}>
            {live.lastUpdated.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {site && (live.parkStatus || live.parkAdvisories?.length || live.roadEvents?.length > 0 || live.tides) && (
        <div style={{ ...rowStyle, paddingTop: 4, borderTop: `1px solid ${C.border2}` }}>
          {live.parkStatus && (
            <span style={{ color: live.parkStatus === 'Open' ? C.sage : C.warn }}>
              {live.parkStatus === 'Open' ? '✓' : '⚠'} Park: {live.parkStatus}
            </span>
          )}
          {live.parkAdvisories?.map((a, i) => (
            <span key={i} style={{ color: a.isSafetyRelated ? C.warn : C.gold }}>
              ⚑ {a.title}
            </span>
          ))}
          {live.roadEvents?.length > 0 && (
            <span style={{ color: C.warn }}>
              ⚠ {live.roadEvents.length} road event{live.roadEvents.length !== 1 ? 's' : ''} on {site.open511Road}
            </span>
          )}
          {live.tides?.predictions?.length > 0 && (() => {
            const now = Date.now();
            const upcoming = live.tides.predictions.filter(p => new Date(p.iso).getTime() > now).slice(0, 3);
            return upcoming.map((p, i) => {
              const type = p.value > 2 ? 'High' : 'Low';
              return (
                <span key={i} style={{ color: p.value > 2 ? C.bc : C.muted }}>
                  {type} {p.value}m @ {p.time}
                </span>
              );
            });
          })()}
          {live.tides?.station && <span style={{ color: C.dim }}>· {live.tides.station}</span>}
        </div>
      )}
    </div>
  );
}

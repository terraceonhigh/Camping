import { useState, useContext } from "react";
import { C, CHECKLIST_KINDS, resolveUrl, resolveWindKmh } from "../constants.js";
import { DurationCtx, LiveDataCtx, SiteCtx } from "../context.js";
import { TREE } from "../data/tree.js";
import { DietBadge } from "./Helpers.jsx";

export function deriveChecklist(hours) {
  const checks = [];
  const gets = [];
  function collectLeaves(node, rootMeta) {
    if (node.type === 'know') return;
    if (node.type === 'dep') return;
    const children = (node.children || []).filter(c => !c.minHours || hours >= c.minHours);
    const actionableKids = children.filter(c => c.type !== 'know' && c.type !== 'dep');
    if (actionableKids.length === 0) {
      if (!CHECKLIST_KINDS.has(node.kind)) return;
      const item = { label: node.label, note: node.note, type: node.type, dietary: node.dietary, liveKey: node.liveKey, url: node.url, urlCtx: node.urlCtx, section: rootMeta };
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
// site and driveTimes are optional; needed for fireAllowed / driveTime / parkOpen liveKeys
export function autoCheckLive(liveKey, live, site, driveTimes) {
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
  if (liveKey === 'parkStatus') {
    if (live.parkStatus == null) return null;
    return live.parkStatus === 'Open' ? 'yes' : 'no';
  }
  if (liveKey === 'parkOpen') {
    // parkOperation.isActive from BC Parks GraphQL
    if (live.parkStatus == null) return null;
    return live.parkStatus === 'Open' ? 'yes' : 'no';
  }
  if (liveKey === 'fireAllowed') {
    if (!site) return null;
    if (site.fireAllowed === false) return 'no'; // structural: no fire pits at this site
    if (live.hasCampfireBan == null) return null;
    return live.hasCampfireBan ? 'no' : 'yes';
  }
  if (liveKey === 'driveTime') {
    if (!site) return null;
    const mins = driveTimes?.[site.id]?.minutes;
    if (mins == null) return null;
    return mins <= 90 ? 'yes' : 'no';
  }
  if (liveKey === 'roadConditions') {
    if (live.roadEvents == null) return null;
    return live.roadEvents.length === 0 ? 'yes' : 'no';
  }
  if (liveKey === 'airQuality') {
    if (live.aqhi == null) return null;
    return live.aqhi <= 6 ? 'yes' : 'no'; // AQHI 7+ = High risk
  }
  if (liveKey === 'nearbyFires') {
    if (live.activeFires == null) return null;
    return live.activeFires === 0 ? 'yes' : 'no';
  }
  if (liveKey === 'windFire') {
    const wind = resolveWindKmh(live);
    if (wind == null) return null;
    return wind < 30 ? 'yes' : 'no';
  }
  if (liveKey === 'overnightTemp') {
    const minT = live.forecast?.minTemps?.[0];
    if (minT == null) return null;
    return minT >= -5 ? 'yes' : 'no'; // warmer bag needed below -5°C
  }
  if (liveKey === 'moonPhase') {
    if (!live.moonPhase) return null;
    return 'yes'; // always informational — phase shown in badge
  }
  if (liveKey === 'weatherAlert') {
    if (live.weatherAlerts == null) return null;
    return live.weatherAlerts.length === 0 ? 'yes' : 'no';
  }
  if (liveKey === 'tides') {
    if (!live.tides) return null;
    return 'yes'; // always informational — times shown in badge
  }
  return null;
}

export const CYCLE = { undefined: 'yes', yes: 'no', no: 'ignored', ignored: undefined };

export function ChecklistView() {
  const hours = useContext(DurationCtx);
  const live  = useContext(LiveDataCtx);
  const { site, driveTimes } = useContext(SiteCtx) || {};
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
  const getSections   = groupBySection(gets);

  function resolveState(i) {
    const key = `${i.section.id}:${i.label}`;
    return explicit[key] !== undefined ? explicit[key] : (autoCheckLive(i.liveKey, live, site, driveTimes) ?? undefined);
  }
  const doneChecks = checks.filter(i => resolveState(i) === 'yes').length;
  const doneGets   = gets.filter(i => resolveState(i) === 'yes').length;
  const doneTotal  = doneChecks + doneGets;
  const totalItems = checks.length + gets.length;

  function renderItem(item) {
    const key    = `${item.section.id}:${item.label}`;
    const auto   = autoCheckLive(item.liveKey, live, site, driveTimes);
    const expVal = explicit[key];
    const state  = expVal !== undefined ? expVal : auto;
    const isLive = expVal === undefined && auto != null;
    const href   = resolveUrl(item, site, live);

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
          {href && !faded
            ? <a href={href} target="_blank" rel="noopener noreferrer"
                 onClick={e => e.stopPropagation()}
                 style={{ fontSize: 12, color: state === 'no' ? C.warn : (typeColor || C.text),
                   fontFamily: "'JetBrains Mono',monospace", textDecoration: 'none',
                   borderBottom: `1px dashed ${C.dim}` }}>
                {item.label}
                <span style={{ fontSize: 8, color: C.dim, marginLeft: 4 }}>↗</span>
              </a>
            : <span style={{ fontSize: 12, color: state === 'no' ? C.warn : (typeColor || C.text),
                fontFamily: "'JetBrains Mono',monospace",
                textDecoration: faded ? 'line-through' : 'none' }}>
                {item.label}
              </span>
          }
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

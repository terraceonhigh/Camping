import { useContext, useState, useRef, useEffect } from "react";
import { C } from "../constants.js";
import { SiteCtx } from "../context.js";
import { SITES, DEPARTURE } from "../data/sites.js";

const MONO = "'JetBrains Mono',monospace";

export function SiteSelector() {
  const { site, setSite, driveTimes, departure, setDeparture } = useContext(SiteCtx);
  const dep = departure || DEPARTURE;

  const [dInput, setDInput]         = useState(dep.label);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]             = useState(false);
  const [hiIdx, setHiIdx]           = useState(-1);
  const debounceRef = useRef(null);
  const blurRef     = useRef(null);

  useEffect(() => { setDInput(dep.label); }, [dep.label]);

  const dt = site ? driveTimes[site.id] : null;

  // --- autocomplete ---
  function handleInput(value) {
    setDInput(value);
    setHiIdx(-1);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=ca`,
          { headers: { 'User-Agent': 'CampingPlannerApp/1.0' } }
        ).then(r => r.json());
        setSuggestions(Array.isArray(res) ? res : []);
        setOpen(true);
      } catch (_) {}
    }, 280);
  }

  function pick(s) {
    const parts = s.display_name.split(',');
    const label = parts.slice(0, 2).map(p => p.trim()).join(', ');
    setDInput(label);
    setDeparture({ label, coords: { lat: parseFloat(s.lat), lng: parseFloat(s.lon) } });
    setSuggestions([]);
    setOpen(false);
    setHiIdx(-1);
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHiIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHiIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && hiIdx >= 0) { e.preventDefault(); pick(suggestions[hiIdx]); }
    if (e.key === 'Escape') { setOpen(false); setSuggestions([]); }
  }

  function handleBlur() {
    blurRef.current = setTimeout(() => { setOpen(false); setSuggestions([]); }, 160);
  }

  function handleFocus() {
    clearTimeout(blurRef.current);
    if (suggestions.length > 0) setOpen(true);
  }

  // --- shared styles ---
  const box = {
    flex: 1, minWidth: 0, background: C.bg,
    border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px',
    position: 'relative',
  };
  const flabel = {
    fontSize: 9, color: C.dim, fontFamily: MONO,
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5,
  };
  const inputBase = {
    background: 'transparent', color: C.text, border: 'none',
    outline: 'none', width: '100%', fontSize: 12,
    fontFamily: MONO, padding: 0,
  };

  return (
    <div style={{ padding: '10px 28px', background: C.s1, borderBottom: `1px solid ${C.border}` }}>

      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>

        {/* FROM */}
        <div style={box}>
          <div style={flabel}>From</div>
          <input
            type="text"
            value={dInput}
            placeholder="Departure address…"
            onChange={e => handleInput(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={inputBase}
          />
          {dep.label && dep.label !== dInput && (
            <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO, marginTop: 3, fontStyle: 'italic' }}>
              {dep.label}
            </div>
          )}

          {/* Autocomplete dropdown */}
          {open && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: -1, right: -1, zIndex: 200,
              background: C.s1, border: `1px solid ${C.border}`,
              borderTop: 'none', borderRadius: '0 0 6px 6px',
              boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
            }}>
              {suggestions.map((s, i) => {
                const parts = s.display_name.split(',');
                const main = parts[0].trim();
                const sub  = parts.slice(1, 3).map(p => p.trim()).join(', ');
                return (
                  <div key={i}
                    onMouseDown={() => { clearTimeout(blurRef.current); pick(s); }}
                    style={{
                      padding: '7px 12px', cursor: 'pointer',
                      background: i === hiIdx ? C.s3 : 'transparent',
                      borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border2}` : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.s3; setHiIdx(i); }}
                    onMouseLeave={e => { if (i !== hiIdx) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ fontSize: 12, color: C.text, fontFamily: MONO }}>{main}</div>
                    {sub && <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO, marginTop: 1 }}>{sub}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Connector */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 2, flexShrink: 0, width: 56, paddingTop: 14,
        }}>
          <span style={{ color: C.dim, fontSize: 16, lineHeight: 1 }}>→</span>
          {dt ? (
            <>
              <span style={{ fontSize: 11, color: C.text, fontFamily: MONO, marginTop: 3 }}>{dt.minutes} min</span>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>{dt.km} km</span>
            </>
          ) : site ? (
            <span style={{ fontSize: 9, color: C.dim, fontFamily: MONO, marginTop: 3, fontStyle: 'italic' }}>routing…</span>
          ) : null}
        </div>

        {/* TO */}
        <div style={box}>
          <div style={flabel}>To</div>
          <select
            value={site?.id || ''}
            onChange={e => setSite(SITES.find(s => s.id === e.target.value) || null)}
            style={{
              background: C.bg, color: site ? C.text : C.muted,
              border: 'none', outline: 'none', width: '100%', fontSize: 12,
              fontFamily: MONO, cursor: 'pointer', padding: 0,
              appearance: 'none', WebkitAppearance: 'none',
            }}
          >
            <option value=''>— not yet selected —</option>
            {SITES.map(s => <option key={s.id} value={s.id} style={{ background: C.s1 }}>{s.short}</option>)}
          </select>
          {site ? (
            <div style={{ marginTop: 4, fontSize: 10, color: C.muted, fontFamily: MONO,
              display: 'flex', flexWrap: 'wrap', gap: '3px 10px', alignItems: 'center' }}>
              {site.address && <span style={{ color: C.dim }}>{site.address}</span>}
              {site.address && <span style={{ color: C.border }}>·</span>}
              <span style={{ color: site.fireAllowed ? C.sage : C.warn }}>
                {site.fireAllowed ? '✓ fire' : '✗ no fires'}
              </span>
              <span style={{ color: site.cell === 'good' ? C.sage : site.cell === 'spotty' ? C.warn : C.muted }}>
                cell: {site.cell}
              </span>
              <span style={{ color: C.dim }}>{site.highway}</span>
            </div>
          ) : (
            <div style={{ marginTop: 4, fontSize: 10, color: C.dim, fontFamily: MONO, fontStyle: 'italic' }}>
              select a campsite
            </div>
          )}
        </div>

      </div>

      {site?.notes && (
        <div style={{ marginTop: 6, fontSize: 10, color: C.dim, fontFamily: MONO, fontStyle: 'italic' }}>
          {site.notes}
        </div>
      )}
    </div>
  );
}

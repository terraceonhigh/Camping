import { C, getDurationLabel, THRESHOLDS } from "../constants.js";

export function DurationSlider({ hours, setHours }) {
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

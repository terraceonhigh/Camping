import { useState } from "react";
import { C } from "../constants.js";
import { NICE_TO_HAVES } from "../data/tree.js";

export function NiceToHavesView() {
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

import { C } from "../constants.js";
import { SHARED_DEPS } from "../data/recipes.js";

export function SharedDepsView() {
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

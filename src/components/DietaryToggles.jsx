import { useContext } from "react";
import { C, ALL_DIETS } from "../constants.js";
import { DietaryCtx } from "../context.js";

export function DietaryToggles() {
  const { active, toggle } = useContext(DietaryCtx);

  return (
    <div style={{
      padding: '7px 28px', background: C.s1, borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    }}>
      <span style={{
        fontSize: 9, color: C.dim, fontFamily: "'JetBrains Mono',monospace",
        textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0, marginRight: 2,
      }}>your group</span>

      {Object.entries(ALL_DIETS).map(([key, d]) => {
        const state = active.get(key); // undefined | 'partial' | 'full'
        const isPartial = state === 'partial';
        const isFull    = state === 'full';

        return (
          <button key={key} onClick={() => toggle(key)} title={
            !state    ? `${d.label} — click to mark some members`
            : isPartial ? `${d.label} — some members (click for all)`
            : `${d.label} — all members (click to clear)`
          } style={{
            background: isFull ? `${d.color}22` : 'transparent',
            border: `1px ${isPartial ? 'dashed' : 'solid'} ${state ? d.color : C.border}`,
            color: state ? d.color : C.dim,
            borderRadius: 4, padding: '2px 8px', fontSize: 10,
            fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer',
            transition: 'all 0.15s', lineHeight: 1.4,
          }}>
            {isPartial ? '~\u202f' : ''}{d.short}
          </button>
        );
      })}

      {active.size === 0 && (
        <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono',monospace", fontStyle: 'italic', marginLeft: 4 }}>
          no restrictions — tap to add
        </span>
      )}
      {active.size > 0 && (
        <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono',monospace", fontStyle: 'italic', marginLeft: 4 }}>
          {[...active.entries()].map(([k, s]) =>
            s === 'partial' ? `some ${ALL_DIETS[k]?.short ?? k}` : `all ${ALL_DIETS[k]?.short ?? k}`
          ).join(' · ')}
        </span>
      )}
    </div>
  );
}

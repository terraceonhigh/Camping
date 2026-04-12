import { useState } from "react";
import { C, DIETARY } from "../constants.js";
import { RECIPES, INGREDIENTS } from "../data/recipes.js";
import { Tag, DietBadge } from "./Helpers.jsx";

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
            {r.serves && <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>serves {r.serves}</span>}
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
          <div style={{ marginTop: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 6 }}>Ingredients</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r.ingredients.map(ing => (
                <span key={ing} style={{ fontSize: 12, background: C.s3, color: C.muted,
                  borderRadius: 4, padding: '3px 8px',
                  fontFamily: "'JetBrains Mono',monospace" }}>{ing}</span>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: r.tips ? 10 : 0 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 6 }}>Method</div>
            {r.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono',monospace",
                  flexShrink: 0, marginTop: 2, minWidth: 14, textAlign: 'right' }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{step}</span>
              </div>
            ))}
          </div>
          {r.tips && (
            <div style={{ borderTop: `1px solid ${C.border2}`, paddingTop: 8, marginTop: 4 }}>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 5 }}>Tips</div>
              {r.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                  <span style={{ color: C.amber, fontSize: 10, flexShrink: 0, marginTop: 2 }}>▸</span>
                  <span style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, fontStyle: 'italic' }}>{tip}</span>
                </div>
              ))}
            </div>
          )}
          {r.note && (
            <div style={{ marginTop: 8, fontSize: 11, color: C.dim, fontStyle: 'italic',
              borderTop: `1px solid ${C.border2}`, paddingTop: 8 }}>{r.note}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function RecipesView() {
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

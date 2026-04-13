import { useState, useContext } from "react";
import { C, ALL_DIETS } from "../constants.js";
import { DietaryCtx } from "../context.js";
import { RECIPES, INGREDIENTS } from "../data/recipes.js";
import { Tag, DietBadge } from "./Helpers.jsx";

// Compatibility helpers.
// dietStates: Map<tag, 'partial'|'full'>
// 'full'    = all members affected — incompatible recipes are dimmed
// 'partial' = some members affected — badges shown, no dimming

function _tagOk(recipe, diet) {
  if (diet === 'pescatarian') {
    return recipe.tags.includes('pescatarian') || recipe.tags.includes('vegetarian') || recipe.tags.includes('vegan');
  }
  if (diet === 'vegetarian') {
    return recipe.tags.includes('vegetarian') || recipe.tags.includes('vegan');
  }
  return recipe.tags.includes(diet);
}

// Returns true if the recipe satisfies all FULL restrictions.
function isCompatible(recipe, dietStates) {
  for (const [diet, state] of dietStates) {
    if (state !== 'full') continue;
    if (!_tagOk(recipe, diet)) return false;
  }
  return true;
}

// Returns array of { label, state } for every active restriction the recipe fails.
function incompatibleReasons(recipe, dietStates) {
  const reasons = [];
  for (const [diet, state] of dietStates) {
    if (!_tagOk(recipe, diet)) {
      reasons.push({ label: ALL_DIETS[diet]?.short ?? diet, state });
    }
  }
  return reasons;
}

function RecipeCard({ r, dietStates }) {
  const [open, setOpen] = useState(false);
  const effortColor = r.effort === 'None' ? C.muted : r.effort === 'Very Low' ? C.sage
    : r.effort === 'Low' ? C.amber : C.warn;
  const hasRestrictions = dietStates.size > 0;
  const compat = hasRestrictions ? isCompatible(r, dietStates) : true;
  // reasons: [{label, state}] — only populated when recipe fails at least one active restriction
  const reasons = hasRestrictions ? incompatibleReasons(r, dietStates) : [];
  const hasFullFail = reasons.some(re => re.state === 'full');

  return (
    <div style={{
      border: `1px solid ${hasFullFail ? C.warn + '55' : C.border}`,
      borderRadius: 8, overflow: 'hidden',
      background: C.s1, marginBottom: 10,
      opacity: hasFullFail ? 0.55 : 1,
      transition: 'opacity 0.2s, border-color 0.2s',
    }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {reasons.map((re, i) => (
              <span key={i} style={{
                fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
                color: re.state === 'full' ? C.warn : C.muted,
                background: re.state === 'full' ? `${C.warn}18` : `${C.muted}12`,
                border: `1px ${re.state === 'partial' ? 'dashed' : 'solid'} ${re.state === 'full' ? C.warn + '44' : C.border}`,
                borderRadius: 3, padding: '1px 6px',
              }}>
                {re.state === 'full' ? '✗' : '~'} {re.label}
              </span>
            ))}
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
          {hasFullFail && (
            <div style={{ marginTop: 10, marginBottom: 6, fontSize: 11, color: C.warn,
              background: `${C.warn}12`, borderRadius: 4, padding: '6px 10px',
              fontFamily: "'JetBrains Mono',monospace" }}>
              ⚠ Not compatible with: {reasons.filter(r => r.state === 'full').map(r => r.label).join(', ')} — shown for reference
            </div>
          )}
          <div style={{ marginTop: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 6 }}>Ingredients</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r.ingredients.map(ing => (
                <span key={ing} style={{ fontSize: 12, background: C.s2, color: C.muted,
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
  const { active: dietStates } = useContext(DietaryCtx);

  const compatCount = RECIPES.filter(r => isCompatible(r, dietStates)).length;
  const hasRestrictions = dietStates.size > 0;

  return (
    <div>
      {/* Special Notes — only for active restrictions */}
      <div style={{ marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 8,
        background: C.s1, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
          fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, color: C.amber }}>
          Special Notes
        </div>
        {!hasRestrictions ? (
          <div style={{ padding: '12px 16px', fontSize: 11, color: C.dim,
            fontFamily: "'JetBrains Mono',monospace", fontStyle: 'italic' }}>
            No group restrictions active. Toggle restrictions above to see handling notes.
          </div>
        ) : [...dietStates.keys()].map(key => {
          const d = ALL_DIETS[key];
          if (!d) return null;
          return (
            <div key={key} style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border2}`,
              display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, color: d.color, fontWeight: 600, flexShrink: 0 }}>⚠ {d.label}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{d.detail}</span>
            </div>
          );
        })}
      </div>

      {/* Ingredient matrix */}
      <div style={{ marginBottom: 20, padding: '12px 16px', background: C.s1,
        borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: 15, color: C.amber, marginBottom: 8 }}>
          {[...dietStates.values()].some(s => s === 'full')
            ? `${INGREDIENTS.length} ingredients · ${compatCount} of ${RECIPES.length} recipes compatible (all-member restrictions)`
            : hasRestrictions
            ? `${INGREDIENTS.length} ingredients → ${RECIPES.length} dishes — restrictions partial only`
            : `${INGREDIENTS.length} ingredients → ${RECIPES.length} dishes`}
        </div>
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
          {(() => {
            const top = [...INGREDIENTS].sort((a, b) => b.recipes.length - a.recipes.length).slice(0, 2);
            return `${top[0].name} (${top[0].recipes.length} dishes) and ${top[1].name} (${top[1].recipes.length} dishes) are the most cross-used ingredients.`;
          })()}
        </div>
      </div>

      {RECIPES.map(r => <RecipeCard key={r.name} r={r} dietStates={dietStates} />)}
    </div>
  );
}

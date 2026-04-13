import { C, TAG_META, ALL_DIETS } from "../constants.js";

export function Tag({ t }) {
  const m = TAG_META[t];
  if (!m) return null;
  return <span style={{ fontSize: 10, background: m.bg, color: m.color,
    borderRadius: 3, padding: '1px 5px', marginLeft: 4 }}>{m.label}</span>;
}

export function DietBadge({ d }) {
  const color = ALL_DIETS[d]?.color ?? C.muted;
  const label = ALL_DIETS[d]?.short ?? d;
  return <span style={{ fontSize: 10, color, border: `1px solid ${color}44`,
    borderRadius: 3, padding: '1px 5px', marginLeft: 5 }}>⚠ {label}</span>;
}

export function DepBadge({ label }) {
  return <span style={{ fontSize: 10, color: C.sage, border: `1px solid ${C.sage}44`,
    borderRadius: 3, padding: '1px 5px', marginLeft: 5 }}>→ {label}</span>;
}

import { useState, useContext } from "react";
import { C, resolveUrl } from "../constants.js";
import { DurationCtx, SiteCtx, LiveDataCtx } from "../context.js";
import { TREE } from "../data/tree.js";
import { DietBadge, DepBadge } from "./Helpers.jsx";
import { LiveBadge } from "./LiveStatusBar.jsx";

function TreeNode({ node, depth = 0 }) {
  const hours = useContext(DurationCtx);
  const { site } = useContext(SiteCtx) || {};
  const live = useContext(LiveDataCtx);
  const [open, setOpen] = useState(depth === 0);
  const allChildren = node.children || [];
  const visible = allChildren.filter(c => !c.minHours || hours >= c.minHours);
  const hiddenCount = allChildren.length - visible.length;
  const hasKids = visible.length > 0;
  const typeColor = node.type === 'bc' ? C.bc : node.type === 'warn' ? C.warn
    : node.type === 'dep' ? C.sage : node.type === 'know' ? '#b07fe0' : C.text;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 14 }}>
      <div onClick={() => hasKids && setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 7,
          padding: '3px 6px', borderRadius: 4,
          cursor: hasKids ? 'pointer' : 'default', color: typeColor,
          fontSize: depth === 0 ? 12.5 : 12,
          fontFamily: "'JetBrains Mono','Courier New',monospace",
          transition: 'background 0.12s' }}
        onMouseEnter={e => { if (hasKids) e.currentTarget.style.background = C.s3; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ flexShrink: 0, color: C.dim, fontSize: 10, marginTop: 3 }}>
          {hasKids ? (open ? '▾' : '▸') : '·'}
        </span>
        <div style={{ flex: 1 }}>
          {(() => { const href = resolveUrl(node, site, live); return href
            ? <a href={href} target="_blank" rel="noopener noreferrer"
                 onClick={e => e.stopPropagation()}
                 style={{ color: 'inherit', textDecoration: 'none',
                   borderBottom: `1px dashed ${C.dim}` }}>
                {node.label}
                <span style={{ fontSize: 8, color: C.dim, marginLeft: 4 }}>↗</span>
              </a>
            : <span>{node.label}</span>; })()}
          {node.liveKey && <LiveBadge liveKey={node.liveKey} />}
          {node.dep && <DepBadge label={node.dep} />}
          {node.dietary?.map(d => <DietBadge key={d} d={d} />)}
          {hiddenCount > 0 && (
            <span style={{ fontSize: 10, color: C.dim, marginLeft: 8, fontStyle: 'italic' }}>
              +{hiddenCount} at higher duration
            </span>
          )}
          {node.note && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontStyle: 'italic' }}>
              {node.note}
            </div>
          )}
        </div>
      </div>
      {hasKids && open && (
        <div style={{ borderLeft: `1px solid ${C.border2}`, marginLeft: 13,
          paddingLeft: 3, marginTop: 1, marginBottom: 2 }}>
          {visible.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export function TreeView() {
  const hours = useContext(DurationCtx);
  const [openNodes, setOpenNodes] = useState({ preflight: true, fire: true });
  const toggle = id => setOpenNodes(o => ({ ...o, [id]: !o[id] }));
  const visible = TREE.filter(n => !n.minHours || hours >= n.minHours);
  const hidden  = TREE.filter(n => n.minHours && hours < n.minHours);

  return (
    <div>
      {visible.map(node => (
        <div key={node.id} style={{ marginBottom: 10, border: `1px solid ${C.border}`,
          borderRadius: 8, overflow: 'hidden' }}>
          <div onClick={() => toggle(node.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 16px', background: C.s1, cursor: 'pointer',
              userSelect: 'none', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = C.s2}
            onMouseLeave={e => e.currentTarget.style.background = C.s1}
          >
            <span style={{ fontSize: 16 }}>{node.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 17, fontWeight: 600, color: C.amber, letterSpacing: '0.02em' }}>
                {node.label}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{node.desc}</div>
            </div>
            <span style={{ color: C.dim, fontSize: 12 }}>{openNodes[node.id] ? '▾' : '▸'}</span>
          </div>
          {openNodes[node.id] && (
            <div style={{ padding: '10px 14px 12px', background: C.bg }}>
              {node.children.map((c, i) => <TreeNode key={i} node={c} depth={0} />)}
            </div>
          )}
        </div>
      ))}
      {hidden.length > 0 && (
        <div style={{ padding: '10px 16px', border: `1px dashed ${C.border}`,
          borderRadius: 8, color: C.dim, fontSize: 11,
          fontFamily: "'JetBrains Mono',monospace",
          display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {hidden.map(n => (
            <span key={n.id}>
              {n.emoji} {n.label}
              <span style={{ marginLeft: 5, fontSize: 10 }}>unlocks at {n.minHours}h</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

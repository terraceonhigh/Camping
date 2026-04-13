import { useState, useEffect } from "react";
import { C } from "./constants.js";
import { DurationCtx, LiveDataCtx, SiteCtx, TripDateCtx } from "./context.js";
import { useLiveData } from "./hooks/useLiveData.js";
import { useDriveTimes } from "./hooks/useDriveTimes.js";
import { DEPARTURE } from "./data/sites.js";
import { vancouverToday } from "./utils/localDate.js";
import { LiveStatusBar } from "./components/LiveStatusBar.jsx";
import { DurationSlider } from "./components/DurationSlider.jsx";
import { TripDatePicker } from "./components/TripDatePicker.jsx";
import { SiteSelector } from "./components/SiteSelector.jsx";
import { TreeView } from "./components/TreeView.jsx";
import { RecipesView } from "./components/RecipesView.jsx";
import { ChecklistView } from "./components/ChecklistView.jsx";
import { SharedDepsView } from "./components/SharedDepsView.jsx";

const TABS = [
  { id: 'tree',      label: '⧁  Dep Tree' },
  { id: 'recipes',   label: '🍢  Recipes' },
  { id: 'checklist', label: '☑  Checklist' },
  { id: 'deps',      label: '⟳  Shared Deps' },
];

export default function App() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const [tab, setTab]         = useState('tree');
  const [hours, setHours]     = useState(14);
  const [site, setSite]       = useState(null);
  const [tripDate, setTripDate] = useState(() => vancouverToday());
  const [departure, setDeparture] = useState(DEPARTURE);
  const liveData   = useLiveData(site?.coords?.lat, site?.coords?.lng, site?.bcparksSlug ?? null, site?.open511Road ?? null, tripDate);
  const driveTimes = useDriveTimes(departure);

  return (
    <TripDateCtx.Provider value={{ tripDate, setTripDate }}>
    <SiteCtx.Provider value={{ site, setSite, driveTimes, departure, setDeparture }}>
    <DurationCtx.Provider value={hours}>
    <LiveDataCtx.Provider value={liveData}>
      <div style={{ background: C.bg, color: C.text, minHeight: '100vh',
        fontFamily: "'JetBrains Mono','Courier New',monospace" }}>

        {/* Header */}
        <div style={{ background: C.s1, borderBottom: `1px solid ${C.border}`,
          padding: '22px 28px 18px' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: 28, fontWeight: 700, color: C.amber,
            letterSpacing: '0.02em', lineHeight: 1 }}>A Nice Camping Trip</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Dependency Tree · April Edition · Metro Vancouver · Automobile Access
          </div>
        </div>

        <LiveStatusBar />
        <DurationSlider hours={hours} setHours={setHours} />
        <TripDatePicker />
        <SiteSelector />

        {/* Tab Bar */}
        <div style={{ display: 'flex', background: C.s1,
          borderBottom: `1px solid ${C.border}`, padding: '0 28px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', outline: 'none',
              borderBottom: tab === t.id ? `2px solid ${C.amber}` : '2px solid transparent',
              color: tab === t.id ? C.amber : C.muted,
              fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
              padding: '11px 16px', cursor: 'pointer', marginBottom: -1,
              transition: 'color 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 28px 40px', maxWidth: 880, margin: '0 auto' }}>
          {tab === 'tree'      && <TreeView />}
          {tab === 'recipes'   && <RecipesView />}
          {tab === 'checklist' && <ChecklistView />}
          {tab === 'deps'      && <SharedDepsView />}

          <div style={{ marginTop: 48, paddingTop: 16, borderTop: `1px solid ${C.border2}`,
            textAlign: 'center' }}>
            <a href="https://github.com/terraceonhigh/Camping"
               target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono',monospace",
                 textDecoration: 'none', letterSpacing: '0.05em',
                 transition: 'color 0.15s' }}
               onMouseEnter={e => e.currentTarget.style.color = C.muted}
               onMouseLeave={e => e.currentTarget.style.color = C.dim}>
              github.com/terraceonhigh/Camping
            </a>
          </div>
        </div>
      </div>
    </LiveDataCtx.Provider>
    </DurationCtx.Provider>
    </SiteCtx.Provider>
    </TripDateCtx.Provider>
  );
}

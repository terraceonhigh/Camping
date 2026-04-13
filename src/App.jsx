import { useState, useEffect, useCallback } from "react";
import { C } from "./constants.js";
import { DurationCtx, LiveDataCtx, SiteCtx, TripDateCtx, DietaryCtx } from "./context.js";
import { useLiveData } from "./hooks/useLiveData.js";
import { useDriveTimes } from "./hooks/useDriveTimes.js";
import { DEPARTURE } from "./data/sites.js";
import { vancouverToday } from "./utils/localDate.js";
import { LiveStatusBar } from "./components/LiveStatusBar.jsx";
import { DurationSlider } from "./components/DurationSlider.jsx";
import { TripDatePicker } from "./components/TripDatePicker.jsx";
import { SiteSelector } from "./components/SiteSelector.jsx";
import { DietaryToggles } from "./components/DietaryToggles.jsx";
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
  // Diet states: Map<tag, 'partial' | 'full'>
  // 'partial' = some members affected (show badges, don't dim)
  // 'full'    = all members affected (dim incompatible recipes)
  // not in map = off
  const [activeDiets, setActiveDiets] = useState(new Map());
  const toggleDiet = useCallback(tag => setActiveDiets(prev => {
    const next = new Map(prev);
    const cur = next.get(tag);
    if (!cur) next.set(tag, 'partial');
    else if (cur === 'partial') next.set(tag, 'full');
    else next.delete(tag);
    return next;
  }), []);
  const liveData   = useLiveData(site?.coords?.lat, site?.coords?.lng, site?.bcparksSlug ?? null, site?.open511Road ?? null, tripDate);
  const driveTimes = useDriveTimes(departure);

  const tripMonth = new Date(tripDate + 'T12:00:00').toLocaleString('en-CA', { month: 'long', timeZone: 'America/Vancouver' });

  return (
    <TripDateCtx.Provider value={{ tripDate, setTripDate }}>
    <SiteCtx.Provider value={{ site, setSite, driveTimes, departure, setDeparture }}>
    <DurationCtx.Provider value={hours}>
    <LiveDataCtx.Provider value={liveData}>
    <DietaryCtx.Provider value={{ active: activeDiets, toggle: toggleDiet }}>
      <div style={{ background: C.bg, color: C.text, minHeight: '100vh',
        fontFamily: "'JetBrains Mono','Courier New',monospace" }}>

        {/* Header */}
        <header style={{ background: C.s1, borderBottom: `1px solid ${C.border}`,
          padding: '22px 28px 18px' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: 28, fontWeight: 700, color: C.amber,
            letterSpacing: '0.02em', lineHeight: 1, margin: 0 }}>A Nice Camping Trip</h1>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Dependency Tree · {tripMonth} · Metro Vancouver · Automobile Access
          </p>
        </header>

        <LiveStatusBar />
        <DurationSlider hours={hours} setHours={setHours} />
        <TripDatePicker />
        <SiteSelector />
        <DietaryToggles />

        {/* Tab Bar */}
        <nav aria-label="Sections" style={{ display: 'flex', background: C.s1,
          borderBottom: `1px solid ${C.border}`, padding: '0 28px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              style={{
                background: 'none', border: 'none',
                borderBottom: tab === t.id ? `2px solid ${C.amber}` : '2px solid transparent',
                color: tab === t.id ? C.amber : C.muted,
                fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
                padding: '11px 16px', cursor: 'pointer', marginBottom: -1,
                transition: 'color 0.15s',
              }}>{t.label}</button>
          ))}
        </nav>

        {/* Content */}
        <main style={{ padding: '20px 28px 40px', maxWidth: 880, margin: '0 auto' }}>
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
        </main>
      </div>
    </DietaryCtx.Provider>
    </LiveDataCtx.Provider>
    </DurationCtx.Provider>
    </SiteCtx.Provider>
    </TripDateCtx.Provider>
  );
}

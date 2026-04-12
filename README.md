# A Nice Camping Trip

A living dependency tree for planning a mixed friend group campfire outing near Metro Vancouver. Built as a React app with live data integrations from Canadian government and open-source APIs.

**[→ Open the app](https://terraceonhigh.github.io/Camping/)**

---

## What it does

The app structures everything needed for an overnight campfire trip as a dependency tree — the same way a software project tracks what depends on what. It gates content by trip duration (a 4-hour evening fire needs different gear than a full sunrise arc), pulls live environmental data, and generates a departure checklist from the tree.

**Four tabs:**

| Tab | Purpose |
|-----|---------|
| Dep Tree | Collapsible dependency tree, filtered by trip duration and site selection |
| Recipes | Nine ingredients → seven fire-cooked dishes, with step-by-step methods |
| Checklist | Auto-populated procurement and information-pull list, with live signals |
| Shared Deps | Cross-reference table showing which resources multiple branches depend on |

---

## Running locally

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build → dist/
```

Requires Node 18+. No backend — all API calls are made client-side.

---

## Architecture

### State and context

Four React contexts flow from `App.jsx` downward:

| Context | Carries |
|---------|---------|
| `DurationCtx` | Selected trip duration in hours (1–36h, default 14h) |
| `LiveDataCtx` | All live API data — weather, fire bans, tides, park status, etc. |
| `SiteCtx` | Selected campsite, computed drive times, and departure coordinates |
| `TripDateCtx` | Selected trip date (YYYY-MM-DD), used for forecast and tide queries |

### Data files

| File | Contents |
|------|----------|
| `src/data/tree.js` | The dependency tree — `TREE` array of root nodes, `NICE_TO_HAVES` |
| `src/data/recipes.js` | `RECIPES`, `INGREDIENTS` matrix, `SHARED_DEPS` cross-reference |
| `src/data/sites.js` | `SITES` array (6 campsite candidates), `DEPARTURE` default origin |

### Hooks

| Hook | Does |
|------|------|
| `useLiveData(lat, lng, slug, road, date)` | 9 parallel API fetches, 30-min refresh interval |
| `useDriveTimes(departure)` | OSRM routing from departure → all 6 sites |

### Components

| Component | Role |
|-----------|------|
| `LiveStatusBar` | Status strip at top — weather, bans, tides, park advisories |
| `DurationSlider` | 1–36h slider with labelled arc thresholds |
| `TripDatePicker` | Date input with days-away colour coding and forecast window warning |
| `SiteSelector` | Flight-search layout — autocomplete FROM, dropdown TO, live drive time |
| `TreeView` | Collapsible dep tree with live badges and dietary indicators |
| `ChecklistView` | Two-bucket checklist (Information Pulls / Procurement) with 4-state cycle |
| `RecipesView` | Ingredient matrix + expandable recipe cards with numbered steps |
| `SharedDepsView` | Cross-reference table from `SHARED_DEPS` |

---

## Tree node schema

```js
{
  id: 'fire',              // root nodes only — used for open/close state
  label: 'The Fire',       // display text
  emoji: '🔥',             // root nodes only
  desc: 'Central dep …',   // root nodes only — shown in header
  minHours: 8,             // hides node (and children) below this duration
  type: 'bc|warn|dep|know',// colours the node; dep/know excluded from checklist
  kind: 'check|get|do',    // check/get surface in checklist; do stays tree-only
  liveKey: 'fireBans',     // wires to autoCheckLive() and resolveLive()
  url: 'https://…',        // static fallback link (↗ rendered in tree + checklist)
  urlCtx: 'parkPage|booking', // semantic hint for context-derived resolveUrl()
  dep: 'The Fire',         // renders a dep badge — cross-reference only
  note: 'text',            // italicised sub-line
  dietary: ['celiac','pescatarian'], // renders dietary badges
  children: [ /* nested nodes */ ],
}
```

### Duration thresholds

| Hours | Unlocks |
|-------|---------|
| 4h | Layering (per person) |
| 6h | Late Night snacks |
| 8h | The Night |
| 12h | Pre-Dawn snacks + Morning Fuel |
| 14h | The Sunrise ★ (default) |
| 15h | The Morning After |

### Checklist kinds

| Kind | Bucket |
|------|--------|
| `check` | Information Pulls |
| `get` | Procurement |
| `do` | Tree only (on-site action, not a departure task) |
| `know` / `dep` | Tree only (knowledge node / cross-reference) |

---

## Live data APIs

All fetches are in `src/hooks/useLiveData.js`. `Promise.allSettled` — any single failure degrades gracefully to null.

| # | Source | Data |
|---|--------|------|
| 0 | [Open-Meteo](https://open-meteo.com/) | Current weather + 3-day forecast, UV index |
| 1 | [sunrise-sunset.org](https://sunrise-sunset.org/api) | Civil twilight, sunrise, sunset |
| 2 | [BCWS ArcGIS](https://services6.arcgis.com/ubm4tcTYICKBpist/) | Campfire ban zones (layer 14) |
| 3 | BCWS ArcGIS | Active fire count within 100 km (layer 0) |
| 4 | [MSC GeoMet](https://geomet.weather.gc.ca/) | AQHI real-time observation (ECCC) |
| 5 | MSC GeoMet | ECCC weather alerts and warnings |
| 6 | [BC Parks GraphQL](https://bcparks.api.gov.bc.ca/graphql) | Park status, campfire ban, advisories, reservation URL |
| 7 | [DriveBC Open511](https://www.drivebc.ca/) | Active road events on route highway |
| 8 | [DFO IWLS](https://api.iwls.dfo-mpo.gc.ca/) | Tidal predictions — nearest station bbox lookup + high/low times |

Moon phase is computed locally using the Meeus algorithm (no API call).

### `liveKey` signal table

| liveKey | Green | Red |
|---------|-------|-----|
| `fireBans` | No active bans | Ban in effect |
| `nearbyFires` | 0 fires within 100 km | N fires |
| `airQuality` | AQHI ≤ 6 | AQHI ≥ 7 |
| `weatherAlert` | No ECCC warnings | N warnings |
| `windFire` | Wind < 30 km/h | Wind ≥ 30 km/h |
| `forecast` | Data present | — |
| `rainRisk` | Precip < 40% | Precip ≥ 60% |
| `overnightTemp` | Low ≥ −5°C | Low < −5°C |
| `parkStatus` | Park: Open | Park: Closed |
| `parkOpen` | isActive + openNote | Not active |
| `roadConditions` | No events | N events on route |
| `tides` | Always informational | — |
| `moonPhase` | Always informational | — |
| `sunrise` | Data present | — |
| `fireAllowed` | site.fireAllowed + no ban | No pits or ban active |
| `driveTime` | Drive ≤ 90 min | Drive > 90 min |

---

## Candidate sites

| Site | Drive | Fire | Cell | Notes |
|------|-------|------|------|-------|
| Porteau Cove | ~50 min | ✓ | Good | Year-round, oceanfront, tidal beach |
| Alice Lake | ~65 min | ✓ | Moderate | Quiet hours 10 PM |
| Golden Ears | ~70 min | ✓ | Spotty | Large park; walk to lakeshore for open sky |
| Rocky Point (Port Moody) | ~35 min | ✗ | Good | Day-use only |
| Sasamat Lake (Belcarra) | ~40 min | ✗ | Moderate | Day-use only, calm lake |
| Barnet Marine (Burnaby) | ~25 min | ✗ | Good | Day-use only, closest option |

---

## Guest notes

| Guest | Constraint |
|-------|-----------|
| Celiac | Mild — 20 ppm tolerance. GF products recommended; strict cross-contamination protocols not required. Wheat beer off-limits. |
| Pescatarian | No land meat. Dedicated colour-coded skewer set for fish/shrimp. |

---

## Design tokens

```js
bg:     '#17140d'  // very dark warm brown
s1:     '#201c13'  // surface 1
s2:     '#292418'  // hover
s3:     '#343020'  // tree hover
text:   '#f0e4c8'  // primary text
amber:  '#df7618'  // primary accent (fire)
sage:   '#7aaa7c'  // deps, safe indicators
warn:   '#e8b840'  // caution
bc:     '#68a8ca'  // BC regulatory + pescatarian
gold:   '#c8a44a'  // celiac warnings
```

Fonts: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) (display) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (UI chrome). Loaded via Google Fonts.

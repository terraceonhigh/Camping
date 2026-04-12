LAUDE.md — A Nice Camping Trip

Handoff document for Claude Code. You are picking up a project mid-conversation. Read this fully before touching anything.

---

## What This Is

A React application (`camping.jsx`) that is a living dependency tree for planning a mixed friend group campfire outing near Metro Vancouver. It began as a casual conversation about what to bring to a campfire, evolved into a structured dependency tree, and is now a multi-tab React app with a duration slider that gates tree node visibility.

The philosophical constraint from the user: **never think for them, only help them think.** Offer structure, surface gaps, ask the right questions — but do not make decisions on their behalf.

---

## The File

**`camping.jsx`** — single-file React component. This is the primary deliverable.

All data is defined inline at the top of the file. Components follow the data. The root export is `App`.

---

## Application Structure

### Four tabs:
1. **Dep Tree** — collapsible dependency tree, gated by duration slider
2. **Recipes** — ingredient matrix + expandable recipe cards
3. **Nice-to-Haves** — interactive checklist (checkboxes)
4. **Shared Deps** — cross-reference table of shared dependencies

### Duration Slider (1–36h)
- Lives between the header and tab bar
- Drives a `DurationCtx` React context (createContext/useContext)
- Nodes with `minHours` property are hidden when `hours < minHours`
- Hidden top-level nodes appear as ghost entries with "unlocks at Xh" labels
- Hidden children show "+N at higher duration" hint on the parent
- Defaults to **14h** (the target arc: afternoon to sunrise)

### Threshold unlocks:
| Hours | What unlocks |
|-------|-------------|
| 4h | Layering (per person) within The Night |
| 6h | Late Night snacks within The Meal |
| 8h | The Night (top-level) |
| 12h | Pre-Dawn snacks + Morning Fuel within The Meal |
| 14h | The Sunrise (top-level) |
| 15h | The Morning After (top-level) |

---

## The Dependency Tree — Current State

### Root children (in order):
1. **Pre-Flight Checks** — fully populated
2. **S'mores** — root-level ritual (elevated above The Meal by explicit user decision); 4 leaf nodes
3. **The Fire** — **fully populated and resolved** (the deepest, most complete branch)
4. **The Meal** — partially populated; see below
5. **The Night** — skeleton only
6. **The Sunrise** — skeleton only
7. **Music & Games** — skeleton only
8. **The Morning After** — skeleton only

### Traversal strategy: **depth-first**
We have been going depth-first. The Fire is complete. We were mid-conversation on **The Meal** when the user decided to move to Claude Code.

### The Meal — current state:
- **Dinner** ✓ — skewers, proteins, corn tortillas, pre-made option
- **Sweets** ✓ — just added; lists ingredients (bananas, Nutella, chocolate†, marshmallows†, tortillas†, butter†, brown sugar); † = shared deps with S'mores or other Meal nodes
- **Snacks** ✓ — phased by arc time:
  - Early Evening (always visible)
  - Late Night (minHours: 6)
  - Pre-Dawn (minHours: 12)
- **Drinks** ✓ — coffee, hot choc, beer/wine/spirits, water
- **Morning Fuel** ✓ — minHours: 12
- **Cold Chain** ✓ — ice box, ice, sealed containers
- **Cooking Gear** ✓ — pot, skewers, cutting board, plates, trash bags

**Next depth-first node: The Night.** It has a skeleton but needs full population on the same model as The Fire — physical deps, layering logic, shelter decision tree, shared deps.

---

## Guest Dietary Notes

These are baked into the UI as header badges and as `dietary` properties on tree nodes.

| Guest | Constraint | Detail |
|-------|-----------|--------|
| Celiac | Mild — **20 ppm tolerance** | GF products recommended. Strict cross-contamination not required. Shared skewers acceptable. Wheat beer off-limits. Trace soy sauce in marinade borderline acceptable. |
| Pescatarian | No land meat | Dedicated fish/seafood skewers. Colour-code one skewer set for fish only. |

---

## Recipes Tab

Seven dishes from nine base ingredients. The combinatorial logic is the point — minimal ingredient set, maximum output.

**Nine ingredients:**
corn tortillas, shrimp, halloumi, peppers/onions/zucchini, eggs, cheese, sausages, butter+garlic, hot sauce+lime

**Seven dishes:**
Shrimp Tacos, Halloumi & Veggie Skewers, Sausage Wraps, Butter Garlic Shrimp, Late-Night Quesadillas, Pre-Dawn Scrambled Eggs, S'mores

High-leverage multipliers: butter+garlic (4 dishes), hot sauce+lime (4 dishes), corn tortillas (4 dishes).

S'mores is a terminal branch — its ingredients do not recombine with the savoury set.

---

## Design System

```javascript
const C = {
  bg:     '#17140d',  // very dark warm brown
  s1:     '#201c13',  // surface 1 (headers, cards)
  s2:     '#292418',  // surface 2 (hover states)
  s3:     '#343020',  // surface 3 (tree hover)
  text:   '#f0e4c8',  // primary text
  muted:  '#9c8b6c',  // secondary text, notes
  dim:    '#5a5040',  // tertiary, ghost text
  amber:  '#df7618',  // primary accent (fire)
  gold:   '#c8a44a',  // celiac warnings
  sage:   '#7aaa7c',  // dep links, safe indicators
  warn:   '#e8b840',  // general warnings
  bc:     '#68a8ca',  // BC regulatory items + pescatarian
  border: '#38301e',
  border2:'#272012',
};
```

**Fonts:** Cormorant Garamond (display/headers) + JetBrains Mono (tree nodes, UI chrome). Loaded via Google Fonts in useEffect.

**Node type colours:**
- `bc` → C.bc (blue) — BC regulatory items
- `warn` → C.warn (yellow) — caution items
- `dep` → C.sage (green) — dependency reference nodes
- `know` → #b07fe0 (purple) — knowledge/skill nodes (non-physical deps)
- default → C.text

---

## Jira Integration

The user has a Jira project **HAN** ("Hangouts") on `api-sorority.atlassian.net`.

| Issue | Summary |
|-------|---------|
| HAN-1 | Campfire (Epic) |
| HAN-2 | Everett brings his guitar |
| HAN-3 | Someone carries firewood |
| HAN-4 | Someone buys booze |
| HAN-5 | Someone figures out skewers and s'mores |
| HAN-6 | Someone picks campfire-appropriate card games |
| HAN-7 | Someone brings a bucket of water for emergencies |

The Jira skill file is at `/mnt/skills/user/jira-runbook/SKILL.md`. Read it before creating any Jira issues.

---

## Site Selection Context (shelved)

The user explicitly shelved site selection mid-conversation. It was being researched but is not yet a node in the tree. When it is resumed, the context is:

- **Car access**, April execution, Metro Vancouver
- Comfort floor: "whatever, as long as there's a fire"
- Mixed friend group
- Strong preference for within 1 hour of Vancouver; exponential interest decay beyond
- Top candidates researched: Porteau Cove (year-round, oceanfront), Golden Ears, Alice Lake, Rocky Point Park (Port Moody — best transit), White Pine Beach / Sasamat Lake (Belcarra), Barnet Marine Park (Burnaby)
- BC fire ban check required: bcwildfire.ca (check day-of)
- Firewood 10km rule: BC Wildfire Act
- Booking: DiscoverCamping.ca

Site Selection will eventually be a node in the tree — it is a shared dependency of **The Fire** and **The Sunrise**.

---

## Research Report

A full research report was generated earlier in the conversation covering site selection, April weather (7°C overnight lows, 50% rain probability), the overnight arc (3pm–sunrise), gear checklists, and breakfast spots. It exists in the conversation history. If the user asks for it, retrieve it from context rather than regenerating.

---

## Conversation Style Notes

- User communicates in terse, precise instructions. Match that register.
- They think in structures — trees, hierarchies, dependencies. Honour that.
- When proposing changes to the tree, describe the structural implication before writing code.
- When uncertain about a structural decision, ask a single focused question. Do not ask multiple questions at once.
- Do not narrate tool use or explain what you are about to do at length. Act, then briefly note what changed.
- The user's preference: **"never, never, should you allow yourself to think for me."** Surface options, flag gaps, but let them decide.

---

## What To Do Next

1. Read this document fully. ✓
2. Read the current `camping.jsx` to reacquaint yourself with the exact data structures and component architecture.
3. Ask the user where they want to pick up. Do not assume — they may want to continue depth-first into **The Night**, revisit **The Meal**, push to **Site Selection**, or go somewhere else entirely.
4. When ready to continue the tree, the depth-first queue is:
   - The Night (next)
   - The Sunrise
   - Music & Games
   - The Morning After
   - Site Selection (when unshelved)

---

*Generated at end of claude.ai conversation session. Conversation history not available in Claude Code — this document is the full context.*


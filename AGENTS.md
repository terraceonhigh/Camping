AGENTS.md

## Who you are

You are Daphne. The code is not the point — the fire, the tide, the hour before civil twilight, the drive through the dark with the windows down: that is the point. You write software the way you'd pack a bag: only what's needed, nothing that will slow you down, everything in the right place so you're not hunting for it at 2am.

You treat correctness as a form of respect for the person using the thing. A wind reading that silently falls back to stale data, a clock that rolls over to tomorrow while the sun is still up — these are not edge cases, they are broken promises. You fix them not because you care about the code but because you care about the trip.

**How you work:**
- The experience comes first. Ask what the user will actually see or feel before deciding what to change.
- Code is a means to an end. Write the minimum that makes the thing true, then stop.
- If two parts of the app disagree about the same fact, one of them is lying. Find the shared source and make them both read from it.
- Test the things that can go quietly wrong — timezone math, fallback logic, async races. These are the failures no one notices until they're standing in the dark.
- `npm test && npm run build` before calling anything done.

---

To Daphne,

You left this repo in a state that is presentable in screenshots and builds cleanly, but it still has behavioral defects that matter more than the aesthetics. This is a complaint letter so you can pick up from something concrete instead of forcing the next reviewer to rediscover the same problems.

The old handoff was obsolete. `Camping.jsx` is gone. The app is now the multi-file Vite React app under `src/`, and the current review target is the committed state on this branch, not some earlier conversation artifact.

What persists:

1. The app computes "today" with `new Date().toISOString().split('T')[0]`.
   This is UTC, not Vancouver-local time.
   In practice, the app rolls over to tomorrow several hours early every evening in Pacific time.
   That breaks:
   - the default `tripDate`
   - the `TripDatePicker` "Today/Tomorrow/N days away" labeling
   - the `LiveStatusBar` future-date banner
   - the `useLiveData` branch that decides whether to fetch current conditions or date-specific forecast data
   Files:
   - `src/App.jsx`
   - `src/components/TripDatePicker.jsx`
   - `src/components/LiveStatusBar.jsx`
   - `src/hooks/useLiveData.js`
   Fix it with a Vancouver-local date helper and use it everywhere instead of repeating ad hoc UTC logic.

2. The async hooks are race-prone.
   `useLiveData` issues request batches and unconditionally commits whichever response finishes last, even if it belongs to an older site/date selection.
   `useDriveTimes` does the same for departure-based routing.
   If the user changes the site, date, or departure quickly, stale responses can overwrite fresh state and produce mismatched UI.
   Files:
   - `src/hooks/useLiveData.js`
   - `src/hooks/useDriveTimes.js`
   Fix it with request versioning, aborts, or both. The current behavior is not deterministic enough.

3. The "Wind forecast — safe to light fire" signal is internally inconsistent.
   In the checklist, `autoCheckLive('windFire', ...)` falls back to forecast wind when current weather is unavailable.
   In the tree badge, `resolveLive('windFire', ...)` only reads `live.weather?.windKmh`.
   Result:
   - future trip dates lose the wind badge entirely
   - same-day trips show current wind even though the label claims to be about forecast wind
   Files:
   - `src/components/LiveStatusBar.jsx`
   - `src/components/ChecklistView.jsx`
   - `src/hooks/useLiveData.js`
   Pick one definition and make all surfaces agree.

4. The sunrise alarm math is wrong.
   `06:10` minus 30 minutes is not `06:00`.
   The code clips negative minutes instead of borrowing from the hour.
   File:
   - `src/components/LiveStatusBar.jsx`
   This is small, but it is still wrong.

5. There is still no automated coverage for the failure-prone parts.
   The repo can build, but that only proves the syntax is legal.
   The current risks are date handling, race conditions, and cross-component signal consistency.
   If you touch those paths again without adding tests around them, expect the same review comments to return.

Constraints for the next pass:

- Do not reintroduce stale single-file assumptions from the old `CLAUDE.md`.
- Do not paper over the date bug with more `toISOString().split('T')[0]` copies.
- Do not fix the checklist and tree separately with divergent logic.
- Prefer extracting small shared helpers where behavior must stay aligned.

Minimum acceptable next move:

1. Add a shared local-date utility for `America/Vancouver`.
2. Make `App`, `TripDatePicker`, `LiveStatusBar`, and `useLiveData` consume it.
3. Guard `useLiveData` and `useDriveTimes` against stale async writes.
4. Unify the `windFire` signal semantics across checklist and live badges.
5. Fix the sunrise alarm calculation properly.
6. Add at least targeted tests for the date helper and the wind/alarm logic, or document clearly why tests are still absent.

Current verification status from review:

- `npm run build` passes.
- No runtime validation was done against live APIs in this handoff.
- The main findings came from code inspection of the current committed repo state.

If you are picking this up, start from the files above. The defects are specific enough that you should not need another archaeological dig through the repo just to begin.

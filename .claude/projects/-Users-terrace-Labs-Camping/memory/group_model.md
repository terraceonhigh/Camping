---
name: Group Model
description: Decision heuristics for autonomously populating the camping trip dependency tree
type: project
---

**Profile:** 4-6 people, mixed experience. Comfort-oriented — want everyone to come back. User is organizer, delegating via Jira (HAN project on api-sorority.atlassian.net). 1-2 cars, carpool.

**Decision heuristics:**

1. **Comfort > authenticity.** Least experienced person's threshold is the design constraint.
2. **Completeness over minimalism.** Add the node. Better to collapse a branch than miss something.
3. **Fair weather only.** Go/no-go decision node in Pre-Flight. Rain = reschedule, not contingency.
4. **Mixed shelter.** Cover both car sleeping and tent paths. Neither is default.
5. **Sunrise is aspirational.** Plan for motivated subset (2-3), not whole group. Don't over-build.
6. **Alcohol present, not central.** Include but don't build pairing/quantity nodes.
7. **Carpool constraint.** Space limited. Flag bulky gear. Consolidation matters.
8. **Jira-mappable.** Nodes should be concrete enough to become HAN tickets. "Someone does X" is valid.
9. **No vetos.** Latitude on content. Use judgment.

**Why:** User wants unattended autonomous work. This model replaces real-time approval for tree population decisions.

**How to apply:** When adding any node, check it against these 9 heuristics. If a node fails #1 (comfort) or #7 (carpool space), reconsider. If it's borderline, #2 (completeness) says add it.

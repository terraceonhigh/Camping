---
name: Monolith for Research
description: User wants Claude to use monolith CLI for web research, not the app itself
type: reference
---

`monolith URL` fetches and inlines a web page to stdout. Use it for Claude's own research (camping guides, gear lists, regulations). The React app uses APIs directly (wttr.in, BC Open Data WFS), not monolith.

**Useful flags:** `-I` (isolate from internet), `-i` (no images), `-F` (no fonts), `-f` (no frames), `-a` (no audio), `-c` (no CSS) — strip to text content for research.

**Gotcha:** Many BC gov sites are React SPAs — monolith gets the shell, not the rendered content. Prefer API endpoints or server-rendered pages.

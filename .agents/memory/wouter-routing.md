---
name: Wouter routing params
description: How wouter v3 handles parametric route segments in this project
---

## Rule
Wouter v3 uses `regexparam` for route matching. Named parameters **must** be preceded by a `/` — they cannot be inline within a segment.

**Wrong:** `/properties-in-:slug` → does NOT match `/properties-in-lekki`
**Correct:** `/properties-in/:slug` → matches `/properties-in/lekki`

**Why:** regexparam only splits on `/` boundaries, so `:slug` preceded by a hyphen is treated as a literal string, not a parameter.

**How to apply:** Any time you define a wouter route with a named param, always place it after a `/` separator. Use `/section/:param` not `/section-:param`.

---
name: Livarex SSR boundary
description: Static prerendering, browser-only globals, and client startup behavior for the Livarex property marketplace
---

The public site uses a separate static SSR renderer for SEO HTML and a lazy-loaded client `App`. The prerendered route tree must not be hydrated by the lazy client tree; client mounting is intentional. Browser-only interactive layers such as the chat widget should remain client-only rather than being rendered during static SSR.

**Why:** Rendering the same-looking page through different route trees caused React hydration error #418, while the chat widget touched browser globals during SSR and made every prerender route fail.

**How to apply:** When adding public routes, add them to both the SSR route table and the prerender route list. Keep browser APIs inside effects/event handlers or out of the SSR entry entirely, and validate the full client build plus SSR/prerender sequence.
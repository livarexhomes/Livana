---
name: Livarex preview setup
description: Local port ownership and API routing constraints for the Livarex web app
---

The WhatsApp bot and property frontend are separate local services. The bot owns port 3000, while the property frontend must use the configured frontend port (currently 21844). The frontend's local Vite server needs to dispatch `/api/*` requests to the same handlers used by the Vercel catch-all; otherwise support presence, registration, notifications, and confirmation calls look broken locally even though the deployment routes exist.

**Why:** Starting the web app on the bot's port produced misleading workflow failures, and missing local API dispatch caused false 404s during runtime verification.

**How to apply:** Check `.replit` and the active workflow before starting a preview. Keep the bot on its own port, use the frontend port for screenshots, and keep local API dispatch aligned with `api/[[...path]].js`.
# Taste
- Wants an AI assistant's claims to be backed by real actions: if the bot says it booked/scheduled something, it must actually write to the database via a real tool call — text-only role-play of completed actions is a bug. Confidence: 0.8
- Wants the bot to have complete, accurate company knowledge in its system prompt — mined from real company sources (site pages, docs), not generic or stale content. Confidence: 0.8
- Wants the bot to "handle responses well": graceful, fallback-able handling of upstream AI provider failures (non-JSON/HTML/WAF pages with 2xx status) instead of cryptic JSON.parse crashes or 500s. Confidence: 0.8
- Wants integrations fully linked to the real backend (e.g., Supabase): committed schema/migrations for every table the code depends on — in-memory fallbacks that silently lose data on restart are not acceptable. Confidence: 0.8
- Wants user-facing surfaces (e.g., the website chat widget) upgraded to a modern, polished UI rather than left as dated hand-styled components. Confidence: 0.5
- Expects UI work to be mobile responsive as a first-class requirement — mobile layout (bottom-sheet/landscape behavior), safe-area insets for notched devices, adequate touch targets, and mobile-specific input handling (e.g., not disabling pinch-zoom, 16px inputs to avoid iOS focus-zoom). Confidence: 0.7
- Prefers the assistant to work from the actual live repo (points to GitHub URL) rather than relying on pasted transcript fragments. Confidence: 0.6

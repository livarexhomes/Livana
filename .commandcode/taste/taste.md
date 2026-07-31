# Taste

## AI / bot behavior
- Wants an AI assistant's claims to be backed by real actions: if the bot says it booked/scheduled something, it must actually write to the database via a real tool call — text-only role-play of completed actions is a bug. Confidence: 0.8
- Wants the bot to have complete, accurate company knowledge in its system prompt — mined from real company sources (site pages, docs), not generic or stale content. Confidence: 0.8
- Wants the bot to "handle responses well": graceful, fallback-able handling of upstream AI provider failures (non-JSON/HTML/WAF pages with 2xx status) instead of cryptic JSON.parse crashes or 500s. Confidence: 0.8

## Backend / data
- Wants integrations fully linked to the real backend (e.g., Supabase): committed schema/migrations for every table the code depends on — in-memory fallbacks that silently lose data on restart are not acceptable. Confidence: 0.8

## Workflow
- Prefers the assistant to work from the actual live repo (points to GitHub URL) rather than relying on pasted transcript fragments. Confidence: 0.6

# Taste

- Treats AI claiming a completed action (e.g., "inspection booked") as a bug when no real tool call or database write happened — AI should perform actions via real tools, not role-play them in text. Confidence: 0.8
- Wants chatbots/product AI grounded in accurate, complete company facts sourced from the actual product (site pages, docs, repo), not generic or stale prompt content. Confidence: 0.8
- Wants backend integrations fully wired to the real data store (e.g., Supabase) — silent in-memory fallbacks that lose data on restart are considered "not fully linked" and unacceptable. Confidence: 0.8
- Wants graceful, fallback-able handling of upstream provider failures (e.g., HTML/WAF challenge pages returned with 2xx) instead of cryptic 500/JSON.parse crashes. Confidence: 0.7
- Prefers pointing the assistant at the live repo URL ("check here") so work is based on real code, not pasted transcript fragments. Confidence: 0.6

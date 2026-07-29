// Vercel Serverless Function — /api/chat
// Mirrors the core logic of livarex-bot/ai.js so the Vercel-hosted
// frontend has a real backend endpoint without a separate bot server.
//
// Required Vercel env vars:
//   AGENTROUTER_API_KEY   (or ANTHROPIC_API_KEY)
//   AGENTROUTER_BASE_URL  (or ANTHROPIC_BASE_URL)  — e.g. https://agentrouter.org/v1
//   VITE_SUPABASE_URL     — optional, for live listings
//   SUPABASE_SERVICE_ROLE_KEY — optional, for live listings

const SYSTEM_PROMPT = `You are Livarex Bot — the official AI property assistant for Livarex Homes (www.livarex.com.ng), Nigeria's verified property marketplace.

## About Livarex
- Based in Nigeria, covering Lagos and Ogun State (expanding soon to Abuja, Port Harcourt, Ibadan)
- Every landlord is KYC-verified: government ID, phone authentication, ownership review, manual admin approval
- Zero agent fees — tenants pay no commission, ever
- All communication between tenants and landlords goes through Livarex — no direct contact until inspection is confirmed
- Response time: typically under 2 hours on business days
- Contact: WhatsApp +2347061370742 | Website: www.livarex.com.ng

## Your role
- Help tenants find verified rental and lease properties in Lagos & Ogun
- Qualify leads naturally: budget, preferred area, property type, move-in timeline
- Book inspection requests by collecting: full name, preferred date/time, and the property they want to view
- Walk landlords through listing their property step-by-step
- Answer FAQ questions about the platform
- Escalate to a human agent when asked or when the issue is complex

## Tone & style
- Warm, professional, concise — this is a website chat, not email
- Keep replies short: 2–4 sentences max unless the user asks for a full listing or step-by-step guide
- Use Nigerian context: mention Lagos areas (Lekki, VI, Ikoyi, Surulere, Yaba, Ikeja), Naira (₦) pricing, local idioms where natural
- Never hard-sell — guide naturally, let the listings speak
- End each message with a gentle question or next step to keep the conversation going

## Key rules
- Never fabricate property details — only reference listings provided in the context below
- If no listings match, say "I'll check with the team and get back to you shortly" — don't guess
- Never share landlord contact info directly — all bookings go through Livarex
- If a user asks about Buy or Commercial properties, acknowledge these are coming soon and ask if you can help with Rent/Lease instead

## Landlord onboarding flow
When a landlord wants to list their property, guide them through this sequence:
1. Direct them to register at www.livarex.com.ng/landlord/register
2. They complete ID verification (government ID + phone)
3. Submit property details and photos via the dashboard
4. Livarex admin reviews and approves within 24–48 hours
5. Property goes live and inquiries start coming in
Reassure them: the process is straightforward, free to list, and the team is available to help.

## Inspection booking flow
When a tenant wants to book an inspection:
1. Ask which property they're interested in (title or location)
2. Collect: full name, preferred date (weekday/weekend), preferred time (morning/afternoon)
3. Confirm the details and tell them Livarex will coordinate with the landlord and confirm within 2–4 hours
4. Remind them the inspection is physical — Livarex will send the exact address after confirmation

## Common FAQ answers
- "Is Livarex safe?" → All landlords are KYC-verified, Livarex coordinates every inspection — you never meet a landlord alone
- "Do I pay agent fees?" → Never. Livarex is completely free for tenants
- "How long does it take?" → Inquiries handled within 2 hours; inspection confirmation within 24 hours
- "What areas are covered?" → Lagos (Lekki, VI, Ikoyi, Surulere, Yaba, Ajah, Ikeja, Maryland, Magodo, Sangotedo) and Ogun State
- "Can I rent/lease through you?" → Yes! Browse www.livarex.com.ng/listings or describe what you need`

// ── Fetch live listings from Supabase ─────────────────────────────────────────
async function fetchListings() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  try {
    const res = await fetch(
      `${url}/rest/v1/properties?status=eq.approved&select=id,title,property_type,city,state,price,bedrooms,bathrooms,description&order=created_at.desc&limit=15`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.map(p => ({
      title: p.title,
      type: p.property_type || 'Property',
      location: [p.city, p.state].filter(Boolean).join(', '),
      price: p.price ? `₦${Number(p.price).toLocaleString()}` : 'Price on request',
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      description: (p.description || '').slice(0, 120),
    }))
  } catch {
    return []
  }
}

function formatListings(listings) {
  if (!listings.length) return null
  return listings.slice(0, 10).map(p =>
    `• *${p.title}* | ${p.type} | ${p.location} | ${p.price} | ${p.bedrooms ?? '?'}bed/${p.bathrooms ?? '?'}bath\n  ${p.description}`
  ).join('\n\n')
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' })
  }

  // Resolve API credentials (same priority order as livarex-bot)
  const apiKey =
    process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.AGENTROUTER_API_KEY

  const baseURL = (
    process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL ||
    process.env.ANTHROPIC_BASE_URL ||
    process.env.AGENTROUTER_BASE_URL ||
    'https://api.anthropic.com'
  ).replace(/\/$/, '') // strip trailing slash

  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  // Normalise messages: content must be an array of blocks
  const normalised = messages.map(m => ({
    role: m.role,
    content: Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content) }],
  }))

  // Build system prompt with live listings
  const listings = await fetchListings()
  const listingsCtx = formatListings(listings)
  const system = listingsCtx
    ? `${SYSTEM_PROMPT}\n\n--- CURRENT VERIFIED LISTINGS ---\n${listingsCtx}\n--- END LISTINGS ---`
    : `${SYSTEM_PROMPT}\n\n--- LISTINGS: None available right now. Direct users to www.livarex.com.ng/listings ---`

  try {
    // Build endpoint: if baseURL already ends with /v1 just add /messages,
    // otherwise add the full /v1/messages path
    const messagesUrl = baseURL.endsWith('/v1')
      ? `${baseURL}/messages`
      : `${baseURL}/v1/messages`

    const apiRes = await fetch(messagesUrl, {
      method: 'POST',
      redirect: 'manual', // never silently follow redirects
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'messages-2023-12-15',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        system,
        messages: normalised,
      }),
    })

    // Redirect = wrong URL or auth rejected with a login-page redirect
    if (apiRes.status >= 300 && apiRes.status < 400) {
      const location = apiRes.headers.get('location') ?? '(no location header)'
      console.error('Redirect detected to:', location, 'from:', messagesUrl)
      return res.status(500).json({
        error: `Agentrouter redirected to ${location} — endpoint URL or API key is wrong`
      })
    }

    // Guard: only parse JSON responses; HTML = wrong endpoint or key
    const ct = apiRes.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) {
      const body = await apiRes.text()
      console.error('Non-JSON response from AI API:', apiRes.status, body.slice(0, 300))
      return res.status(500).json({
        error: `AI API returned ${apiRes.status} non-JSON (${ct}) — check AGENTROUTER_BASE_URL and API key`
      })
    }

    if (!apiRes.ok) {
      const err = await apiRes.text()
      console.error('AI API error:', apiRes.status, err)
      return res.status(500).json({ error: `AI error ${apiRes.status}: ${err.slice(0, 200)}` })
    }

    const data = await apiRes.json()
    const reply = data?.content?.[0]?.text ?? 'Sorry, I could not generate a response.'
    return res.status(200).json({ reply })
  } catch (err) {
    console.error('Chat handler error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}

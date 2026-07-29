// Vercel EDGE Function — /api/chat
// Edge runtime runs on Cloudflare PoP nodes (different IPs from Lambda).
// This bypasses agentrouter.org's Alibaba Cloud WAF that blocks Lambda IPs.
//
// Required Vercel env vars:
//   AGENTROUTER_API_KEY  (or ANTHROPIC_API_KEY)   — your agentrouter key
//   AGENTROUTER_BASE_URL (or ANTHROPIC_BASE_URL)  — https://agentrouter.org
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

export const config = { runtime: 'edge' }

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
- Warm, professional, concise
- Keep replies short: 2–4 sentences max unless the user asks for a full listing or step-by-step guide
- Use Nigerian context: mention Lagos areas (Lekki, VI, Ikoyi, Surulere, Yaba, Ikeja), Naira (₦) pricing
- Never hard-sell — guide naturally, let the listings speak
- End each message with a gentle question or next step

## Key rules
- Never fabricate property details — only reference listings provided in the context below
- If no listings match, say "I'll check with the team and get back to you shortly"
- Never share landlord contact info directly — all bookings go through Livarex
- If a user asks about Buy or Commercial properties, acknowledge these are coming soon

## Landlord onboarding flow
1. Direct them to register at www.livarex.com.ng/landlord/register
2. ID verification (government ID + phone)
3. Submit property details and photos via the dashboard
4. Admin reviews and approves within 24–48 hours
5. Property goes live

## Inspection booking flow
1. Ask which property they're interested in
2. Collect: full name, preferred date, preferred time
3. Confirm and tell them Livarex will coordinate within 2–4 hours

## Common FAQ answers
- "Is Livarex safe?" → All landlords are KYC-verified, Livarex coordinates every inspection
- "Do I pay agent fees?" → Never. Livarex is completely free for tenants
- "How long does it take?" → Inquiries within 2 hours; inspection confirmation within 24 hours
- "What areas are covered?" → Lagos (Lekki, VI, Ikoyi, Surulere, Yaba, Ajah, Ikeja, Magodo, Sangotedo) and Ogun State`

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  })
}

async function fetchListings() {
  const url = globalThis.process?.env?.VITE_SUPABASE_URL
  const key = globalThis.process?.env?.SUPABASE_SERVICE_ROLE_KEY
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
  } catch { return [] }
}

function formatListings(listings) {
  if (!listings.length) return null
  return listings.slice(0, 10).map(p =>
    `• *${p.title}* | ${p.type} | ${p.location} | ${p.price} | ${p.bedrooms ?? '?'}bed/${p.bathrooms ?? '?'}bath\n  ${p.description}`
  ).join('\n\n')
}

// ── Edge Handler ──────────────────────────────────────────────────────────────
export default async function handler(request) {
  // CORS preflight
  if (request.method === 'OPTIONS') return json({}, 200)
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  const { messages } = body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'messages array required' }, 400)
  }

  // Resolve agentrouter credentials (same priority as livarex-bot)
  const apiKey =
    process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.AGENTROUTER_API_KEY

  const baseURL = (
    process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL ||
    process.env.ANTHROPIC_BASE_URL ||
    process.env.AGENTROUTER_BASE_URL ||
    'https://api.anthropic.com'
  ).replace(/\/$/, '')

  if (!apiKey) return json({ error: 'API key not configured' }, 500)

  // agentrouter uses OpenAI-compatible format: /v1/chat/completions
  const endpoint = baseURL.endsWith('/v1')
    ? `${baseURL}/chat/completions`
    : `${baseURL}/v1/chat/completions`

  // Flatten messages to plain strings
  const flatMessages = messages.map(m => ({
    role: m.role,
    content: Array.isArray(m.content)
      ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      : String(m.content),
  }))

  // System prompt + live listings
  const listings = await fetchListings()
  const listingsCtx = formatListings(listings)
  const systemContent = listingsCtx
    ? `${SYSTEM_PROMPT}\n\n--- CURRENT VERIFIED LISTINGS ---\n${listingsCtx}\n--- END LISTINGS ---`
    : `${SYSTEM_PROMPT}\n\n--- LISTINGS: None right now. Direct users to www.livarex.com.ng/listings ---`

  const openAiMessages = [
    { role: 'system', content: systemContent },
    ...flatMessages,
  ]

  try {
    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'Livarex Property Assistant',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 512,
        messages: openAiMessages,
      }),
    })

    const ct = aiRes.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) {
      const text = await aiRes.text()
      console.error('Non-JSON from agentrouter:', aiRes.status, text.slice(0, 200))
      return json({ error: `agentrouter returned ${aiRes.status} non-JSON — WAF may still be active on edge` }, 500)
    }

    if (!aiRes.ok) {
      const err = await aiRes.text()
      console.error('agentrouter error:', aiRes.status, err)
      return json({ error: `AI error ${aiRes.status}: ${err.slice(0, 200)}` }, 500)
    }

    const data = await aiRes.json()
    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.content?.[0]?.text ||
      'Sorry, I could not generate a response.'

    return json({ reply })
  } catch (err) {
    console.error('Edge handler error:', err?.message ?? err)
    return json({ error: err?.message ?? 'Something went wrong.' }, 500)
  }
}

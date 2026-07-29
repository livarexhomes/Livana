// Vercel Serverless Function — /api/chat
// Calls OpenRouter (openrouter.ai) using OpenAI-compatible format.
// Works from Vercel — no WAF/IP issues.
//
// Required Vercel env vars:
//   OPENROUTER_API_KEY   — from openrouter.ai/keys
//
// Optional:
//   OPENROUTER_MODEL     — default: anthropic/claude-opus-4
//   VITE_SUPABASE_URL    — for live listings
//   SUPABASE_SERVICE_ROLE_KEY

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

// ── Supabase listings ─────────────────────────────────────────────────────────
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
  } catch { return [] }
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

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' })

  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free'

  // Flatten messages to plain strings for OpenAI format
  const flatMessages = messages.map(m => ({
    role: m.role,
    content: Array.isArray(m.content)
      ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      : String(m.content),
  }))

  // Build system prompt with live listings
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
    const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://www.livarex.com.ng',
        'X-Title': 'Livarex Property Assistant',
      },
      body: JSON.stringify({ model, messages: openAiMessages }),
    })

    if (!apiRes.ok) {
      const err = await apiRes.text()
      console.error('OpenRouter error:', apiRes.status, err)
      return res.status(500).json({ error: `AI error ${apiRes.status}: ${err.slice(0, 200)}` })
    }

    const data = await apiRes.json()
    const reply = data?.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.'
    return res.status(200).json({ reply })
  } catch (err) {
    console.error('Chat handler error:', err?.message ?? err)
    return res.status(500).json({ error: err?.message ?? 'Something went wrong.' })
  }
}

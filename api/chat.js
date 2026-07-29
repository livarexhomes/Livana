// Vercel Serverless Function — /api/chat
// Proxies to the Replit bot which calls agentrouter directly (no WAF issues).
// The Replit bot already handles the full AI pipeline + system prompt + listings.

const BOT_CHAT_URL =
  process.env.CHAT_PROXY_URL ||
  'https://agentrouter.org/'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const upstream = await fetch(BOT_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })

    const contentType = upstream.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await upstream.json()
      return res.status(upstream.status).json(data)
    }

    const text = await upstream.text()
    console.error('Proxy error: upstream returned non-JSON response', text)
    return res.status(502).json({ error: 'Chat service returned invalid response.' })
  } catch (err) {
    console.error('Proxy error:', err?.message)
    return res.status(500).json({ error: 'Could not reach chat service.' })
  }
}

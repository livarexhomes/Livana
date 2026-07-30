// Vercel Serverless Function — /api/chat
// Proxies to the configured chat bot or proxy. Adds debug logging and
// guards to help diagnose upstream (WAF / HTML) responses.

const BOT_CHAT_URL = process.env.CHAT_PROXY_URL || 'https://agentrouter.org/'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Log configured upstream for quick triage in deployment logs
  console.log('[chat] BOT_CHAT_URL=', BOT_CHAT_URL)

  try {
    // Avoid proxying to the same host (self-proxy / loop)
    let upstreamUrl = BOT_CHAT_URL
    try {
      const parsed = new URL(BOT_CHAT_URL)
      const hostHeader = (req.headers.host || '').split(':')[0]
      if (parsed.hostname === hostHeader) {
        console.error('[chat] Refusing to proxy to same host (possible misconfiguration)', parsed.hostname)
        return res.status(500).json({ error: 'Proxy misconfiguration: BOT_CHAT_URL points to this host' })
      }
      // Use the URL as-is (caller should supply the full path, e.g. https://bot-host/api/chat)
      upstreamUrl = parsed.toString()
    } catch (e) {
      // If BOT_CHAT_URL is not a full URL, proceed with it verbatim and let fetch report errors
      console.warn('[chat] BOT_CHAT_URL is not a fully qualified URL, using as-is')
    }

    // Add a 10s timeout to upstream requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-host': req.headers.host || '',
        'x-forwarded-for': req.headers['x-real-ip'] || req.socket?.remoteAddress || '',
      },
      body: JSON.stringify(req.body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('application/json')) {
      const data = await upstream.json()
      return res.status(upstream.status).json(data)
    }

    // Non-JSON response — capture a short snippet for debug logs (avoid huge bodies)
    const text = await upstream.text()
    const snippet = text ? text.slice(0, 800) : ''
    console.error('[chat] Proxy error: upstream returned non-JSON response', {
      status: upstream.status,
      contentType,
      snippet,
    })
    return res.status(502).json({ error: 'Chat service returned invalid response', upstreamStatus: upstream.status, contentType, snippet })
  } catch (err) {
    if (err && err.name === 'AbortError') {
      console.error('[chat] Proxy error: upstream request timed out')
      return res.status(504).json({ error: 'Chat service timed out.' })
    }
    console.error('[chat] Proxy error:', err?.message || err)
    return res.status(502).json({ error: 'Could not reach chat service.', details: err?.message || String(err) })
  }
}

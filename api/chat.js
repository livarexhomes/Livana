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

  // If AgentRouter / Anthropic env vars are set, prefer calling AgentRouter directly
  const AR_BASE = process.env.AGENTROUTER_BASE_URL || process.env.ANTHROPIC_BASE_URL || process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
  const AR_KEY = process.env.AGENTROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY
  if (AR_BASE && AR_KEY) console.log('[chat] AGENTROUTER_BASE_URL detected — will prefer direct AgentRouter call')

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

    // Build headers; include Authorization when calling AgentRouter directly
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-forwarded-host': req.headers.host || '',
      'x-forwarded-for': req.headers['x-real-ip'] || req.socket?.remoteAddress || '',
    }

    let finalUpstreamUrl = upstreamUrl
    const finalHeaders = { ...baseHeaders }

    // If AgentRouter envs are set, call its messages endpoint directly with the API key
    if (AR_BASE && AR_KEY) {
      try {
        finalUpstreamUrl = new URL('/v1/messages', AR_BASE).toString()
        finalHeaders['Authorization'] = `Bearer ${AR_KEY}`
        console.log('[chat] Using AgentRouter direct URL:', finalUpstreamUrl)
      } catch (e) {
        console.warn('[chat] Failed to construct AgentRouter URL, falling back to configured BOT_CHAT_URL')
        finalUpstreamUrl = upstreamUrl
      }
    } else {
      // If the configured BOT_CHAT_URL is a root URL, forward to the same incoming path.
      try {
        const parsed = new URL(upstreamUrl)
        if (parsed.pathname === '/' || parsed.pathname === '') {
          const incomingPath = (req.url || '/api/chat').split('?')[0]
          parsed.pathname = incomingPath || '/api/chat'
          finalUpstreamUrl = parsed.toString()
          console.log('[chat] Resolved BOT_CHAT_URL root to:', finalUpstreamUrl)
        }
      } catch (e) {
        // BOT_CHAT_URL may be relative; leave it as-is.
      }
    }

    let upstream
    try {
      upstream = await fetch(finalUpstreamUrl, {
        method: 'POST',
        headers: finalHeaders,
        body: JSON.stringify(req.body),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase()
    const responseText = await upstream.text()

    if (contentType.includes('application/json')) {
      try {
        const data = responseText ? JSON.parse(responseText) : {}
        return res.status(upstream.status).json(data)
      } catch (parseErr) {
        const snippet = responseText ? responseText.slice(0, 800) : ''
        console.error('[chat] Proxy error: invalid JSON body from upstream', {
          status: upstream.status,
          contentType,
          snippet,
        })
        return res.status(502).json({ error: 'Chat service returned invalid JSON', upstreamStatus: upstream.status, contentType, snippet })
      }
    }

    const snippet = responseText ? responseText.slice(0, 800) : ''
    console.error('[chat] Proxy error: upstream returned non-JSON response', {
      status: upstream.status,
      contentType,
      snippet,
    })
    return res.status(502).json({ error: 'Chat service returned non-JSON', upstreamStatus: upstream.status, contentType, snippet })
  } catch (err) {
    if (err && err.name === 'AbortError') {
      console.error('[chat] Proxy error: upstream request timed out')
      return res.status(504).json({ error: 'Chat service timed out.' })
    }
    console.error('[chat] Proxy error:', err?.message || err)
    return res.status(502).json({ error: 'Could not reach chat service.', details: err?.message || String(err) })
  }
}

// Helper: determine a sensible path to call on AgentRouter if callers passed a root URL.
function arPathOrRoot(req) {
  // If the incoming request body looks like a messages call, use '/v1/messages' as a common AgentRouter endpoint fallback.
  // Otherwise, call root.
  try {
    if (req && req.body && req.body.messages) return '/v1/messages'
  } catch (e) {}
  return '/'
}

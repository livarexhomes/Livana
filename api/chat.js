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
    }

    const upstream = await fetch(finalUpstreamUrl, {
      method: 'POST',
      headers: finalHeaders,
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
    // If AgentRouter env is configured, attempt a fallback direct call
    if (AR_BASE && AR_KEY) {
      try {
        console.log('[chat] Attempting fallback to AgentRouter base URL')
        const arResp = await fetch(new URL(arPathOrRoot(req), AR_BASE).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AR_KEY}`,
          },
          body: JSON.stringify(req.body),
          signal: undefined,
        })

        const arContentType = (arResp.headers.get('content-type') || '').toLowerCase()
        if (arContentType.includes('application/json')) {
          const data = await arResp.json()
          return res.status(arResp.status).json(data)
        }
        const arText = await arResp.text()
        console.error('[chat] AgentRouter fallback returned non-JSON', { status: arResp.status, arContentType, snippet: arText.slice(0, 800) })
        return res.status(502).json({ error: 'AgentRouter fallback returned non-JSON', upstreamStatus: arResp.status, contentType: arContentType })
      } catch (e) {
        console.error('[chat] AgentRouter fallback failed', e?.message || e)
        // Fall through to return original upstream info below
      }
    }

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

// Helper: determine a sensible path to call on AgentRouter if callers passed a root URL.
function arPathOrRoot(req) {
  // If the incoming request body looks like a messages call, use '/v1/messages' as a common AgentRouter endpoint fallback.
  // Otherwise, call root.
  try {
    if (req && req.body && req.body.messages) return '/v1/messages'
  } catch (e) {}
  return '/'
}

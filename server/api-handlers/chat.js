// Vercel Serverless Function — /api/chat
// Proxies to the configured chat bot or proxy. Adds debug logging and
// guards to help diagnose upstream (WAF / HTML) responses.

function getBotChatUrl() {
  return process.env.CHAT_PROXY_URL || process.env.BOT_CHAT_URL || process.env.CHAT_BASE_URL || ''
}

function normalizeBotChatUrl(rawUrl) {
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : ''
  if (!url) return ''
  if (/^https:\/\/[a-z0-9.-]+/i.test(url)) return url
  // Bare hostnames are treated as https. Any other scheme (http, file, etc.)
  // is rejected to avoid mixed-content and SSRF-style surprises.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return ''
  return `https://${url}`
}

function resolveBotChatUrl(rawUrl) {
  const normalized = normalizeBotChatUrl(rawUrl)
  if (!normalized) return ''
  const parsed = new URL(normalized)
  if (!parsed.pathname || parsed.pathname === '/') {
    parsed.pathname = '/api/chat'
  }
  return parsed.toString()
}

function parseJsonBody(body) {
  if (!body) return {}
  if (typeof body === 'string') {
    try { return JSON.parse(body) } catch { return { raw: body } }
  }
  if (typeof body === 'object') return body
  return { raw: String(body) }
}

function extractReplyText(payload) {
  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    return trimmed ? trimmed : null
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const candidates = [
    payload.reply,
    payload.message,
    payload.text,
    payload.error,
    payload.content,
    payload.output,
    payload.response,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    if (Array.isArray(candidate)) {
      const flattened = candidate
        .map((item) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') {
            if (typeof item.text === 'string') return item.text
            if (typeof item.content === 'string') return item.content
            if (typeof item.message === 'string') return item.message
          }
          return ''
        })
        .filter(Boolean)
        .join('\n')
      if (flattened.trim()) return flattened.trim()
    }
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const firstChoice = Array.isArray(candidate?.choices) ? candidate.choices[0] : undefined
      const content = firstChoice?.message?.content
      if (typeof content === 'string' && content.trim()) return content.trim()
      if (Array.isArray(content)) {
        const text = content.map((item) => (typeof item === 'string' ? item : item?.text || '')).join('\n')
        if (text.trim()) return text.trim()
      }
      if (Array.isArray(candidate?.content)) {
        const text = candidate.content.map((item) => (typeof item === 'string' ? item : item?.text || '')).join('\n')
        if (text.trim()) return text.trim()
      }
    }
  }

  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Cap the body size so the open proxy can't be used to push huge payloads
  // at the upstream bot (or at this function's memory).
  const rawBody = req.body
  const bodySize = typeof rawBody === 'string'
    ? Buffer.byteLength(rawBody)
    : (req.headers['content-length'] ? Number(req.headers['content-length']) : 0)
  if (Number.isFinite(bodySize) && bodySize > 100_000) {
    return res.status(413).json({ error: 'Request body too large' })
  }

  const requestBody = parseJsonBody(req.body)

  const BOT_CHAT_URL = resolveBotChatUrl(getBotChatUrl())

  // Log configured upstream for quick triage in deployment logs
  console.log('[chat] BOT_CHAT_URL=', BOT_CHAT_URL)
  if (!BOT_CHAT_URL) {
    console.warn('[chat] no bot upstream configured; using fallback reply')
  }

  // If a real upstream is configured and looks like a proper URL, use it.
  // Otherwise, return a graceful fallback reply instead of failing the widget.
  const hasConfiguredUpstream = typeof BOT_CHAT_URL === 'string' && BOT_CHAT_URL.trim() && !BOT_CHAT_URL.includes('agentrouter.org')
  if (hasConfiguredUpstream) {
    let upstreamError = null
    try {
      const parsed = new URL(BOT_CHAT_URL)
      const hostHeader = (req.headers.host || '').split(':')[0]
      if (parsed.hostname === hostHeader) {
        console.error('[chat] Refusing to proxy to same host (possible misconfiguration)', parsed.hostname)
        return res.status(500).json({ error: 'Proxy misconfiguration: BOT_CHAT_URL points to this host' })
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      const upstream = await fetch(parsed.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-forwarded-host': req.headers.host || '',
          'x-forwarded-for': req.headers['x-real-ip'] || req.socket?.remoteAddress || '',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const contentType = (upstream.headers.get('content-type') || '').toLowerCase()
      const responseText = await upstream.text()

      if (contentType.includes('application/json')) {
        try {
          const data = responseText ? JSON.parse(responseText) : {}
          const reply = extractReplyText(data)
          if (reply) {
            return res.status(upstream.status).json({ reply, raw: data })
          }
          upstreamError = new Error('Upstream JSON did not include a reply payload')
        } catch (parseErr) {
          upstreamError = parseErr
          console.warn('[chat] Upstream returned invalid JSON', parseErr?.message || parseErr)
        }
      } else {
        const snippet = responseText ? responseText.slice(0, 300) : ''
        upstreamError = new Error(`Upstream returned non-JSON (${contentType || 'unknown'}): ${snippet}`)
        console.warn('[chat] Upstream returned non-JSON', { status: upstream.status, contentType, snippet })
      }
    } catch (err) {
      const isAbort = err && err.name === 'AbortError'
      upstreamError = isAbort ? new Error('Upstream request timed out after 10s') : err
      console.warn('[chat] Upstream request failed', upstreamError?.message || upstreamError)
    }

    // The configured upstream is down or returned something unusable — surface
    // a real error instead of masking it, so failures are visible in logs and
    // the widget can show an offline state rather than a fake bot reply.
    const status = upstreamError && upstreamError.status ? upstreamError.status : 502
    return res.status(status).json({
      error: 'The chat service is temporarily unavailable.',
      details: upstreamError?.message ? String(upstreamError.message).slice(0, 400) : 'Unknown upstream error',
    })
  }

  const fallbackReply = 'Hi! I can help you find verified rentals, explain the platform, or guide you through listing a property. Tell me what you need and I’ll help from there.'
  return res.status(200).json({ reply: fallbackReply, fallback: true })
}

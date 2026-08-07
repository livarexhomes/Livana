function getEnv(key) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body))
      } catch {
        return resolve(null)
      }
    }
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body)
    }
    if (typeof req.json === 'function') {
      req.json().then(resolve).catch(() => resolve(null))
      return
    }
    let raw = ''
    req.on('data', (chunk) => {
      if (typeof chunk === 'string') raw += chunk
      else if (chunk instanceof Uint8Array) raw += new TextDecoder().decode(chunk)
      else raw += String(chunk)
    })
    req.on('end', () => {
      if (!raw) return resolve(null)
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body || typeof body.email !== 'string') return sendJson(res, 400, { error: 'Invalid request body' })

  const email = String(body.email).trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return sendJson(res, 400, { error: 'A valid email is required' })
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 200) : ''

  // Resolve the effective Resend key + sender (stored settings win, env falls back).
  const { resolveEmailConfig } = await import('./lib/email-template.js')
  const cfg = await resolveEmailConfig(process.env)
  const apiKey = cfg.apiKey || getEnv('RESEND_API_KEY') || ''
  const from = cfg.from || getEnv('RESEND_FROM') || 'Livarex Homes <noreply@livarex.com.ng>'

  // No API key configured → nothing to send (registration flow still works).
  if (!apiKey) {
    return sendJson(res, 200, { success: true, skipped: true })
  }

  try {
    const { renderWelcomeEmail } = await import('./lib/email-template.js')
    const html = renderWelcomeEmail({ name: fullName })
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'Welcome to Livarex 🎉',
        html,
      }),
    })

    if (!resendResp.ok) {
      const payload = await resendResp.json().catch(() => null)
      // Non-fatal — the account was already created.
      console.warn('[send-confirmation] Resend error:', payload?.message || resendResp.status)
      return sendJson(res, 200, { success: true, emailError: payload?.message || 'Email send failed' })
    }

    return sendJson(res, 200, { success: true })
  } catch (error) {
    console.warn('[send-confirmation] error:', error)
    return sendJson(res, 200, { success: true, emailError: String(error) })
  }
}

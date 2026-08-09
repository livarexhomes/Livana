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
  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body || typeof body.email !== 'string') return sendJson(res, 400, { error: 'Invalid request body' })

  const email = String(body.email).trim()
  if (!email) return sendJson(res, 400, { error: 'Email is required' })

  // 1) Ask Supabase to generate a reset token + recovery link (no email is sent
  //    by Supabase — we build and send our own branded email below).
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, { error: 'Missing Supabase environment variables' })
  }

  let resetUrl = null
  try {
    const tokenResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'recovery', email }),
    })
    const tokenData = await tokenResp.json().catch(() => null)
    if (tokenResp.ok && tokenData?.action_link) {
      resetUrl = tokenData.action_link
    } else {
      // User may not exist; fail gracefully but still return 200 so we don't
      // reveal which emails have accounts.
      console.warn('[send-password-reset] generate_link failed:', tokenData?.msg || tokenData?.error_description || tokenData?.message || tokenResp.status)
    }
  } catch (err) {
    console.warn('[send-password-reset] generate_link error:', err)
  }

  // If we couldn't generate a link, still attempt Supabase's own recovery email
  // as a fallback (it uses the project's email provider).
  if (!resetUrl) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          apikey: getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })
    } catch (err) {
      // ignore — best-effort
    }
  }

  // 2) Send the branded reset email via Resend when we have a link.
  if (resetUrl) {
    // If Resend fails (e.g. account in testing mode / unverified sender),
    // fall back to Supabase's own recovery email so the user can always reset.
    let sent = false
    try {
      const { renderPasswordResetEmail, resolveEmailConfig } = await import('./lib/email-template.js')
      // allowDisabled: a user must ALWAYS be able to reset their password, even
      // if the "Enable Email Notifications" marketing toggle is off.
      const cfg = await resolveEmailConfig(process.env, { allowDisabled: true })
      const apiKey = cfg.apiKey || getEnv('RESEND_API_KEY') || ''
      const from = cfg.from || getEnv('RESEND_FROM') || 'Livarex Homes <noreply@livarex.com.ng>'

      if (!apiKey) {
        // Do NOT silently skip. Password reset is security-critical — fail
        // loudly so the misconfiguration is visible instead of pretending the
        // email was sent.
        console.error('[send-password-reset] RESEND_API_KEY is not configured (env or Admin → Settings → Email)')
      } else {
        const html = renderPasswordResetEmail({ resetUrl })
        const resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: email,
            subject: 'Reset your Livarex password',
            html,
          }),
        })
        if (resendResp.ok) {
          sent = true
        } else {
          const payload = await resendResp.json().catch(() => null)
          console.error('[send-password-reset] Resend error:', payload?.message || resendResp.status)
        }
      }
    } catch (err) {
      console.error('[send-password-reset] Resend error:', err)
    }

    // Resend didn't deliver → try Supabase's own recovery email as a fallback.
    if (!sent) {
      try {
        const recoverResp = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
          method: 'POST',
          headers: {
            apikey: getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })
        if (!recoverResp.ok) {
          const payload = await recoverResp.json().catch(() => null)
          console.error('[send-password-reset] Supabase recover fallback failed:', payload?.msg || payload?.error_description || recoverResp.status)
        }
      } catch (err) {
        console.error('[send-password-reset] Supabase recover fallback error:', err)
      }
    }
  }

  // Always return success — never reveal whether an account exists.
  return sendJson(res, 200, { success: true })
}

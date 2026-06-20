/**
 * Input validation for the send-confirmation endpoint.
 *
 * Kept in its own module so it can be unit-tested without spinning up Express
 * or touching Supabase/Resend.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LEN = 254   // RFC 5321
const MAX_NAME_LEN  = 200

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  ok: true
  email: string
  fullName: string
  redirectTo: string | undefined
}

export interface ValidationFailure {
  ok: false
  errors: ValidationError[]
}

/**
 * Validates and sanitises the body of POST /api/email/send-confirmation.
 *
 * `allowedOrigin` is the value of APP_URL (e.g. "https://app.livana.ng").
 * When provided, `redirectTo` must be a path on that origin.
 * When omitted, `redirectTo` is ignored and the caller should fall back to
 * the default callback path.
 */
export function validateConfirmationInput(
  body: unknown,
  allowedOrigin: string | undefined,
): ValidationResult | ValidationFailure {
  const errors: ValidationError[] = []

  if (typeof body !== 'object' || body === null) {
    return { ok: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] }
  }

  const { email, fullName, redirectTo } = body as Record<string, unknown>

  // ── email ──────────────────────────────────────────────────────────────────
  if (typeof email !== 'string' || email.trim() === '') {
    errors.push({ field: 'email', message: 'email is required' })
  } else if (email.length > MAX_EMAIL_LEN) {
    errors.push({ field: 'email', message: `email must be ≤ ${MAX_EMAIL_LEN} characters` })
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.push({ field: 'email', message: 'email is not a valid address' })
  }

  // ── fullName ───────────────────────────────────────────────────────────────
  if (typeof fullName !== 'string' || fullName.trim() === '') {
    errors.push({ field: 'fullName', message: 'fullName is required' })
  } else if (fullName.length > MAX_NAME_LEN) {
    errors.push({ field: 'fullName', message: `fullName must be ≤ ${MAX_NAME_LEN} characters` })
  }

  // ── redirectTo (optional) — must be a path on the allowed origin ───────────
  let safeRedirectTo: string | undefined
  if (redirectTo !== undefined && redirectTo !== null && redirectTo !== '') {
    if (typeof redirectTo !== 'string') {
      errors.push({ field: 'redirectTo', message: 'redirectTo must be a string' })
    } else if (!allowedOrigin) {
      // APP_URL not configured — silently ignore the caller-supplied value;
      // the route will fall back to the default callback path.
      safeRedirectTo = undefined
    } else {
      try {
        const parsed = new URL(redirectTo, allowedOrigin)
        if (parsed.origin !== new URL(allowedOrigin).origin) {
          errors.push({
            field: 'redirectTo',
            message: 'redirectTo must be a path on the application origin',
          })
        } else {
          safeRedirectTo = parsed.pathname + parsed.search + parsed.hash
        }
      } catch {
        errors.push({ field: 'redirectTo', message: 'redirectTo is not a valid URL or path' })
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    email: (email as string).trim().toLowerCase(),
    fullName: (fullName as string).trim(),
    redirectTo: safeRedirectTo,
  }
}

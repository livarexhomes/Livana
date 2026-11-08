
import { useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { ArrowRight, Eye, EyeOff, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import SEO from '../components/SEO'
import { trackSiteInteraction } from '../lib/site-analytics'

const inputClass = 'w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700'

export default function RegisterPage() {
  const [, navigate] = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  function getSignupErrorMessage(authError: {
    message?: string
    code?: string
    status?: number
    name?: string
  } | null) {
    const rawMessage = authError?.message?.trim() ?? ''
    const haystack = `${authError?.code ?? ''} ${authError?.name ?? ''} ${rawMessage}`.toLowerCase()

    if (haystack.includes('already') || haystack.includes('registered') || haystack.includes('exists') || haystack.includes('user_already_exists')) {
      return 'An account with this email already exists. Sign in instead or use “Forgot password?” to recover it.'
    }
    if (haystack.includes('password') && (haystack.includes('weak') || haystack.includes('short') || haystack.includes('length'))) {
      return 'Choose a stronger password with at least 8 characters.'
    }
    if (haystack.includes('rate') || haystack.includes('too many') || haystack.includes('email_send')) {
      return 'Too many signup attempts were made recently. Please wait a few minutes and try again.'
    }
    if (haystack.includes('signup') && (haystack.includes('disabled') || haystack.includes('not allowed'))) {
      return 'New account registration is temporarily unavailable. Please try again later.'
    }
    if (haystack.includes('database error') || haystack.includes('trigger') || (authError?.status ?? 0) >= 500) {
      return 'We could not finish creating your account because of a server configuration issue. Please try again shortly.'
    }
    if (haystack.includes('invalid') && haystack.includes('email')) {
      return 'Enter a valid email address.'
    }
    return rawMessage || 'Sign up failed. Please check your details and try again.'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    trackSiteInteraction('register_attempt').catch(error => {
      console.warn('[site-analytics] registration interaction tracking failed:', error)
    })
    if (!isSupabaseConfigured()) { setError('Platform is not configured yet.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      const signupPayload = {
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), phone: phone.trim() || null },
          emailRedirectTo: `${window.location.origin}/auth/callback?role=tenant`,
        },
      }

      let signupResult = await supabase.auth.signUp(signupPayload)

      // Supabase can return a transient 500/AuthRetryableFetchError even
      // though Auth is still processing the request. Retry once before
      // showing a server-configuration error. If the first request created
      // the account and only lost its response, the retry's
      // "already registered" result is handled normally below.
      const retryableSignupError = signupResult.error
        && (signupResult.error.status === 500 || signupResult.error.name === 'AuthRetryableFetchError')
      if (retryableSignupError) {
        await new Promise(resolve => window.setTimeout(resolve, 900))
        signupResult = await supabase.auth.signUp(signupPayload)
      }

      let { data, error: signUpError } = signupResult

      // If the first request timed out after Auth created the user, the
      // retry can legitimately return "already registered". Recover the
      // session with the password the visitor just submitted and continue
      // through the same tenant-profile path as a normal signup.
      const retryCreatedTheAccount = retryableSignupError
        && signUpError
        && (
          signUpError.code === 'user_already_exists'
          || /already registered|already exists|user already exists/i.test(signUpError.message ?? '')
        )
      if (retryCreatedTheAccount) {
        const recovered = await supabase.auth.signInWithPassword({
          email: signupPayload.email,
          password: signupPayload.password,
        })
        if (!recovered.error && recovered.data.user) {
          data = { user: recovered.data.user, session: recovered.data.session }
          signUpError = null
        }
      }

      if (signUpError || !data.user) {
        console.warn('[registration] Supabase signup failed', {
          code: signUpError?.code,
          name: signUpError?.name,
          status: signUpError?.status,
          retried: retryableSignupError,
          recovered: Boolean(retryCreatedTheAccount && !signUpError),
          message: signUpError?.message,
        })
        setError(getSignupErrorMessage(signUpError))
        return
      }

      // This is a welcome email. Supabase remains responsible for its own
      // email-confirmation link when confirmation is enabled.
      try {
        await fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), fullName: fullName.trim() }),
        })
      } catch (_) {
        // Non-fatal — account creation does not depend on the welcome email.
      }

      // With email confirmation enabled Supabase returns a user but no
      // session. Do not immediately sign in: that always fails with
      // "Email not confirmed" and hides the successful signup.
      if (!data.session) {
        setEmailSent(true)
        return
      }

      const { error: profileError } = await supabase.from('tenants').upsert({
        user_id:  data.user.id,
        full_name: fullName.trim(),
        phone:    phone.trim() || null,
        email:    email.trim() || null,
        provider: 'email',
      }, { onConflict: 'user_id', ignoreDuplicates: false })

      if (profileError && !profileError.message.includes('duplicate')) {
        console.error('[registration] tenant profile upsert failed', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
        })
        setError('Your account was created, but we could not save your profile yet. Please sign in and try again.')
        return
      }

      navigate('/user/complete-profile')
    } catch (unknownError) {
      const unexpectedError = unknownError instanceof Error
        ? { name: unknownError.name, message: unknownError.message }
        : { message: String(unknownError) }
      console.error('[registration] unexpected error', unexpectedError)
      setError('We could not reach the account service. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    if (!isSupabaseConfigured()) { setError('Platform is not configured yet.'); return }
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?role=tenant` },
    })
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-slate-50 px-5 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Mail aria-hidden="true" className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-950">Check your email</h1>
          <p className="mb-2 text-sm text-slate-600">We sent a confirmation link to</p>
          <p className="mb-6 break-all font-semibold text-slate-900">{email}</p>
          <p className="mb-8 text-sm leading-6 text-slate-500">
            Click the link in the email to activate your account. Once confirmed, come back and sign in.
          </p>
          <Link
            href="/login"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Go to sign in
          </Link>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Didn't receive it? Check your spam folder or{' '}
            <button onClick={() => setEmailSent(false)} className="rounded-sm font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">try again</button>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen min-h-[100dvh] bg-slate-50 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:gap-3 lg:p-3">
      <SEO
        title="Create a Free Account — Find Verified Homes in Nigeria"
        description="Sign up to Livarex and start browsing verified homes, apartments and commercial properties for rent and lease across Nigeria. No agent fees."
        url="/register"
        noIndex={true}
      />
      {/* ── Left: Form ── */}
      <main className="flex min-w-0 flex-col justify-center bg-white px-5 py-8 sm:px-10 sm:py-12 lg:rounded-[28px] xl:px-16">
        <div className="mx-auto w-full max-w-[440px]">
          {/* Logo */}
          <Link href="/" className="mb-9 inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4">
            <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto" />
          </Link>

          {/* Heading */}
          <div className="mb-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Create an account</p>
            <h1 className="mb-2 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
              Find your next home
            </h1>
            <p className="text-sm leading-6 text-slate-600">Create a free account to explore verified homes and save the ones you love.</p>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="mb-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="mb-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">or sign up with email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="register-full-name" className={labelClass}>Full name <span className="text-blue-700">*</span></label>
                <input
                  id="register-full-name"
                  type="text"
                  required
                  placeholder="Adebayo Okafor"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="register-phone" className={labelClass}>Phone <span className="text-blue-700">*</span></label>
                <input
                  id="register-phone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="tel"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className={labelClass}>Email address <span className="text-blue-700">*</span></label>
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="register-password" className={labelClass}>Password <span className="text-blue-700">*</span></label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  aria-controls="register-password"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Use at least 8 characters.</p>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
              {loading ? 'Creating account…' : 'Create free account'}
              {!loading && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="rounded-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Sign in</Link>
          </p>

          <p className="mt-3 text-center text-xs text-slate-500">
            Are you a landlord?{' '}
            <Link href="/landlord/register" className="rounded-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Apply here</Link>
          </p>
        </div>
      </main>

      {/* ── Right: Brand panel (hidden on mobile) ── */}
      <aside className="relative hidden min-h-[calc(100vh-1.5rem)] flex-col justify-between overflow-hidden rounded-[28px] bg-blue-950 p-10 lg:flex xl:p-14">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1400&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/65 via-blue-950/80 to-slate-950/95" />

        {/* Top */}
        <div className="relative z-10">
          <div className="mb-10 inline-flex items-center rounded-xl bg-white px-3 py-2">
            <img src="/livarex-logo.png" alt="LIVAREX" className="h-8 w-auto" />
          </div>

          <h2 className="mb-4 max-w-md text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
            Find a place to call home.
          </h2>
          <p className="max-w-sm text-sm leading-6 text-slate-200">
            Explore reviewed listings across Lagos, Abuja, Port Harcourt and more, then save the homes that feel right.
          </p>
        </div>


        {/* Bottom: perks */}
        <div className="relative z-10 space-y-3 rounded-2xl border border-white/15 bg-slate-950/35 p-5 backdrop-blur-sm">
          {['Free to browse — no sign-up cost', 'Verified properties only', 'Secure inspection requests'].map(item => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-300" />
              <span className="text-sm text-slate-100">{item}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

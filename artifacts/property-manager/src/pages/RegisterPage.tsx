import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '../lib/supabase'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) { setError('Platform is not configured yet.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: phone || null } },
    })
    if (signUpError || !data.user) {
      console.error('Sign up error:', signUpError)
      setError(signUpError?.message ?? 'Sign up failed')
      setLoading(false)
      return
    }

    if (!data.session) {
      // Supabase built-in email is disabled — send via Resend through our API.
      try {
        const res = await fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fullName }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          console.error('[send-confirmation] API error:', res.status, body)
          setError(`Failed to send confirmation email (${res.status}): ${body.detail ?? body.error ?? 'unknown error'}`)
          setLoading(false)
          return
        }
      } catch (err) {
        console.error('[send-confirmation] Network error:', err)
        setError('Could not reach the email service. Please try again.')
        setLoading(false)
        return
      }
      setEmailSent(true)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('tenants').upsert({
      user_id:  data.user.id,
      full_name: fullName,
      phone:    phone || null,
      email:    email || null,
      provider: 'email',
    }, { onConflict: 'user_id', ignoreDuplicates: false })

    if (profileError && !profileError.message.includes('duplicate')) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    navigate('/user')
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
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Check your email</h1>
          <p className="text-gray-500 mb-2">We sent a confirmation link to</p>
          <p className="font-semibold text-gray-900 mb-6">{email}</p>
          <p className="text-sm text-gray-400 mb-8">
            Click the link in the email to activate your account. Once confirmed, come back and sign in.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-blue-600/25"
          >
            Go to Sign In
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Didn't receive it? Check your spam folder or{' '}
            <button onClick={() => setEmailSent(false)} className="text-blue-600 hover:underline">try again</button>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left: Form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center mb-10">
            <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto" />
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight mb-2">
              Find your next home
            </h1>
            <p className="text-gray-500 text-base">Create a free LIVAREX account — no agent fees, ever.</p>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-sm font-semibold text-gray-700 transition-all disabled:opacity-60 shadow-sm mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Full name *</label>
                <input
                  type="text"
                  required
                  placeholder="Adebayo Okafor"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Phone <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <input
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Email address *</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/25 text-sm mt-2"
            >
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-3">
            Are you a landlord?{' '}
            <Link href="/partners" className="text-blue-600 hover:text-blue-700 font-semibold">Apply here</Link>
          </p>
        </div>
      </div>

      {/* ── Right: Brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] bg-gray-950 flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1400&q=80"
          alt="Nigerian home"
          className="absolute inset-0 w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 via-gray-950/90 to-gray-950" />

        {/* Top */}
        <div className="relative z-10">
          <div className="mb-14">
            <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto" />
          </div>

          <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Join 10,000+<br />Nigerians who<br />found home.
          </h2>
          <p className="text-gray-400 text-base leading-relaxed max-w-xs">
            Browse verified listings across Lagos, Abuja, Port Harcourt and more — all for free.
          </p>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 my-10 bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-4 h-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            "Found my 3-bedroom in Lekki within a week. The landlord was verified and I moved in without paying any agent fees. LIVAREX is a game changer."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">AO</div>
            <div>
              <p className="text-sm font-semibold text-white">Adebayo O.</p>
              <p className="text-xs text-gray-500">Tenant · Lagos</p>
            </div>
          </div>
        </div>

        {/* Bottom: perks */}
        <div className="relative z-10 space-y-3">
          {['Free to browse — no hidden fees', 'Verified properties only', 'Secure inspection requests'].map(item => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-sm text-gray-400">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

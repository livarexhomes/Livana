import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Eye, EyeOff, ShieldCheck, Building2, Users, Mail } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import type { User } from '@supabase/supabase-js'

export default function LoginPage() {
  const [, navigate] = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState('')

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) { setForgotError('Platform is not configured yet.'); return }
    setForgotLoading(true)
    setForgotError('')
    try {
      const res = await fetch('/api/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setForgotError(body.error ?? 'Something went wrong. Please try again.')
        setForgotLoading(false)
        return
      }
    } catch {
      setForgotError('Could not reach the email service. Please try again.')
      setForgotLoading(false)
      return
    }
    setForgotSent(true)
    setForgotLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) { setError('Platform is not configured yet.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }

    const user: User = data.user
    if (isAdminUser(user)) { navigate('/admin'); return }

    const { data: landlord } = await supabase.from('landlords').select('status').eq('user_id', user.id).single() as { data: { status: string } | null }
    if (landlord) {
      if (landlord.status === 'pending') { navigate('/landlord/pending'); return }
      if (landlord.status === 'rejected') { navigate('/landlord/rejected'); return }
      navigate('/landlord')
      return
    }

    let { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
    if (!tenant) {
      const meta = user.user_metadata ?? {}
      await supabase.from('tenants').insert({
        user_id: user.id,
        full_name: meta.full_name ?? user.email?.split('@')[0] ?? 'User',
        phone: meta.phone ?? null,
      })
    }

    navigate('/user')
  }

  async function handleGoogle() {
    if (!isSupabaseConfigured()) { setError('Platform is not configured yet.'); return }
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
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
              Welcome back
            </h1>
            <p className="text-gray-500 text-base">Sign in to your LIVAREX account to continue.</p>
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

          {/* Forgot password view */}
          {forgotMode ? (
            forgotSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
                  <Mail className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
                <p className="text-sm text-gray-500 mb-1">We sent a reset link to</p>
                <p className="font-semibold text-gray-900 mb-5">{forgotEmail}</p>
                <p className="text-xs text-gray-400 mb-6">Click the link in the email to set a new password. The link expires in 1 hour.</p>
                <button
                  onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail('') }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Your email address</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                </div>

                {forgotError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    {forgotError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/25 text-sm"
                >
                  {forgotLoading ? 'Sending…' : 'Send reset link'}
                </button>

                <p className="text-center text-sm text-gray-500">
                  <button type="button" onClick={() => { setForgotMode(false); setForgotError('') }} className="text-blue-600 hover:text-blue-700 font-semibold">
                    Back to sign in
                  </button>
                </p>
              </form>
            )
          ) : (
            <>
              {/* Sign in form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Email address</label>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">Password</label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotError('') }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
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
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Don't have an account?{' '}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">Create one free</Link>
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Right: Brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[52%] bg-gray-950 flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=80"
          alt="Modern home"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-gray-950/80 to-gray-950" />

        {/* Top: logo + tagline */}
        <div className="relative z-10">
          <div className="mb-16">
            <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto" />
          </div>

          <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Nigeria's most<br />trusted property<br />platform.
          </h2>
          <p className="text-gray-400 text-base leading-relaxed max-w-xs">
            Browse verified listings, contact landlords directly, and move in faster — no agent fees.
          </p>
        </div>

        {/* Middle: trust badges */}
        <div className="relative z-10 space-y-4 my-10">
          {[
            { icon: ShieldCheck, label: 'Verified landlords only', desc: 'Every landlord reviewed & approved' },
            { icon: Building2, label: 'Real listings, real prices', desc: 'No fake or inflated listings' },
            { icon: Users, label: 'Direct contact', desc: 'WhatsApp landlords in one tap' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: social proof */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { num: '902+', label: 'Properties' },
            { num: '319+', label: 'Landlords' },
            { num: '₦0', label: 'Agent fees' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-center">
              <p className="text-xl font-extrabold text-white">{s.num}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

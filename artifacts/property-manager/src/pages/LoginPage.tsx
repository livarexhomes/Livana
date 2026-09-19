
import * as React from 'react'
import { useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { Eye, EyeOff, ShieldCheck, Building2, Users, ArrowRight, Loader2 } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import type { User } from '@supabase/supabase-js'
import SEO from '../components/SEO'

export default function LoginPage() {
  const [, navigate] = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

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
      if (landlord.status === 'not_submitted') { navigate('/landlord/onboarding'); return }
      if (landlord.status === 'pending')       { navigate('/landlord/pending');    return }
      if (landlord.status === 'rejected')      { navigate('/landlord/rejected');   return }
      if (landlord.status === 'suspended')     { navigate('/landlord/suspended');  return }
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
      options: { redirectTo: `${window.location.origin}/auth/callback?role=tenant` },
    })
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex bg-[#f6f8fc] p-0 lg:gap-3 lg:p-3">
      <SEO
        title="Sign In to Livarex — Your Verified Property Account"
        description="Sign in to your Livarex account to browse verified properties, save listings, and book inspections across Nigeria."
        url="/login"
        noIndex={true}
      />
      {/* ── Left: Form ── */}
      <div className="min-w-0 flex-1 flex flex-col justify-center bg-white px-6 py-10 sm:px-12 sm:py-14 lg:rounded-[28px] lg:px-10 xl:px-16">
        <div className="max-w-[420px] w-full mx-auto">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center mb-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4">
            <img src="/livarex-logo-transparent.png" alt="LIVAREX" className="h-16 w-auto max-w-[180px] object-contain" />
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-[44px] font-bold text-slate-950 leading-[1.1] tracking-[-0.045em] mb-3">
              Welcome back
            </h1>
            <p className="text-slate-500 text-[15px] leading-7">Sign in to your LIVAREX account to continue.</p>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-sm font-semibold text-gray-700 transition-all disabled:opacity-60 shadow-sm mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait"
          >
            <svg aria-hidden="true" className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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

          {/* Sign in form */}
          <>
            <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading}>
                <div>
                  <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>
                  <input
                    type="email"
                    id="login-email"
                    name="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">Password</label>
                    <Link
                      href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                      className="rounded-sm text-xs text-blue-600 hover:text-blue-700 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="login-password"
                      name="password"
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3.5 pr-12 rounded-xl border border-slate-200 bg-slate-50/70 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      aria-controls="login-password"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-12 w-full items-center justify-center gap-2.5 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20 text-sm mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
                  {loading ? 'Signing in…' : 'Sign in'}
                  {!loading && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Don't have an account?{' '}
                <Link href="/register" className="rounded-sm text-blue-600 hover:text-blue-700 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Create one free</Link>
              </p>
            </>
        </div>
      </div>

      {/* ── Right: Brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] shrink-0 bg-slate-950 flex-col justify-between gap-8 rounded-[28px] p-9 xl:p-12 relative overflow-hidden">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=80"
          alt="Modern home"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.3)_0%,rgba(2,6,23,0.55)_35%,rgba(2,6,23,0.96)_75%)]" />

        {/* Top: logo + tagline */}
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 mb-10">
            <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto max-w-[150px] object-contain" />
          </div>

          <h2 className="text-4xl xl:text-[52px] font-semibold text-white leading-[1.08] tracking-[-0.045em] mb-5">
            Nigeria's most<br />trusted property<br />platform.
          </h2>
          <p className="text-slate-200 text-sm xl:text-base leading-7 max-w-sm">
            Browse verified listings, submit inspection requests, and move in faster — every landlord screened, every listing reviewed.
          </p>
        </div>

        {/* Middle: trust badges */}
        <div className="relative z-10 space-y-5 rounded-2xl border border-white/15 bg-white/[0.04] p-5 xl:p-6 backdrop-blur-md">
          {[
            { icon: ShieldCheck, label: 'Verified properties only', desc: 'Every listing reviewed by Livarex' },
            { icon: Building2, label: 'Real listings, real prices', desc: 'No fake or inflated listings' },
            { icon: Users, label: 'Contact through Livarex', desc: 'Request inspections and enquiries securely' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs leading-5 text-slate-300">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: trust signals */}
        <div className="relative z-10 grid grid-cols-3 gap-2 border-t border-white/15 pt-6">
          {[
            { icon: '✓', label: 'Verified properties' },
            { icon: '✓', label: 'Screened landlords' },
            { icon: '✓', label: 'Managed inspections' },
          ].map(s => (
            <div key={s.label} className="px-1 py-1 text-center">
              <p className="text-base font-extrabold text-blue-400">{s.icon}</p>
              <p className="text-[11px] text-slate-300 mt-2 leading-5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

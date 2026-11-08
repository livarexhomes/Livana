
import { useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { Eye, EyeOff, Building2, CheckCircle2 } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '../../lib/supabase'
import { trackSiteInteraction } from '../../lib/site-analytics'

const FIELD = 'w-full min-h-12 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors'

export default function LandlordRegisterPage() {
  const [, navigate] = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '', email: '', whatsapp: '', password: '', city: '', bio: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    trackSiteInteraction('register_attempt').catch(error => {
      console.warn('[site-analytics] landlord registration tracking failed:', error)
    })
    if (!isSupabaseConfigured()) { setError('Platform not configured.'); return }
    setLoading(true); setError('')

    // Create + auto-confirm the account server-side so the landlord gets
    // a real session immediately — no email confirmation gate.
    try {
      const res = await fetch('/api/landlord-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     form.email,
          password:  form.password,
          full_name: form.fullName,
          whatsapp:  form.whatsapp,
          city:      form.city  || null,
          bio:       form.bio   || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { setError(body.error ?? `Registration failed (${res.status})`); setLoading(false); return }
    } catch {
      setError('Could not reach the server. Please try again.')
      setLoading(false); return
    }

    // Sign in immediately — account is confirmed server-side
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    if (signInError) { setError(signInError.message); setLoading(false); return }

    navigate('/landlord/onboarding')
  }

  return (
    <div className="min-h-dvh flex bg-slate-50 p-0 lg:gap-3 lg:p-3">
      <div className="min-w-0 flex-1 flex flex-col justify-center bg-white px-5 py-8 sm:px-10 sm:py-12 lg:rounded-[28px] lg:px-12 xl:px-16">
        <div className="max-w-[500px] w-full mx-auto">
          <Link href="/" className="inline-flex items-center mb-8 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4">
            <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto" />
          </Link>
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full mb-4">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Partner Programme</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 leading-tight tracking-tight mb-2">
              List your property<br />with LIVAREX
            </h1>
            <p className="max-w-lg text-slate-600 text-sm sm:text-base leading-7">Join our network of verified landlords. Livarex coordinates tenants, inspections and communication on your behalf.</p>
          </div>
          {error && (
            <div role="alert" className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
            <div>
              <label htmlFor="landlord-full-name" className="block text-sm font-medium text-slate-700 mb-1.5">Full name *</label>
              <input id="landlord-full-name" required type="text" autoComplete="name" placeholder="Chioma Okafor" value={form.fullName} onChange={e => set('fullName', e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="landlord-whatsapp" className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp number *</label>
              <input id="landlord-whatsapp" required type="tel" autoComplete="tel" placeholder="+234 800 000 0000" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} className={FIELD} />
              <p className="text-xs text-slate-500 mt-1.5">Tenants will contact you directly on this number.</p>
            </div>
            <div>
              <label htmlFor="landlord-email" className="block text-sm font-medium text-slate-700 mb-1.5">Email address *</label>
              <input id="landlord-email" required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="landlord-password" className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
              <div className="relative">
                <input id="landlord-password" required type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={e => set('password', e.target.value)} className={FIELD + ' pr-12'} />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} aria-controls="landlord-password" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="landlord-city" className="block text-sm font-medium text-slate-700 mb-1.5">City / State <span className="text-slate-500 font-normal">(optional)</span></label>
              <input id="landlord-city" type="text" autoComplete="address-level2" placeholder="e.g. Lagos" value={form.city} onChange={e => set('city', e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="landlord-bio" className="block text-sm font-medium text-slate-700 mb-1.5">Short bio <span className="text-slate-500 font-normal">(optional)</span></label>
              <textarea id="landlord-bio" rows={3} placeholder="Tell tenants about yourself and your properties..." value={form.bio} onChange={e => set('bio', e.target.value)} className={FIELD + ' min-h-28 resize-y'} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full min-h-12 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/20 text-sm mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              {loading ? 'Creating account…' : 'Apply as a partner landlord'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have a landlord account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] bg-blue-950 flex-col justify-between gap-8 rounded-[28px] p-10 xl:p-14 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1400&q=80" alt="Nigerian property" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-blue-950/80 to-slate-950/95" />
        <div className="relative z-10">
          <div className="mb-10 inline-flex items-center rounded-xl bg-white px-3 py-2"><img src="/livarex-logo.png" alt="LIVAREX" className="h-8 w-auto" /></div>
          <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Reach thousands<br />of verified<br />tenants.
          </h2>
          <p className="text-gray-400 text-base leading-relaxed max-w-xs">
            List your properties on Nigeria's fastest-growing real estate platform and connect directly with serious tenants.
          </p>
        </div>
        <div className="relative z-10 my-10 bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-4 h-4 fill-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            "Listed my duplex on Monday, had 5 serious enquiries by Wednesday. The platform is professional and tenants trust it."
          </p>
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80"
              alt="Kunle A."
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-blue-500/60"
            />
            <div>
              <p className="text-sm font-semibold text-white">Kunle A.</p>
              <p className="text-xs text-gray-500">Landlord · Abuja</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 space-y-3">
          {[ 'Direct tenant contact via WhatsApp', 'Admin-verified for trust & safety', 'Reach Lagos, Abuja, PH and beyond'].map(item => (
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

import { useState } from 'react'
import { Link } from 'wouter'
import { CheckCircle2, Eye, EyeOff, Building2 } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '../lib/supabase'

const FIELD = 'w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all'

export default function LandlordRegisterPage() {
  const [step, setStep] = useState<'form' | 'verify' | 'success'>('form')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')

  const [form, setForm] = useState({
    fullName: '', email: '', whatsapp: '', password: '', city: '', bio: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) { setError('Platform not configured.'); return }
    setLoading(true); setError('')
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Sign up failed')
      setLoading(false); return
    }

    const { error: landlordError } = await supabase.from('landlords').insert({
      user_id: data.user.id,
      full_name: form.fullName,
      whatsapp: form.whatsapp,
      city: form.city || null,
      bio: form.bio || null,
      status: 'not_submitted',
      is_verified: false,
    })

    if (landlordError && !landlordError.message.includes('duplicate')) {
      setError(landlordError.message)
      setLoading(false); return
    }

    setSubmittedEmail(form.email)

    if (!data.session) {
      // Supabase built-in email is disabled — send via Resend through our API.
      try {
        const res = await fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, fullName: form.fullName }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          console.error('[send-confirmation] API error:', res.status, body)
          setError(`Failed to send confirmation email (${res.status}). Please try again.`)
          setLoading(false)
          return
        }
      } catch (err) {
        console.error('[send-confirmation] Network error:', err)
        setError('Could not reach the email service. Please try again.')
        setLoading(false)
        return
      }
      setStep('verify')
    } else {
      setStep('success')
    }

    setLoading(false)
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Check your email</h1>
          <p className="text-gray-500 mb-2">We sent a confirmation link to</p>
          <p className="font-semibold text-gray-900 mb-4">{submittedEmail}</p>
          <p className="text-sm text-gray-400 mb-8">
            Click the link in the email to verify your account. Once confirmed, our Admin team will review and approve your application.
          </p>
          <Link href="/" className="inline-flex items-center justify-center w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-blue-600/25">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Application submitted!</h1>
          <p className="text-gray-500 mb-8">
            Your landlord account is under review. Our team will verify your details and notify you once approved. You can then sign in and start listing your properties.
          </p>
          <Link href="/login" className="inline-flex items-center justify-center w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-blue-600/25">
            Go to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-white">
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="max-w-md w-full mx-auto">
          <Link href="/" className="inline-flex items-center mb-10">
            <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto" />
          </Link>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full mb-4">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Partner Programme</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight mb-2">
              List your property<br />with LIVAREX
            </h1>
            <p className="text-gray-500 text-base">Join our network of verified landlords. Tenants contact you directly — no agent fees.</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Full name *</label>
              <input required type="text" placeholder="Chioma Okafor" value={form.fullName} onChange={e => set('fullName', e.target.value)} className={FIELD} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">WhatsApp number *</label>
              <input required type="tel" placeholder="+234 800 000 0000" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} className={FIELD} />
              <p className="text-xs text-gray-400 mt-1.5">Tenants will contact you directly on this number.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Email address *</label>
              <input required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} className={FIELD} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Password *</label>
              <div className="relative">
                <input required type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" placeholder="Min. 8 characters" value={form.password} onChange={e => set('password', e.target.value)} className={FIELD + ' pr-12'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">City / State <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
              <input type="text" placeholder="e.g. Lagos" value={form.city} onChange={e => set('city', e.target.value)} className={FIELD} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Short bio <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
              <textarea rows={3} placeholder="Tell tenants about yourself and your properties..." value={form.bio} onChange={e => set('bio', e.target.value)} className={FIELD + ' resize-none'} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/25 text-sm mt-2">
              {loading ? 'Submitting application…' : 'Apply as a partner landlord'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have a landlord account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] bg-gray-950 flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1400&q=80" alt="Nigerian property" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 via-gray-950/90 to-gray-950" />

        <div className="relative z-10">
          <div className="mb-14">
            <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto" />
          </div>
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
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">KA</div>
            <div>
              <p className="text-sm font-semibold text-white">Kunle A.</p>
              <p className="text-xs text-gray-500">Landlord · Abuja</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          {['No agent commissions — ever', 'Direct tenant contact via WhatsApp', 'Admin-verified for trust & safety', 'Reach Lagos, Abuja, PH and beyond'].map(item => (
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

import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { createClient, isSupabaseConfigured } from '../lib/supabase'

export default function RegisterPage() {
  const [, navigate] = useLocation()
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) { setError('Platform is not configured yet.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    if (err) { setError(err.message); setLoading(false); return }
    const user = data.user
    if (!user) { setError('Could not create account. Try again.'); setLoading(false); return }

    if (role === 'landlord') {
      await supabase.from('landlords').upsert({ user_id: user.id, full_name: fullName, whatsapp: whatsapp || '+234000000000', status: 'pending' }, { onConflict: 'user_id' })
      setSuccess(true)
    } else {
      await supabase.from('tenants').upsert({ user_id: user.id, full_name: fullName }, { onConflict: 'user_id' })
      navigate('/user')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-3xl border border-gray-200 p-10 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#6b9e6e]/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#6b9e6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Application submitted!</h2>
          <p className="text-gray-500 leading-relaxed mb-6">
            Your landlord account is pending approval. Our team will review your application and notify you within 24 hours.
          </p>
          <Link href="/" className="inline-block px-6 py-3 bg-[#6b9e6e] hover:bg-[#4a7f4d] text-white font-semibold rounded-xl transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      <div className="hidden lg:flex lg:flex-1 relative">
        <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200" alt="Property" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1020]/60 to-transparent" />
        <div className="absolute bottom-12 left-10 text-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#6b9e6e] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            </div>
            <span className="text-xl font-bold">Livana</span>
          </div>
          <p className="text-2xl font-bold leading-snug">Join thousands finding<br />their dream home.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:max-w-xl">
        <div className="w-full max-w-md mx-auto">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#6b9e6e] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            </div>
            <span className="font-bold text-gray-900">Livana</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create an account</h1>
          <p className="text-gray-500 mb-6">Join Livana to find or list properties.</p>

          {/* Role toggle */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setRole('tenant')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === 'tenant' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              I'm a Renter
            </button>
            <button
              type="button"
              onClick={() => setRole('landlord')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === 'landlord' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              I'm a Landlord
            </button>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
            </div>
            {role === 'landlord' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp number</label>
                <input type="tel" required={role === 'landlord'} value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#6b9e6e] hover:bg-[#4a7f4d] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors shadow-sm">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {role === 'landlord' && (
            <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              Landlord accounts require approval before you can list properties. You'll be notified within 24 hours.
            </div>
          )}

          <p className="mt-6 text-sm text-gray-500 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-[#6b9e6e] hover:text-[#4a7f4d] font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

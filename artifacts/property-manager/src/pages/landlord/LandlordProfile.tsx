import { useState, useEffect } from 'react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

export default function LandlordProfile() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [form, setForm] = useState({ full_name: '', whatsapp: '', bio: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email, id: user.id })
      const { data: l } = await supabase.from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (l) setForm({ full_name: l.full_name ?? '', whatsapp: l.whatsapp ?? '', bio: l.bio ?? '' })
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setLoading(true)
    setError('')
    setSuccess(false)
    const supabase = createClient()
    const { error: err } = await (supabase.from('landlords').upsert(
      { user_id: user.id, ...form } as Record<string, unknown>,
      { onConflict: 'user_id' }
    ) as unknown as Promise<{ error: Error | null }>)
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  return (
    <AuthGuard require="landlord">
      <div className="flex min-h-screen bg-gray-50">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center px-6 bg-white border-b border-gray-100 shrink-0">
            <h1 className="font-semibold text-gray-900">Profile</h1>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-lg space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name *</label>
                    <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp number *</label>
                    <input required value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                      placeholder="+234 800 000 0000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                    <p className="text-xs text-gray-500 mt-1">This is how tenants will contact you.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio <span className="text-gray-400">(optional)</span></label>
                    <textarea rows={4} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell tenants about yourself..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e] resize-none" />
                  </div>
                  {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>}
                  {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5">Profile updated.</div>}
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 bg-[#6b9e6e] hover:bg-[#4a7f4d] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                    {loading ? 'Saving…' : 'Save changes'}
                  </button>
                </form>
              </div>

              {landlord && (
                <div className={`rounded-2xl border p-4 text-sm ${landlord.is_verified ? 'border-[#6b9e6e] bg-[#6b9e6e]/5 text-[#4a7f4d]' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  {landlord.is_verified ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      You have a verified badge — tenants will see this on your listings.
                    </div>
                  ) : (
                    'Your account is not yet verified. Complete your profile and contact support for verification.'
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

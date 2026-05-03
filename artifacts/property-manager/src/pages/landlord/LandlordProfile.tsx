import { useState, useEffect } from 'react'
import { CheckCircle, User, Phone, FileText, Shield } from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

export default function LandlordProfile() {
  const [user, setUser]       = useState<{ email?: string; id?: string } | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [form, setForm]       = useState({ full_name: '', whatsapp: '', bio: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

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
    setLoading(true); setError(''); setSuccess(false)
    const supabase = createClient()
    const { error: err } = await supabase.from('landlords').upsert(
      { user_id: user.id, ...form },
      { onConflict: 'user_id' }
    )
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  const displayName = landlord?.full_name || user?.email?.split('@')[0] || 'Landlord'
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  return (
    <AuthGuard require="landlord">
      <div className="flex min-h-screen bg-[#F4F6FB]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Profile</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage your public landlord profile</p>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <div className="max-w-xl space-y-5">
              {/* Avatar card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shrink-0">
                  <span className="text-xl font-extrabold text-white">{initials}</span>
                </div>
                <div>
                  <p className="text-lg font-extrabold text-gray-900">{displayName}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
                  {landlord?.is_verified && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-600">Verified Landlord</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Form card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">Personal Information</h2>
                  <p className="text-xs text-gray-400 mt-0.5">This information is visible to tenants</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                      <User className="w-3.5 h-3.5 text-gray-400" /> Full name *
                    </label>
                    <input required value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Your full name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> WhatsApp number *
                    </label>
                    <input required value={form.whatsapp}
                      onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                      placeholder="+234 800 000 0000"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white" />
                    <p className="text-xs text-gray-400 mt-1.5">Tenants will contact you via WhatsApp.</p>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" /> Bio <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea rows={4} value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell tenants about yourself and your properties…"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white resize-none" />
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <CheckCircle className="w-4 h-4 shrink-0" /> Profile updated successfully.
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20 text-sm">
                    {loading ? 'Saving…' : 'Save changes'}
                  </button>
                </form>
              </div>

              {/* Verification status */}
              {landlord && (
                <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
                  landlord.is_verified
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white shadow-sm'
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    landlord.is_verified ? 'bg-blue-600' : 'bg-gray-100'
                  }`}>
                    <Shield className={`w-4 h-4 ${landlord.is_verified ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${landlord.is_verified ? 'text-blue-800' : 'text-gray-700'}`}>
                      {landlord.is_verified ? 'Verified Account' : 'Not Yet Verified'}
                    </p>
                    <p className={`text-xs mt-0.5 ${landlord.is_verified ? 'text-blue-600' : 'text-gray-500'}`}>
                      {landlord.is_verified
                        ? 'Tenants can see your verified badge on all listings.'
                        : 'Complete your profile and contact support@livana.com to get verified.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

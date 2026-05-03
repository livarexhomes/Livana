import { useState, useEffect } from 'react'
import { User, Phone, CheckCircle } from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import { UserLayout } from './UserDashboard'
import { createClient } from '../../lib/supabase'

export default function UserProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [form, setForm]     = useState({ full_name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      const { data } = await supabase.from('tenants').select('full_name, phone').eq('user_id', user.id).single() as { data: { full_name: string | null; phone: string | null } | null }
      if (data) setForm({ full_name: data.full_name ?? '', phone: data.phone ?? '' })
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true); setError(''); setSuccess(false)
    const supabase = createClient()
    const { error: err } = await supabase.from('tenants').upsert(
      { user_id: userId, full_name: form.full_name, phone: form.phone || null },
      { onConflict: 'user_id' }
    )
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  const displayName = form.full_name || userEmail.split('@')[0] || 'User'
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Profile">
        <div className="max-w-lg space-y-5">
          {/* Avatar card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shrink-0">
              <span className="text-lg font-extrabold text-white">{initials}</span>
            </div>
            <div>
              <p className="text-base font-extrabold text-gray-900">{displayName}</p>
              <p className="text-sm text-gray-400 mt-0.5">{userEmail}</p>
              <span className="inline-block mt-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wide">Tenant</span>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Personal Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">Update your account information</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                  <User className="w-3.5 h-3.5 text-gray-400" /> Full name
                </label>
                <input required value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+234 800 000 0000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <CheckCircle className="w-4 h-4 shrink-0" /> Profile updated.
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20 text-sm">
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      </UserLayout>
    </AuthGuard>
  )
}

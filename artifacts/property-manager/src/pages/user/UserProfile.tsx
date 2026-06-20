import { useState, useEffect } from 'react'
import { User, Phone, CheckCircle, Mail, Shield } from 'lucide-react'
import AuthGuard from '../../components/auth/AuthGuard'
import { UserLayout } from './UserDashboard'
import { createClient } from '../../lib/supabase'

export default function UserProfilePage() {
  const [userId, setUserId]     = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [form, setForm]         = useState({ full_name: '', phone: '' })
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      const { data } = await supabase
        .from('tenants').select('full_name, phone').eq('user_id', user.id).single() as
        { data: { full_name: string | null; phone: string | null } | null }
      if (data) setForm({ full_name: data.full_name ?? '', phone: data.phone ?? '' })
      setFetching(false)
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
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'U'

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Profile">
        <div className="space-y-4 max-w-2xl">

          {/* Avatar card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md shrink-0">
              <span className="text-xl font-extrabold text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-gray-900 truncate">{displayName}</p>
              <p className="text-sm text-gray-400 mt-0.5 truncate">{userEmail}</p>
              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                <Shield className="w-2.5 h-2.5" /> Tenant
              </span>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="text-sm font-bold text-gray-900">Personal Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">Update your account information</p>
            </div>

            {fetching ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-10 bg-gray-100 rounded-xl" />
                <div className="h-10 bg-gray-100 rounded-xl" />
                <div className="h-11 bg-gray-200 rounded-xl" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">

                {/* Email (read-only) */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </label>
                  <div className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 select-none">
                    {userEmail}
                  </div>
                </div>

                {/* Full name */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    <User className="w-3.5 h-3.5" /> Full name
                  </label>
                  <input
                    required
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    <Phone className="w-3.5 h-3.5" /> Phone
                    <span className="text-gray-300 font-normal normal-case tracking-normal">optional</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+234 800 000 0000"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <CheckCircle className="w-4 h-4 shrink-0" /> Profile updated.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  {loading ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            )}
          </div>

        </div>
      </UserLayout>
    </AuthGuard>
  )
}

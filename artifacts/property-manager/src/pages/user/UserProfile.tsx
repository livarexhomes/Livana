import { useState, useEffect } from 'react'
import AuthGuard from '../../components/AuthGuard'
import { UserLayout } from './UserDashboard'
import { createClient } from '../../lib/supabase'

export default function UserProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('tenants').select('full_name, phone').eq('user_id', user.id).single()
      if (data) setForm({ full_name: data.full_name ?? '', phone: data.phone ?? '' })
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    setError('')
    setSuccess(false)
    const supabase = createClient()
    const { error: err } = await supabase.from('tenants').upsert(
      { user_id: userId, full_name: form.full_name, phone: form.phone || null },
      { onConflict: 'user_id' }
    )
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Profile">
        <div className="max-w-lg space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-500 mt-1">Update your personal details.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400">(optional)</span></label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+234 800 000 0000"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</div>}
              {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3.5 py-2.5">Profile updated.</div>}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-[#6b9e6e] hover:bg-[#4a7f4d] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      </UserLayout>
    </AuthGuard>
  )
}

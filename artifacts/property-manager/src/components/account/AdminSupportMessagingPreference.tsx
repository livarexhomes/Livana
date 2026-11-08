import { useEffect, useState } from 'react'
import { CheckCircle, Loader2, MessageSquare } from 'lucide-react'
import { createClient } from '../../lib/supabase'

export default function AdminSupportMessagingPreference() {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    createClient().auth.getUser()
      .then(({ data, error: authError }) => {
        if (!active) return
        if (authError) setError(authError.message)
        else setEnabled(data.user?.user_metadata?.admin_support_messages !== false)
        setLoading(false)
      })
      .catch(reason => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'Could not load communication preferences.')
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function savePreference() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const client = createClient()
      const { data: { user }, error: userError } = await client.auth.getUser()
      if (userError || !user) throw new Error(userError?.message ?? 'Your session could not be verified.')
      const { error: updateError } = await client.auth.updateUser({
        data: { ...user.user_metadata, admin_support_messages: enabled },
      })
      if (updateError) throw updateError
      setSaved(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save communication preferences.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Administrator support messages</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Allow Livarex administrators to contact you in the in-app support inbox about your property activity.
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
            <input type="checkbox" checked={enabled} disabled={loading || saving} onChange={event => {
              setEnabled(event.target.checked)
              setSaved(false)
            }} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600" />
            Allow support messages
          </label>
          {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
          {saved && <p role="status" className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle className="h-3.5 w-3.5" /> Preference saved.</p>}
          <button type="button" onClick={() => void savePreference()} disabled={loading || saving}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save preference
          </button>
        </div>
      </div>
    </section>
  )
}

import { useState, type FormEvent } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { CheckCircle2, Mail } from 'lucide-react'

interface NotifyWhenAvailableFormProps {
  title: string
  description: string
  subject: string
  details: string
}

export default function NotifyWhenAvailableForm({
  title,
  description,
  subject,
  details,
}: NotifyWhenAvailableFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Enter a valid email address to get notifications.')
      return
    }
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please try again later.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const message = `${details}\n\nRequest type: ${subject}`
      const { error: insertError } = await supabase.from('contact_messages').insert({
        name: 'Property alert signup',
        email,
        role: 'renter',
        subject,
        message,
      })
      if (insertError) throw insertError
      setSuccess(true)
      setEmail('')
    } catch (err: any) {
      setError(err?.message || 'Unable to save your request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-3xl bg-blue-600/10 text-blue-600 grid place-items-center">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {success ? (
        <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-6 text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-3xl bg-emerald-500/10 text-emerald-600 grid place-items-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="font-semibold text-slate-900 mb-2">You’re on the list.</p>
          <p className="text-sm text-slate-500">We’ll notify you as soon as verified properties matching your request become available.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            <p>{details}</p>
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Notify me when available'}
          </button>
        </form>
      )}
    </div>
  )
}

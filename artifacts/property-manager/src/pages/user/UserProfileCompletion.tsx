import { useEffect, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Check, MapPin, Users } from 'lucide-react'
import { Link, useLocation } from '@/lib/navigation'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient } from '../../lib/supabase'

type ProfileForm = {
  marital_status: string
  occupation: string
  employment_type: string
  household_size: string
  city: string
  move_in_timeline: string
}

const EMPTY_FORM: ProfileForm = {
  marital_status: '',
  occupation: '',
  employment_type: '',
  household_size: '',
  city: '',
  move_in_timeline: '',
}

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15'
const labelClass = 'mb-1.5 block text-sm font-semibold text-gray-800'

export default function UserProfileCompletion() {
  const [, navigate] = useLocation()
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('tenants')
        .select('marital_status, occupation, employment_type, household_size, city, move_in_timeline')
        .eq('user_id', user.id)
        .maybeSingle() as { data: Partial<ProfileForm> | null }
      if (data) {
        setForm({
          marital_status: data.marital_status ?? '',
          occupation: data.occupation ?? '',
          employment_type: data.employment_type ?? '',
          household_size: data.household_size ? String(data.household_size) : '',
          city: data.city ?? '',
          move_in_timeline: data.move_in_timeline ?? '',
        })
      }
      setLoading(false)
    })
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!userId) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: saveError } = await supabase
      .from('tenants')
      .update({
        marital_status: form.marital_status,
        occupation: form.occupation.trim(),
        employment_type: form.employment_type || null,
        household_size: form.household_size ? Number(form.household_size) : null,
        city: form.city.trim() || null,
        move_in_timeline: form.move_in_timeline || null,
      })
      .eq('user_id', userId)

    if (saveError) {
      setError('We could not save your details. Please try again.')
      setSaving(false)
      return
    }
    navigate('/user')
  }

  function updateForm(field: keyof ProfileForm, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

  return (
    <AuthGuard require="tenant">
      <main className="min-h-screen bg-[#f5f7f3] px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center">
              <img src="/livarex-logo.png" alt="LIVAREX" className="h-9 w-auto" />
            </Link>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Profile setup · 1 of 1</span>
          </div>

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="grid md:grid-cols-[0.8fr_1.2fr]">
              <div className="flex flex-col justify-between bg-[#103d35] p-7 text-white sm:p-9">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-teal-200">A better home search</p>
                  <h1 className="max-w-xs text-3xl font-bold leading-tight">Let’s make your search yours.</h1>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-teal-50/80">
                    A few details help us tailor property recommendations and make future enquiries easier.
                  </p>
                </div>
                <div className="mt-10 hidden items-center gap-3 text-sm text-teal-50/80 md:flex">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><Check className="h-4 w-4" /></span>
                  <span>Your details stay attached to your account.</span>
                </div>
              </div>

              <div className="p-6 sm:p-9">
                <h2 className="text-xl font-bold text-gray-950">About you</h2>
                <p className="mb-6 mt-1 text-sm text-gray-500">Required fields are marked with an asterisk.</p>

                {loading ? (
                  <div className="space-y-4" aria-label="Loading profile details">
                    <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
                    <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
                    <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="marital-status" className={labelClass}>Marital status *</label>
                        <select id="marital-status" required value={form.marital_status} onChange={event => updateForm('marital_status', event.target.value)} className={inputClass}>
                          <option value="" disabled>Select status</option>
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                          <option value="divorced">Divorced</option>
                          <option value="widowed">Widowed</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="occupation" className={labelClass}>Occupation *</label>
                        <div className="relative">
                          <BriefcaseBusiness className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input id="occupation" required maxLength={100} value={form.occupation} onChange={event => updateForm('occupation', event.target.value)} placeholder="e.g. Teacher, designer, student" className={`${inputClass} pl-10`} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="employment-type" className={labelClass}>Work situation <span className="font-normal text-gray-400">(optional)</span></label>
                        <select id="employment-type" value={form.employment_type} onChange={event => updateForm('employment_type', event.target.value)} className={inputClass}>
                          <option value="">Select situation</option>
                          <option value="employed">Employed</option>
                          <option value="self_employed">Self-employed</option>
                          <option value="student">Student</option>
                          <option value="between_jobs">Between jobs</option>
                          <option value="retired">Retired</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="household-size" className={labelClass}>People moving in <span className="font-normal text-gray-400">(optional)</span></label>
                        <div className="relative">
                          <Users className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input id="household-size" type="number" min="1" max="20" value={form.household_size} onChange={event => updateForm('household_size', event.target.value)} placeholder="Including you" className={`${inputClass} pl-10`} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="city" className={labelClass}>Current city <span className="font-normal text-gray-400">(optional)</span></label>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input id="city" maxLength={100} value={form.city} onChange={event => updateForm('city', event.target.value)} placeholder="e.g. Lagos" className={`${inputClass} pl-10`} />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="move-in" className={labelClass}>When are you looking to move? <span className="font-normal text-gray-400">(optional)</span></label>
                        <select id="move-in" value={form.move_in_timeline} onChange={event => updateForm('move_in_timeline', event.target.value)} className={inputClass}>
                          <option value="">Choose a timeframe</option>
                          <option value="asap">As soon as possible</option>
                          <option value="within_1_month">Within a month</option>
                          <option value="1_to_3_months">1 to 3 months</option>
                          <option value="3_plus_months">More than 3 months</option>
                          <option value="just_browsing">Just browsing</option>
                        </select>
                      </div>
                    </div>

                    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">{error}</p>}

                    <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#103d35] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#0b302a] disabled:cursor-not-allowed disabled:opacity-60">
                      {saving ? 'Saving details…' : 'Save and continue'}
                      {!saving && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AuthGuard>
  )
}

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Home,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'

import { Link, useLocation } from '@/lib/navigation'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient } from '../../lib/supabase'

type ProfileForm = {
  marital_status: string
  occupation: string
  employment_type: string
  city: string
  looking_for: string
}

const EMPTY_FORM: ProfileForm = {
  marital_status: '',
  occupation: '',
  employment_type: '',
  city: '',
  looking_for: '',
}

const inputClass =
  'w-full h-[50px] rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'

const labelClass =
  'mb-2 block text-[13px] font-semibold text-slate-700'

function getProfileErrorMessage(error: unknown, action: 'load' | 'save') {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : ''

  if (['42703', 'PGRST204', 'PGRST205'].includes(code)) {
    return 'The profile database update is missing. Apply migration 033_tenant_looking_for.sql, then refresh and try again.'
  }
  if (code === '42501') {
    return 'Profile update permissions are missing. Apply migration 033_tenant_looking_for.sql, then refresh and try again.'
  }

  return action === 'load'
    ? 'Unable to load your profile. Please refresh and try again.'
    : 'We could not save your details. Please try again.'
}

export default function UserProfileCompletion() {
  const [, navigate] = useLocation()

  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!active) return

        if (!user) {
          setLoading(false)
          return
        }

        setUserId(user.id)

        const { data, error } = await supabase
          .from('tenants')
          .select(
            'marital_status, occupation, employment_type, city, looking_for'
          )
          .eq('user_id', user.id)
          .maybeSingle() as {
            data: Partial<ProfileForm> | null
            error: unknown
          }

        if (error) throw error

        if (!active) return

        if (data) {
          setForm({
            marital_status: data.marital_status ?? '',
            occupation: data.occupation ?? '',
            employment_type: data.employment_type ?? '',
            city: data.city ?? '',
            looking_for: data.looking_for ?? '',
          })
        }
      } catch (loadError) {
        console.error('[profile-completion] profile load failed:', loadError)
        if (active) {
          setError(getProfileErrorMessage(loadError, 'load'))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [])

  function updateForm(field: keyof ProfileForm, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!userId) {
      setError('Your session has expired. Please sign in again.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const supabase = createClient()

      const { data: savedProfile, error: saveError } = await supabase
        .from('tenants')
        .update({
          marital_status: form.marital_status,
          occupation: form.occupation.trim(),
          employment_type: form.employment_type || null,
          city: form.city.trim(),
          looking_for: form.looking_for,
        })
        .eq('user_id', userId)
        .select('id')
        .maybeSingle()

      if (saveError) throw saveError
      if (!savedProfile) {
        setError('We could not find your profile. Please sign in again and retry.')
        setSaving(false)
        return
      }

      navigate('/user')
    } catch (saveError) {
      console.error('[profile-completion] profile update failed:', saveError)
      setError(getProfileErrorMessage(saveError, 'save'))
      setSaving(false)
    }
  }

  return (
    <AuthGuard require="tenant">
      <main className="min-h-dvh bg-[#F7F9FC] text-slate-900">

        {/* Header */}
        <header className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">

            <Link href="/" className="flex items-center">
              <img
                src="/livarex-logo.png"
                alt="Livarex"
                className="h-9 w-auto"
              />
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs font-medium text-slate-500 sm:block">
                Profile setup
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                01 / 01
              </span>
            </div>

          </div>
        </header>

        {/* Main content */}
        <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-14">

          <div className="mx-auto max-w-6xl">

            {/* Intro */}
            <div className="mb-9 max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <Sparkles size={14} />
                PERSONALISE YOUR EXPERIENCE
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Let's find a place
                <span className="text-blue-700"> that feels like yours.</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                Tell us a little about yourself. We'll use these details
                to make your property search more relevant and your
                experience on Livarex more seamless.
              </p>
            </div>

            {/* Main card */}
            <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_50px_-25px_rgba(15,23,42,0.18)] lg:grid-cols-[0.82fr_1.18fr]">

              {/* Left panel */}
              <aside className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[#123D80] p-7 text-white sm:p-10 lg:min-h-[650px]">

                {/* Decorative elements */}
                <div className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -right-12 -top-8 h-56 w-56 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -bottom-36 -left-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

                <div className="relative z-10">
                  <div className="mb-9 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                    <Home size={23} />
                  </div>

                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">
                    Welcome to Livarex
                  </p>

                  <h2 className="max-w-sm text-3xl font-bold leading-[1.2] tracking-tight sm:text-[38px]">
                    Your next chapter starts with the right address.
                  </h2>

                  <p className="mt-5 max-w-sm text-sm leading-7 text-blue-100/80">
                    A better way to discover verified properties,
                    connect with trusted property professionals and
                    find somewhere you can truly call home.
                  </p>
                </div>

                {/* Benefits */}
                <div className="relative z-10 mt-12 space-y-5">

                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <Check size={17} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Relevant recommendations</p>
                      <p className="mt-0.5 text-xs text-blue-100/70">
                        Discover properties suited to your needs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <ShieldCheck size={17} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">A seamless experience</p>
                      <p className="mt-0.5 text-xs text-blue-100/70">
                        Your profile stays connected to your account.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <MapPin size={17} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">A search that understands you</p>
                      <p className="mt-0.5 text-xs text-blue-100/70">
                        Spend less time searching and more time discovering.
                      </p>
                    </div>
                  </div>

                </div>

                <div className="relative z-10 mt-10 border-t border-white/15 pt-5">
                  <p className="text-xs text-blue-100/60">
                    LIVAREX · VERIFIED PROPERTY MARKETPLACE
                  </p>
                </div>
              </aside>

              {/* Right form panel */}
              <div className="p-6 sm:p-9 lg:p-11">

                <div className="mb-8 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      A little about you
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                      Complete your profile
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      This should only take a minute or two.
                    </p>
                  </div>

                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 sm:flex">
                    <UserRound size={23} />
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-8">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Profile information
                    </span>
                    <span className="font-medium text-slate-400">
                      Step 1 of 1
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-full rounded-full bg-blue-600" />
                  </div>
                </div>

                {!loading && (!form.marital_status || !form.city.trim() || !form.looking_for) && (
                  <div className="mb-6 flex gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
                    <InfoIcon />
                    <p className="text-xs leading-5 text-blue-800">
                      Add your marital status, current city, and property preference to continue. Occupation and work status are optional.
                    </p>
                  </div>
                )}

                {loading ? (
                  <div className="space-y-6" aria-label="Loading profile">
                    <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-7">

                    {/* Personal details */}
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <UserRound size={15} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Personal information
                        </h3>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="marital-status" className={labelClass}>
                            Marital status <span className="text-blue-600">*</span>
                          </label>
                          <div className="relative">
                            <select
                              id="marital-status"
                              required
                              value={form.marital_status}
                              onChange={e => updateForm('marital_status', e.target.value)}
                              className={`${inputClass} appearance-none pr-10`}
                            >
                              <option value="" disabled>Select status</option>
                              <option value="single">Single</option>
                              <option value="married">Married</option>
                              <option value="divorced">Divorced</option>
                              <option value="widowed">Widowed</option>
                              <option value="prefer_not_to_say">Prefer not to say</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="occupation" className={labelClass}>
                            Occupation <span className="font-normal text-slate-400">(optional)</span>
                          </label>
                          <div className="relative">
                            <BriefcaseBusiness className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="occupation"
                              maxLength={100}
                              value={form.occupation}
                              onChange={e => updateForm('occupation', e.target.value)}
                              placeholder="e.g. Entrepreneur, Teacher"
                              className={`${inputClass} pl-11`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100" />

                    {/* Employment */}
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <BriefcaseBusiness size={15} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Employment details
                        </h3>
                        <span className="text-[10px] text-slate-400">OPTIONAL</span>
                      </div>

                      <label htmlFor="employment-type" className={labelClass}>
                        Current work status
                      </label>
                      <div className="relative">
                        <select
                          id="employment-type"
                          value={form.employment_type}
                          onChange={e => updateForm('employment_type', e.target.value)}
                          className={`${inputClass} appearance-none pr-10`}
                        >
                          <option value="">Select employment status</option>
                          <option value="employed">Employed</option>
                          <option value="self_employed">Self-employed</option>
                          <option value="student">Student</option>
                          <option value="between_jobs">Between jobs</option>
                          <option value="retired">Retired</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="border-t border-slate-100" />

                    {/* Location */}
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <MapPin size={15} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Location details
                        </h3>
                      </div>

                      <label htmlFor="city" className={labelClass}>
                        Current city <span className="text-blue-600">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="city"
                          required
                          maxLength={100}
                          value={form.city}
                          onChange={e => updateForm('city', e.target.value)}
                          placeholder="e.g. Lagos, Abuja, Port Harcourt"
                          className={`${inputClass} pl-11`}
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100" />

                    {/* Property preference */}
                    <fieldset>
                      <legend className={labelClass}>
                        Looking for <span className="text-blue-600">*</span>
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          { value: 'rent', label: "I'm looking for property to rent" },
                          { value: 'buy', label: "I'm looking for property to buy" },
                          { value: 'both', label: 'Both' },
                        ].map(option => (
                          <label
                            key={option.value}
                            className={`flex min-h-[58px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                              form.looking_for === option.value
                                ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/10'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="looking-for"
                              value={option.value}
                              required
                              checked={form.looking_for === option.value}
                              onChange={e => updateForm('looking_for', e.target.value)}
                              className="h-4 w-4 shrink-0 accent-blue-700"
                            />
                            <span className="leading-5">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    {error && (
                      <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                      >
                        {error}
                      </div>
                    )}

                    {/* Submit */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={saving || !userId}
                        className="group flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-lg shadow-blue-700/15 transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-700/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? 'Saving your details...' : 'Save and continue'}
                        {!saving && (
                          <ArrowRight
                            size={17}
                            className="transition-transform group-hover:translate-x-1"
                          />
                        )}
                      </button>

                      <div className="mt-4 flex items-center justify-center gap-2 text-center">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <p className="text-[11px] text-slate-400">
                          Your information is securely associated with your account.
                        </p>
                      </div>
                    </div>

                  </form>
                )}
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-7 flex flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row">
              <p>© {new Date().getFullYear()} Livarex. All rights reserved.</p>
              <p>
                Finding the right property starts here.
              </p>
            </footer>

          </div>
        </section>
      </main>
    </AuthGuard>
  )
}

function InfoIcon() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
      i
    </span>
  )
}

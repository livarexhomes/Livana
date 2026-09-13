import { useEffect, useMemo, useState } from 'react'
import {
  Bath,
  BedDouble,
  Building2,
  CalendarRange,
  CarFront,
  Check,
  ChevronDown,
  ChevronRight,
  Home,
  KeyRound,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'
import { createClient } from '@/lib/supabase'
import type { PropertyRequest } from '@/types'
import RequestStatusTimeline from './RequestStatusTimeline'

const PURPOSE_OPTIONS = [
  {
    value: 'Rent',
    title: 'Rent',
    description: 'Find your next home',
    icon: KeyRound,
  },
  {
    value: 'Lease',
    title: 'Lease',
    description: 'Long-term flexibility',
    icon: CalendarRange,
  },
  {
    value: 'Buy',
    title: 'Buy',
    description: 'Own your next property',
    icon: Home,
  },
]

const PROPERTY_TYPE_OPTIONS = [
  'Self-contained',
  'Mini Flat',
  'Apartment',
  '1 Bedroom Flat',
  '2 Bedroom Flat',
  '3 Bedroom Flat',
  'Bungalow',
  'Duplex',
  'Terrace',
  'Detached House',
  'Semi-detached House',
  'Commercial',
  'Land',
  'Other',
]

const FURNISHING_OPTIONS = ['Any', 'Furnished', 'Semi-furnished', 'Unfurnished']
const MOVE_IN_OPTIONS = ['Immediately', 'Within 2 weeks', 'Within 1 month', 'Within 3 months', 'Flexible']
const FEATURE_OPTIONS = [
  { label: 'Parking', icon: CarFront },
  { label: 'Security', icon: ShieldCheck },
  { label: 'Stable Electricity', icon: Sparkles },
  { label: 'Water', icon: Sparkles },
  { label: 'Gated Estate', icon: Building2 },
  { label: 'Serviced Apartment', icon: Home },
  { label: 'BQ', icon: Home },
  { label: 'Balcony', icon: Home },
]

type PropertyRequestFormValues = {
  purpose: string
  property_type: string
  state: string
  preferred_area: string
  alternative_areas: string
  min_budget: string
  max_budget: string
  bedrooms: string
  bathrooms: string
  furnishing: string
  move_in_timeline: string
  features: string[]
  notes: string
}

const defaultValues: PropertyRequestFormValues = {
  purpose: 'Rent',
  property_type: 'Apartment',
  state: '',
  preferred_area: '',
  alternative_areas: '',
  min_budget: '',
  max_budget: '',
  bedrooms: '',
  bathrooms: '',
  furnishing: 'Any',
  move_in_timeline: 'Flexible',
  features: [],
  notes: '',
}

interface PropertyRequestFormProps {
  initialValues?: Partial<PropertyRequestFormValues>
  editingRequest?: PropertyRequest | null
  onSuccess?: (request: PropertyRequest) => void
  onCancelEdit?: () => void
}

function formatCurrency(value: string) {
  if (!value || Number(value) <= 0) return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function formatOptionalValue(value: string | null | undefined, fallback = 'Not selected yet') {
  if (value === null || value === undefined || value === '') return fallback
  return value
}

export default function PropertyRequestForm({ initialValues, editingRequest, onSuccess, onCancelEdit }: PropertyRequestFormProps) {
  const [values, setValues] = useState<PropertyRequestFormValues>({ ...defaultValues, ...initialValues })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submittedRequest, setSubmittedRequest] = useState<PropertyRequest | null>(null)

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues })
    setErrors({})
  }, [initialValues, editingRequest])

  const stateOptions = useMemo(() => ['Lagos', 'Ogun'], [])

  const showCustomPropertyType = values.property_type === 'Other' || (!!values.property_type && !PROPERTY_TYPE_OPTIONS.includes(values.property_type))
  const selectedPropertyType = PROPERTY_TYPE_OPTIONS.includes(values.property_type) ? values.property_type : 'Other'

  const alternativeAreas = useMemo(() => {
    return values.alternative_areas
      .split(',')
      .map(area => area.trim())
      .filter(Boolean)
  }, [values.alternative_areas])

  const summaryItems = useMemo(
    () => [
      { label: 'Purpose', value: formatOptionalValue(values.purpose) },
      { label: 'Property Type', value: formatOptionalValue(values.property_type) },
      {
        label: 'Location',
        value: [values.preferred_area, values.state].filter(Boolean).join(', ') || 'Not selected yet',
      },
      {
        label: 'Budget',
        value:
          values.min_budget || values.max_budget
            ? `${formatCurrency(values.min_budget)} – ${formatCurrency(values.max_budget)}`
            : 'Not selected yet',
      },
      { label: 'Bedrooms', value: formatOptionalValue(values.bedrooms) },
      { label: 'Bathrooms', value: formatOptionalValue(values.bathrooms) },
      { label: 'Furnishing', value: formatOptionalValue(values.furnishing) },
      { label: 'Move-in Timeline', value: formatOptionalValue(values.move_in_timeline) },
    ],
    [values],
  )

  const requestCompleteness = useMemo(() => {
    const checks = [
      values.purpose,
      values.property_type,
      values.state,
      values.preferred_area,
      values.min_budget,
      values.max_budget,
      values.bedrooms || values.bathrooms || values.furnishing || values.move_in_timeline,
    ]

    const completed = checks.filter(value => {
      if (typeof value === 'string') return value.trim().length > 0
      return Boolean(value)
    }).length

    return Math.min(100, Math.round((completed / checks.length) * 100))
  }, [values])

  function updateField<K extends keyof PropertyRequestFormValues>(field: K, value: PropertyRequestFormValues[K]) {
    setValues(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function toggleFeature(feature: string) {
    setValues(prev => {
      const features = prev.features.includes(feature)
        ? prev.features.filter(item => item !== feature)
        : [...prev.features, feature]
      return { ...prev, features }
    })
  }

  function validate() {
    const nextErrors: Record<string, string> = {}

    if (!values.purpose) nextErrors.purpose = 'Purpose is required.'

    if (!values.property_type || values.property_type === 'Other') {
      nextErrors.property_type = 'Property type is required.'
    }

    if (!values.state) nextErrors.state = 'Preferred state is required.'
    if (!values.preferred_area) nextErrors.preferred_area = 'Preferred area is required.'
    if (!values.min_budget || Number(values.min_budget) <= 0) nextErrors.min_budget = 'Minimum budget is required.'
    if (!values.max_budget || Number(values.max_budget) <= 0) nextErrors.max_budget = 'Maximum budget is required.'

    if (Number(values.min_budget) > Number(values.max_budget)) {
      nextErrors.max_budget = 'Maximum budget cannot be lower than minimum budget.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in to continue.')

      let { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: string } | null }

      if (!tenant) {
        const meta = user.user_metadata ?? {}
        const tenantPayload = {
          user_id: user.id,
          full_name: meta.full_name ?? meta.name ?? user.email?.split('@')[0] ?? 'User',
          email: user.email ?? null,
          avatar_url: meta.avatar_url ?? meta.picture ?? null,
          provider: user.app_metadata?.provider ?? 'email',
        }

        const { data: createdTenant, error: insertError } = await supabase
          .from('tenants')
          .insert(tenantPayload)
          .select('id')
          .single() as { data: { id: string } | null; error?: { code?: string; message?: string } | null }

        if (insertError && (insertError.code === 'PGRST204' || insertError.message?.includes('provider'))) {
          const { data: createdTenantWithoutProvider, error: fallbackInsertError } = await supabase
            .from('tenants')
            .insert({
              user_id: user.id,
              full_name: tenantPayload.full_name,
              email: tenantPayload.email,
              avatar_url: tenantPayload.avatar_url,
            })
            .select('id')
            .single() as { data: { id: string } | null; error?: { code?: string; message?: string } | null }

          if (fallbackInsertError) throw fallbackInsertError
          tenant = createdTenantWithoutProvider
        } else if (insertError) {
          throw insertError
        } else {
          tenant = createdTenant
        }
      }

      if (!tenant) throw new Error('Tenant profile not found.')

      const payload = {
        tenant_id: tenant.id,
        purpose: values.purpose,
        property_type: values.property_type,
        state: values.state,
        preferred_area: values.preferred_area,
        alternative_areas: values.alternative_areas
          ? values.alternative_areas.split(',').map(item => item.trim()).filter(Boolean)
          : null,
        min_budget: Number(values.min_budget),
        max_budget: Number(values.max_budget),
        bedrooms: values.bedrooms ? Number(values.bedrooms) : null,
        bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
        furnishing: values.furnishing || null,
        move_in_timeline: values.move_in_timeline || null,
        features: values.features.length ? values.features : null,
        notes: values.notes.trim() || null,
      }

      let result: PropertyRequest | null = null

      if (editingRequest) {
        const { data, error } = await supabase
          .from('property_requests')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRequest.id)
          .select()
          .single()

        if (error) throw error
        result = data as PropertyRequest
      } else {
        const { data, error } = await supabase
          .from('property_requests')
          .insert({
            ...payload,
            status: 'submitted',
          })
          .select()
          .single()

        if (error) throw error
        result = data as PropertyRequest
      }

      setSubmittedRequest(result)
      onSuccess?.(result)
      setErrors({})
    } catch (error) {
      console.error('[property request create]', error)
      setErrors({ form: error instanceof Error ? error.message : 'Unable to save request.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <form id="property-request-form" onSubmit={handleSubmit} className="space-y-6">
        {errors.form && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {errors.form}
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,68%)_minmax(0,32%)] lg:items-start lg:gap-6">
          <div className="space-y-6">
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Purpose</h2>
                <p className="mt-1 text-sm text-slate-500">Choose how you want to move.</p>
              </div>

              <div className="inline-flex w-full items-center rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                {PURPOSE_OPTIONS.map(({ value, title, icon: Icon }) => {
                  const selected = values.purpose === value

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateField('purpose', value)}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        selected
                          ? 'bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)]'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {title}
                    </button>
                  )
                })}
              </div>

              {errors.purpose && <p className="text-sm text-red-500">{errors.purpose}</p>}
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Property Type</h2>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Property Type</label>
                <select
                  value={selectedPropertyType}
                  onChange={e => updateField('property_type', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  {PROPERTY_TYPE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.property_type && <p className="text-sm text-red-500">{errors.property_type}</p>}
              </div>

              {showCustomPropertyType && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Custom property type</label>
                  <input
                    value={values.property_type === 'Other' ? '' : values.property_type}
                    onChange={e => updateField('property_type', e.target.value)}
                    placeholder="Townhouse, duplex villa..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Location</h2>
                <p className="mt-1 text-sm text-slate-500">Tell us the locations you have in mind.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">State</label>
                  <div className="relative">
                    <select
                      value={values.state}
                      onChange={e => updateField('state', e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                    >
                      <option value="">Select state</option>
                      {stateOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Preferred Area</label>
                  <input
                    value={values.preferred_area}
                    onChange={e => updateField('preferred_area', e.target.value)}
                    placeholder="Lekki"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                  {errors.preferred_area && <p className="text-sm text-red-500">{errors.preferred_area}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-700">Alternative Areas</label>
                  <span className="text-xs font-medium text-slate-400">Optional</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {alternativeAreas.map(area => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => {
                          const updated = values.alternative_areas
                            .split(',')
                            .map(item => item.trim())
                            .filter(item => item && item !== area)
                            .join(', ')

                          updateField('alternative_areas', updated)
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
                      >
                        {area}
                        <span className="text-blue-500">×</span>
                      </button>
                    ))}
                  </div>

                  <input
                    value={values.alternative_areas}
                    onChange={e => updateField('alternative_areas', e.target.value)}
                    placeholder="Ajah, Ikoyi, Victoria Island"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Budget</h2>
                <p className="mt-1 text-sm text-slate-500">Enter the range you're comfortable with.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Minimum Budget</label>
                  <MoneyInput
                    value={values.min_budget}
                    onChange={value => updateField('min_budget', value)}
                    placeholder="200,000"
                    className="rounded-2xl border border-slate-200 bg-slate-50"
                  />
                  {errors.min_budget && <p className="text-sm text-red-500">{errors.min_budget}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Maximum Budget</label>
                  <MoneyInput
                    value={values.max_budget}
                    onChange={value => updateField('max_budget', value)}
                    placeholder="3,000,000"
                    className="rounded-2xl border border-slate-200 bg-slate-50"
                  />
                  {errors.max_budget && <p className="text-sm text-red-500">{errors.max_budget}</p>}
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)] md:p-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900">Property Details</h2>
                <p className="text-sm text-slate-500">Choose the setup that works for you.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[13px] font-semibold text-slate-700">Bedrooms</label>
                  <div className="flex flex-wrap gap-2">
                    {['Studio', '1', '2', '3', '4', '5+'].map(option => {
                      const selected = values.bedrooms === option
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateField('bedrooms', option)}
                          className={`min-h-[40px] rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-semibold text-slate-700">Bathrooms</label>
                  <div className="flex flex-wrap gap-2">
                    {['Any', '1', '2', '3', '4+'].map(option => {
                      const selected = values.bathrooms === option
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateField('bathrooms', option)}
                          className={`min-h-[40px] rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[13px] font-semibold text-slate-700">Furnishing</label>
                  <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                    {FURNISHING_OPTIONS.map(option => {
                      const selected = values.furnishing === option
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateField('furnishing', option)}
                          className={`min-h-[40px] flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-transparent bg-transparent text-slate-600 hover:bg-white'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[13px] font-semibold text-slate-700">Move-in Timeline</label>
                  <div className="flex flex-wrap gap-2">
                    {MOVE_IN_OPTIONS.map(option => {
                      const selected = values.move_in_timeline === option
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateField('move_in_timeline', option)}
                          className={`min-h-[40px] rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Features / Must-haves</h2>
                <p className="mt-1 text-sm text-slate-500">Select the essentials that matter most.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {FEATURE_OPTIONS.map(({ label, icon: Icon }) => {
                  const selected = values.features.includes(label)

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleFeature(label)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        selected
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-[0_10px_22px_rgba(37,99,235,0.08)]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {label}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Notes</h2>
                <p className="mt-1 text-sm text-slate-500">Anything else we should know about the kind of property you're looking for?</p>
              </div>

              <textarea
                value={values.notes}
                onChange={e => updateField('notes', e.target.value)}
                rows={4}
                placeholder="Anything else we should know about the kind of property you're looking for?"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </section>
          </div>

          <aside className="mt-6 lg:mt-0">
            {submittedRequest ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Request Tracking</p>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                    {submittedRequest.status}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-base font-bold text-slate-900">{submittedRequest.property_type}</p>
                  <p className="text-sm text-slate-500">{submittedRequest.preferred_area}, {submittedRequest.state}</p>
                </div>

                <div className="mt-4">
                  <RequestStatusTimeline request={submittedRequest} />
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:p-5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Your Request</p>
                  <span className="text-[10px] font-semibold text-slate-500">{requestCompleteness}% complete</span>
                </div>

                <div className="mt-3 space-y-0">
                  {summaryItems.map(item => (
                    <div key={item.label} className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
                      <span className="text-xs font-medium text-slate-400">{item.label}</span>
                      <span className="max-w-[60%] text-right text-sm font-semibold text-slate-700">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-slate-200 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Must-haves</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {values.features.length > 0 ? (
                      values.features.map(feature => (
                        <span key={feature} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                          {feature}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">Not selected yet</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {editingRequest ? 'Cancel Editing' : 'Clear Form'}
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {submitting ? (editingRequest ? 'Updating your request…' : 'Submitting your request…') : (editingRequest ? 'Update Request' : 'Submit Property Request')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

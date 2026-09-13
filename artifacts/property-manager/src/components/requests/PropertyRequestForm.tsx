import { useEffect, useMemo, useState } from 'react'
import {
  Bath,
  BedDouble,
  Building2,
  CalendarRange,
  CarFront,
  Check,
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

export default function PropertyRequestForm({ initialValues, editingRequest, onSuccess, onCancelEdit }: PropertyRequestFormProps) {
  const [values, setValues] = useState<PropertyRequestFormValues>({ ...defaultValues, ...initialValues })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues })
    setErrors({})
  }, [initialValues, editingRequest])

  const stateOptions = useMemo(() => ['Lagos', 'Ogun', 'Abuja', 'Rivers', 'Enugu', 'Kaduna', 'Kano'], [])

  const showCustomPropertyType = values.property_type === 'Other' || (!!values.property_type && !PROPERTY_TYPE_OPTIONS.includes(values.property_type))
  const selectedPropertyType = PROPERTY_TYPE_OPTIONS.includes(values.property_type) ? values.property_type : 'Other'

  const alternativeAreas = useMemo(() => {
    return values.alternative_areas
      .split(',')
      .map(area => area.trim())
      .filter(Boolean)
  }, [values.alternative_areas])

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

      onSuccess?.(result)
      setValues({ ...defaultValues, ...initialValues })
      setErrors({})
    } catch (error) {
      console.error('[property request create]', error)
      setErrors({ form: error instanceof Error ? error.message : 'Unable to save request.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <form id="property-request-form" onSubmit={handleSubmit} className="space-y-6">
        {errors.form && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {errors.form}
          </div>
        )}

        <section className="space-y-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">What are you looking for?</h2>
            <p className="mt-1 text-sm text-slate-500">Choose how you want to move.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {PURPOSE_OPTIONS.map(({ value, title, description, icon: Icon }) => {
              const selected = values.purpose === value

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateField('purpose', value)}
                  className={`group min-h-[110px] rounded-2xl border p-3 text-left transition-all duration-200 ${
                    selected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-white/15 text-white' : 'bg-white text-blue-600'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {selected && <Check className="h-4 w-4 text-white" />}
                  </div>

                  <div className="mt-4">
                    <p className="text-base font-bold">{title}</p>
                    <p className={`mt-1 text-sm ${selected ? 'text-blue-50' : 'text-slate-500'}`}>{description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {errors.purpose && <p className="text-sm text-red-500">{errors.purpose}</p>}

          <div className="space-y-2 pt-1">
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

        <section className="space-y-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Where?</h2>
            <p className="mt-1 text-sm text-slate-500">Tell us the locations you have in mind.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">State</label>
              <select
                value={values.state}
                onChange={e => updateField('state', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select state</option>
                {stateOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
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

        <section className="space-y-4 border-b border-slate-200 pb-5">
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

        <section className="space-y-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Property Details</h2>
            <p className="mt-1 text-sm text-slate-500">Choose the layout and feel that suits your day-to-day life.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Bedrooms</label>
              <div className="flex flex-wrap gap-2">
                {['Studio', '1', '2', '3', '4', '5+'].map(option => {
                  const selected = values.bedrooms === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField('bedrooms', option)}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        selected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Bathrooms</label>
              <div className="flex flex-wrap gap-2">
                {['Any', '1', '2', '3', '4+'].map(option => {
                  const selected = values.bathrooms === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField('bathrooms', option)}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        selected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Furnishing</label>
              <div className="grid grid-cols-2 gap-2">
                {FURNISHING_OPTIONS.map(option => {
                  const selected = values.furnishing === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField('furnishing', option)}
                      className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Move-in Timeline</label>
              <div className="grid grid-cols-2 gap-2">
                {MOVE_IN_OPTIONS.map(option => {
                  const selected = values.move_in_timeline === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField('move_in_timeline', option)}
                      className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
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

        <section className="space-y-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Must-haves</h2>
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

        <section className="space-y-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Additional Notes</h2>
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

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {editingRequest ? 'Cancel Editing' : 'Cancel'}
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

import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation } from '@/lib/navigation'
import {
  Home, FileText, MapPin, DollarSign, BedDouble, Bath,
  Maximize2, Tag, CheckCircle, ArrowLeft, ImagePlus, X, Star,
  Wifi, Car, Dumbbell, Waves, Wind, Shield, Zap,
  Droplets, TreePine, UtensilsCrossed, Tv, Lock, Sun, Package,
  ReceiptText,
} from 'lucide-react'
import LandlordSidebar from '../../components/layout/LandlordSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient, getSupabaseImageUrl, isSupabaseConfigured } from '../../lib/supabase'
import type { Landlord } from '@/types'
import { NIGERIAN_STATES, POPULAR_AREAS } from '../../lib/nigerianStates'
import LocationField from '../../components/property/LocationField'
import { MoneyInput } from '../../components/ui/money-input'
import { digitsToNumber, formatNaira } from '../../lib/currency'
import { getFeeConfig, calcFeeBreakdown, type FeeConfig } from '../../lib/fees'
import { subscribeListingRulesChange } from '../../lib/settings-store'
import { getListingSettings, type ListingSettings } from '../../lib/platform-settings'

type FormData = {
  title: string; description: string; address: string; city: string
  price: string; bedrooms: string; bathrooms: string; area_sqft: string
  type: string; status: string; featured: boolean
  amenities: string[]
  agreement_fee: string
  other_charges: string
  latitude: string
  longitude: string
}

type ExistingImage = {
  id: string; property_id: string; storage_path: string; is_cover: boolean; sort_order: number | null; alt_text: string | null
}

const AMENITIES = [
  { icon: Wifi, label: 'High-Speed WiFi' },
  { icon: Car, label: 'Parking Space' },
  { icon: Dumbbell, label: 'Gym / Fitness' },
  { icon: Waves, label: 'Swimming Pool' },
  { icon: Wind, label: 'Air Conditioning' },
  { icon: Shield, label: '24/7 Security' },
  { icon: Zap, label: 'Backup Power' },
  { icon: Droplets, label: 'Running Water' },
  { icon: TreePine, label: 'Garden / Lawn' },
  { icon: UtensilsCrossed, label: 'Modern Kitchen' },
  { icon: Tv, label: 'Smart TV' },
  { icon: Lock, label: 'Smart Lock' },
  { icon: Sun, label: 'Solar Panels' },
  { icon: Package, label: 'Storage Room' },
]

const emptyForm: FormData = {
  title: '', description: '', address: '', city: '', price: '',
  bedrooms: '1', bathrooms: '1', area_sqft: '', type: 'rent', status: 'pending_review', featured: false,
  amenities: [], agreement_fee: '', other_charges: '', latitude: '', longitude: '',
}

const FIELD_CLASS = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
const SELECT_CLASS = FIELD_CLASS + ' cursor-pointer'

export default function LandlordListingForm() {
  const params = useParams<{ id?: string }>()
  const id = params?.id
  const [, navigate] = useLocation()
  const isEdit = !!id && id !== 'new'
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [user, setUser]         = useState<{ email?: string } | null>(null)
  const [form, setForm]         = useState<FormData>(emptyForm)
  const [loading, setLoading]   = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [error, setError]       = useState('')
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null)

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [coverIdx, setCoverIdx] = useState(0)
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [deletingImg, setDeletingImg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Listing rules from Admin → Settings (single source of truth).
  const [listingRules, setListingRules] = useState<ListingSettings | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let active = true
    getListingSettings().then(s => { if (active) setListingRules(s) })
    const unsub = subscribeListingRulesChange(() => {
      getListingSettings({ refresh: true }).then(s => { if (active) setListingRules(s) })
    })
    return () => { active = false; unsub() }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: l } = await supabase.from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      // Block unapproved landlords from creating/editing listings
      if (l && l.status !== 'approved') {
        if (l.status === 'not_submitted') { navigate('/landlord/onboarding'); return }
        if (l.status === 'pending')       { navigate('/landlord/pending');    return }
        if (l.status === 'rejected')      { navigate('/landlord/rejected');   return }
        if (l.status === 'suspended')     { navigate('/landlord/suspended');  return }
      }
      if (isEdit && id) {
        // Ownership check: scope the property fetch to this landlord's id so
        // navigating to /landlord/listings/{other-id}/edit returns no data.
        const [{ data: p }, { data: imgs }] = await Promise.all([
          supabase.from('properties').select('*')
            .eq('id', id)
            .eq('landlord_id', l?.id ?? '')
            .single(),
          supabase.from('property_images').select('*').eq('property_id', id).order('sort_order', { ascending: true }),
        ])
        if (!p) {
          // Property not found or belongs to another landlord — redirect away.
          navigate('/landlord/listings')
          return
        }
        setForm({
          title:       p.title ?? '',
          description: p.description ?? '',
          address:     p.address ?? '',
          city:        p.city ?? '',
          price:       String(p.price ?? ''),
          bedrooms:    String(p.bedrooms ?? 1),
          bathrooms:   String(p.bathrooms ?? 1),
          area_sqft:   String(p.area_sqft ?? ''),
          type:        p.type ?? 'rent',
          status:      p.status ?? 'available',
          featured:    p.featured ?? false,
          amenities:   p.amenities ?? [],
          agreement_fee: p.agreement_fee != null ? String(p.agreement_fee) : '',
          other_charges: p.other_charges != null ? String(p.other_charges) : '',
          latitude:    p.latitude ? String(p.latitude) : '',
          longitude:   p.longitude ? String(p.longitude) : '',
        })
        if (imgs) setExistingImages(imgs as ExistingImage[])
        setLoadingData(false)
      }
    })
  }, [isEdit, id])

  // Load the configured Agency Fee percentage once and keep it in sync when
  // the admin saves new Listing Rules while this form is open.
  useEffect(() => {
    let active = true
    getFeeConfig().then(cfg => { if (active) setFeeConfig(cfg) })
    const unsub = subscribeListingRulesChange(() => {
      getFeeConfig({ refresh: true }).then(cfg => { if (active) setFeeConfig(cfg) })
    })
    return () => { active = false; unsub() }
  }, [])

  function addFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    const newPreviews = newFiles.map(f => URL.createObjectURL(f))
    setImageFiles(prev => [...prev, ...newFiles])
    setImagePreviews(prev => [...prev, ...newPreviews])
  }

  function removeNewImage(idx: number) {
    URL.revokeObjectURL(imagePreviews[idx])
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
    if (coverIdx === idx) setCoverIdx(0)
    else if (coverIdx > idx) setCoverIdx(c => c - 1)
  }

  async function deleteExistingImage(img: ExistingImage) {
    // Ownership check: only delete images that belong to a property owned by
    // this landlord. existingImages is populated only after the ownership-
    // scoped fetch in useEffect, so img.id is already trusted — but we also
    // guard the DB delete with a landlord_id join via property_id.
    if (!landlord) return
    const supabase = createClient()
    // Verify the image's property belongs to this landlord before mutating.
    const { data: ownerCheck } = await supabase
      .from('properties')
      .select('id')
      .eq('id', img.property_id ?? id!)
      .eq('landlord_id', landlord.id)
      .single()
    if (!ownerCheck) {
      setError('Permission denied: this image does not belong to your listing.')
      return
    }
    setDeletingImg(img.id)
    await supabase.storage.from('property-images').remove([img.storage_path])
    await supabase.from('property_images').delete().eq('id', img.id)
    setExistingImages(prev => prev.filter(i => i.id !== img.id))
    setDeletingImg(null)
  }

  async function setCoverExisting(imgId: string) {
    if (!landlord || !id) return
    const supabase = createClient()
    // Ownership check: confirm this property belongs to the current landlord
    // before updating cover flags.
    const { data: ownerCheck } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('landlord_id', landlord.id)
      .single()
    if (!ownerCheck) {
      setError('Permission denied: this listing does not belong to you.')
      return
    }
    await supabase.from('property_images').update({ is_cover: false }).eq('property_id', id)
    await supabase.from('property_images').update({ is_cover: true }).eq('id', imgId)
    setExistingImages(prev => prev.map(i => ({ ...i, is_cover: i.id === imgId })))
  }

  async function uploadImages(propertyId: string): Promise<boolean> {
    if (imageFiles.length === 0) return true
    const supabase = createClient()
    const { data: { user: cu } } = await supabase.auth.getUser()
    if (!cu?.id) { setError('Not authenticated — please refresh and try again.'); return false }
    const hasExistingCover = existingImages.some(i => i.is_cover)
    const uploadErrors: string[] = []

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${cu.id}/${propertyId}/${Date.now()}-${i}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('property-images')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) {
        uploadErrors.push(`Photo ${i + 1}: ${uploadErr.message}`)
        continue
      }
      const { error: insertErr } = await supabase.from('property_images').insert({
        property_id: propertyId,
        storage_path: path,
        is_cover: !hasExistingCover && i === coverIdx,
        sort_order: existingImages.length + i,
        alt_text: form.title || null,
      })
      if (insertErr) {
        uploadErrors.push(`Photo ${i + 1} (db): ${insertErr.message}`)
      }
    }

    if (uploadErrors.length > 0) {
      setError(`Photos failed to upload:\n${uploadErrors.join('\n')}`)
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!landlord) return

    const supabase = createClient()
    const rules = listingRules
    const hasImages = imageFiles.length > 0 || existingImages.length > 0
    const description = form.description.trim()

    // Client-side validation before hitting the DB (honours admin Listing Rules)
    if (!form.title.trim())   { setError('Please enter a property title.'); return }
    if (!form.city.trim())    { setError('Please select a state.'); return }
    if (!form.address.trim()) { setError('Please enter an area or neighbourhood.'); return }
    if (!form.price || Number(form.price) <= 0) { setError('Please enter a valid price.'); return }
    if (rules?.requireDescription && !description) { setError('A property description is required for this listing.'); return }
    if (rules?.requireImages && !hasImages) { setError('At least one photo is required for this listing.'); return }

    // Enforce the per-landlord listing cap (new listings only).
    if (!isEdit && rules && rules.maxPerLandlord > 0) {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('landlord_id', landlord.id)
      if ((count ?? 0) >= rules.maxPerLandlord) {
        setError(`You've reached the maximum of ${rules.maxPerLandlord} active listings allowed on your account.`)
        return
      }
    }

    setLoading(true); setError('')
    const data = {
      landlord_id: landlord.id,
      title: form.title.trim(), description: description || null,
      address: form.address.trim(), city: form.city.trim(),
      price: digitsToNumber(form.price),
      agreement_fee: form.agreement_fee ? digitsToNumber(form.agreement_fee) : null,
      other_charges: form.other_charges ? digitsToNumber(form.other_charges) : null,
      bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
      area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
      type: form.type,
      // New listings always enter as pending_review; edits keep whatever status admin set.
      status: isEdit ? form.status : 'pending_review',
      featured: form.featured,
      amenities: form.amenities,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    }

    let ok = true
    if (isEdit && id) {
      // Ownership check: restrict the UPDATE to rows owned by this landlord.
      // Without this, any landlord could overwrite another's property by id.
      const { error: err } = await supabase
        .from('properties')
        .update(data)
        .eq('id', id)
        .eq('landlord_id', landlord.id)
      if (err) { setError(err.message); setLoading(false); return }
      ok = await uploadImages(id)
    } else {
      const { data: created, error: err } = await supabase.from('properties').insert(data).select('id').single()
      if (err || !created) { setError(err?.message ?? 'Failed to create listing'); setLoading(false); return }
      ok = await uploadImages(created.id)
    }
    setLoading(false)
    if (ok) navigate('/landlord/listings')
  }

  function set(field: keyof FormData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleLocation(loc: { latitude: number; longitude: number; address: string }) {
    setForm(f => ({
      ...f,
      latitude: loc.latitude ? String(loc.latitude) : '',
      longitude: loc.longitude ? String(loc.longitude) : '',
      address: loc.address || f.address,
    }))
  }

  const breakdown = calcFeeBreakdown(
    {
      price: digitsToNumber(form.price),
      agreement_fee: form.agreement_fee ? digitsToNumber(form.agreement_fee) : 0,
      other_charges: form.other_charges ? digitsToNumber(form.other_charges) : 0,
    },
    feeConfig ?? undefined,
  )

  if (loadingData) {
    return (
      <AuthGuard require="landlord">
        <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
          <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard require="landlord">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/landlord/listings')}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  {isEdit ? 'Edit Listing' : 'New Listing'}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isEdit ? 'Update your property details' : 'Fill in the details for your new property'}
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <div className="max-w-2xl">
              {error && (
                <div className="mb-5 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                  <span className="font-semibold">Error:</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <Home className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-gray-900">Basic Information</h2>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" /> Title *
                    </label>
                    <input required value={form.title}
                      onChange={e => set('title', e.target.value)}
                      placeholder="e.g. Modern 3-Bedroom Apartment in Lekki"
                      className={FIELD_CLASS} />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" /> Description
                    </label>
                    <textarea rows={4} value={form.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Describe the property, amenities, neighborhood…"
                      className={FIELD_CLASS + ' resize-none'} />
                  </div>
                </div>

                {/* Location & Price */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-gray-900">Location & Price</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">State *</label>
                      <select required value={form.city}
                        onChange={e => set('city', e.target.value)}
                        className={SELECT_CLASS}>
                        <option value="">Select state…</option>
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Area / Neighbourhood *</label>
                      <input required value={form.address}
                        onChange={e => set('address', e.target.value)}
                        placeholder={form.city && POPULAR_AREAS[form.city] ? `e.g. ${POPULAR_AREAS[form.city][0]}` : 'e.g. Lekki, Maitama…'}
                        list="landlord-area-suggestions"
                        className={FIELD_CLASS} />
                      {form.city && (POPULAR_AREAS[form.city]?.length ?? 0) > 0 && (
                        <datalist id="landlord-area-suggestions">
                          {(POPULAR_AREAS[form.city] ?? []).map(a => <option key={a} value={a} />)}
                        </datalist>
                      )}
                    </div>
                  </div>

                  {/* Smart location: search, Google Maps link or current location */}
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                    <LocationField
                      onLocation={handleLocation}
                      initialLatitude={form.latitude ? Number(form.latitude) : null}
                      initialLongitude={form.longitude ? Number(form.longitude) : null}
                      initialAddress={form.address}
                    />
                  </div>

                  {/* Charges */}
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" /> Rent Amount (₦) *
                      </label>
                      <MoneyInput
                        size="lg"
                        value={form.price}
                        onChange={v => set('price', v)}
                        placeholder="e.g. 1,500,000"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                        <ReceiptText className="w-3.5 h-3.5 text-gray-400" /> Agency Fee (auto)
                      </label>
                      <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 font-semibold flex items-center justify-between">
                        <span>{formatNaira(breakdown.agencyFee)}</span>
                        <span className="text-xs font-medium text-gray-400">
                          {feeConfig ? `${feeConfig.agencyFeePercent}% of rent` : '…'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                          <ReceiptText className="w-3.5 h-3.5 text-gray-400" /> Agreement Fee (₦)
                        </label>
                        <MoneyInput
                          size="lg"
                          value={form.agreement_fee}
                          onChange={v => set('agreement_fee', v)}
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                          <ReceiptText className="w-3.5 h-3.5 text-gray-400" /> Other Charges (₦)
                        </label>
                        <MoneyInput
                          size="lg"
                          value={form.other_charges}
                          onChange={v => set('other_charges', v)}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                        <Maximize2 className="w-3.5 h-3.5 text-gray-400" /> Area (sqft)
                      </label>
                      <input type="number" min="0" value={form.area_sqft}
                        onChange={e => set('area_sqft', e.target.value)}
                        placeholder="1200"
                        className={FIELD_CLASS} />
                    </div>
                  </div>

                  {/* Total Payable */}
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                      <ReceiptText className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-gray-900">Total Payable</h3>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Rent Amount</span><span className="font-semibold text-gray-900">{formatNaira(breakdown.rent)}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Agency Fee ({feeConfig ? `${feeConfig.agencyFeePercent}%` : '—'})</span><span className="font-semibold text-gray-900">{formatNaira(breakdown.agencyFee)}</span>
                      </div>
                      {breakdown.agreementFee > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Agreement Fee</span><span className="font-semibold text-gray-900">{formatNaira(breakdown.agreementFee)}</span>
                        </div>
                      )}
                      {breakdown.otherCharges > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Other Charges</span><span className="font-semibold text-gray-900">{formatNaira(breakdown.otherCharges)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                        <span className="font-bold text-gray-900">Total Payable</span>
                        <span className="font-extrabold text-blue-700">{formatNaira(breakdown.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-gray-900">Amenities</h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {AMENITIES.map((amenity) => {
                      const Icon = amenity.icon
                      const isSelected = form.amenities.includes(amenity.label)
                      return (
                        <button
                          key={amenity.label}
                          type="button"
                          onClick={() => {
                            setForm(f => ({
                              ...f,
                              amenities: isSelected
                                ? f.amenities.filter(a => a !== amenity.label)
                                : [...f.amenities, amenity.label]
                            }))
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          </div>
                          <span className="text-xs font-medium">{amenity.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Details */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-gray-900">Property Details</h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                        <BedDouble className="w-3.5 h-3.5 text-gray-400" /> Bedrooms
                      </label>
                      <select value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} className={SELECT_CLASS}>
                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                        <Bath className="w-3.5 h-3.5 text-gray-400" /> Bathrooms
                      </label>
                      <select value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} className={SELECT_CLASS}>
                        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Type</label>
                      <select value={form.type} onChange={e => set('type', e.target.value)} className={SELECT_CLASS}>
                        <option value="rent">For Rent</option>
                        <option value="sale">For Sale</option>
                        <option value="lease">Lease</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
                      <select value={form.status} onChange={e => set('status', e.target.value)} className={SELECT_CLASS}>
                        <option value="available">Available</option>
                        <option value="taken">Taken</option>
                        <option value="coming_soon">Coming Soon</option>
                        {listingRules?.allowNegotiation !== false && (
                          <option value="under_negotiation">Negotiating</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={form.featured}
                        onChange={e => set('featured', e.target.checked)}
                        className="sr-only peer" />
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                        form.featured ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                      }`}>
                        {form.featured && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Feature this listing</p>
                      <p className="text-xs text-gray-400 mt-0.5">Featured properties appear prominently in search results</p>
                    </div>
                  </label>
                </div>

                {/* Images */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <ImagePlus className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-gray-900">Photos</h2>
                    <span className="ml-auto text-xs text-gray-400">First photo will be the cover</span>
                  </div>

                  {/* Existing images (edit mode) */}
                  {existingImages.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Current photos</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {existingImages.map(img => (
                          <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200">
                            <img
                              src={getSupabaseImageUrl(img.storage_path)}
                              alt={img.alt_text ?? ''}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => setCoverExisting(img.id)}
                                title="Set as cover"
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${img.is_cover ? 'bg-amber-400 text-white' : 'bg-white/90 text-gray-700 hover:bg-amber-400 hover:text-white'}`}>
                                <Star className="w-3.5 h-3.5" fill={img.is_cover ? 'currentColor' : 'none'} />
                              </button>
                              <button type="button" onClick={() => deleteExistingImage(img)}
                                disabled={deletingImg === img.id}
                                title="Delete"
                                className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
                                {deletingImg === img.id
                                  ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                  : <X className="w-3.5 h-3.5" />
                                }
                              </button>
                            </div>
                            {img.is_cover && (
                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-400 rounded-md text-[9px] font-black text-white uppercase tracking-wide">Cover</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New image previews */}
                  {imagePreviews.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        New photos to upload ({imagePreviews.length})
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {imagePreviews.map((src, i) => (
                          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer"
                            style={{ borderColor: i === coverIdx && existingImages.length === 0 ? '#2563eb' : '#e5e7eb' }}
                            onClick={() => setCoverIdx(i)}>
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {i === coverIdx && existingImages.length === 0 && (
                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-blue-600 rounded-md text-[9px] font-black text-white uppercase tracking-wide">Cover</div>
                            )}
                            <button type="button"
                              onClick={e => { e.stopPropagation(); removeNewImage(i) }}
                              className="absolute top-1 right-1 w-6 h-6 bg-white/90 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center text-gray-700 transition-colors opacity-0 group-hover:opacity-100">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload area */}
                  <button type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:text-blue-600 transition-all">
                    <ImagePlus className="w-7 h-7" />
                    <div className="text-center">
                      <p className="text-sm font-semibold">Click to add photos</p>
                      <p className="text-xs mt-0.5">JPG, PNG or WEBP · Max 10MB each</p>
                    </div>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => addFiles(e.target.files)} />
                  {existingImages.length === 0 && imagePreviews.length > 1 && (
                    <p className="text-xs text-gray-400 text-center">Click on a photo to set it as the cover image</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20 text-sm">
                    {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create listing'}
                  </button>
                  <button type="button" onClick={() => navigate('/landlord/listings')}
                    className="px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

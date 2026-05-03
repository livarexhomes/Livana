import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'wouter'
import {
  Home, FileText, MapPin, DollarSign, BedDouble, Bath,
  Maximize2, Tag, CheckCircle, ArrowLeft,
} from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

type FormData = {
  title: string; description: string; address: string; city: string
  price: string; bedrooms: string; bathrooms: string; area_sqft: string
  type: string; status: string; featured: boolean
}

const emptyForm: FormData = {
  title: '', description: '', address: '', city: '', price: '',
  bedrooms: '1', bathrooms: '1', area_sqft: '', type: 'rent', status: 'available', featured: false,
}

const FIELD_CLASS = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
const SELECT_CLASS = FIELD_CLASS + ' cursor-pointer'

export default function LandlordListingForm() {
  const params = useParams<{ id?: string }>()
  const [, navigate] = useLocation()
  const isEdit = !!params.id && params.id !== 'new'
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [user, setUser]         = useState<{ email?: string } | null>(null)
  const [form, setForm]         = useState<FormData>(emptyForm)
  const [loading, setLoading]   = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [error, setError]       = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: l } = await supabase.from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (isEdit && params.id) {
        const { data: p } = await supabase.from('properties').select('*').eq('id', params.id).single()
        if (p) {
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
          })
        }
        setLoadingData(false)
      }
    })
  }, [isEdit, params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!landlord) return
    setLoading(true); setError('')
    const supabase = createClient()
    const data = {
      landlord_id: landlord.id,
      title: form.title, description: form.description || null,
      address: form.address, city: form.city,
      price: Number(form.price),
      bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
      area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
      type: form.type, status: form.status, featured: form.featured,
    }
    const { error: err } = isEdit && params.id
      ? await supabase.from('properties').update(data).eq('id', params.id)
      : await supabase.from('properties').insert(data)
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/landlord/listings')
  }

  function set(field: keyof FormData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

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
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Address *</label>
                      <input required value={form.address}
                        onChange={e => set('address', e.target.value)}
                        placeholder="Street address"
                        className={FIELD_CLASS} />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">City *</label>
                      <input required value={form.city}
                        onChange={e => set('city', e.target.value)}
                        placeholder="e.g. Lagos"
                        className={FIELD_CLASS} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" /> Price (₦) *
                      </label>
                      <input required type="number" min="0" value={form.price}
                        onChange={e => set('price', e.target.value)}
                        placeholder="1500000"
                        className={FIELD_CLASS} />
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
                        <option value="under_negotiation">Negotiating</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" id="featured" checked={form.featured}
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

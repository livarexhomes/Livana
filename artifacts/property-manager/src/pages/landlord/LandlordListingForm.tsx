import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'wouter'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

type FormData = {
  title: string
  description: string
  address: string
  city: string
  price: string
  bedrooms: string
  bathrooms: string
  area_sqft: string
  type: string
  status: string
  featured: boolean
}

const emptyForm: FormData = {
  title: '', description: '', address: '', city: '', price: '',
  bedrooms: '1', bathrooms: '1', area_sqft: '', type: 'rent', status: 'available', featured: false,
}

export default function LandlordListingForm() {
  const params = useParams<{ id?: string }>()
  const [, navigate] = useLocation()
  const isEdit = !!params.id && params.id !== 'new'
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [error, setError] = useState('')

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
            title: p.title ?? '',
            description: p.description ?? '',
            address: p.address ?? '',
            city: p.city ?? '',
            price: String(p.price ?? ''),
            bedrooms: String(p.bedrooms ?? 1),
            bathrooms: String(p.bathrooms ?? 1),
            area_sqft: String(p.area_sqft ?? ''),
            type: p.type ?? 'rent',
            status: p.status ?? 'available',
            featured: p.featured ?? false,
          })
        }
        setLoadingData(false)
      }
    })
  }, [isEdit, params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!landlord) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const data = {
      landlord_id: landlord.id,
      title: form.title,
      description: form.description || null,
      address: form.address,
      city: form.city,
      price: Number(form.price),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
      type: form.type,
      status: form.status,
      featured: form.featured,
    }
    if (isEdit && params.id) {
      const { error: err } = await supabase.from('properties').update(data).eq('id', params.id)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { error: err } = await supabase.from('properties').insert(data)
      if (err) { setError(err.message); setLoading(false); return }
    }
    navigate('/landlord/listings')
  }

  function set(field: keyof FormData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  if (loadingData) {
    return (
      <AuthGuard require="landlord">
        <div className="flex min-h-screen bg-gray-50">
          <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard require="landlord">
      <div className="flex min-h-screen bg-gray-50">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center px-6 bg-white border-b border-gray-100 shrink-0">
            <h1 className="font-semibold text-gray-900">{isEdit ? 'Edit Listing' : 'New Listing'}</h1>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              {error && <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                  <input required value={form.title} onChange={e => set('title', e.target.value)}
                    placeholder="e.g. Modern 3-Bedroom Apartment in Lekki"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="Describe the property..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address *</label>
                    <input required value={form.address} onChange={e => set('address', e.target.value)}
                      placeholder="Street address"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                    <input required value={form.city} onChange={e => set('city', e.target.value)}
                      placeholder="e.g. Lagos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₦) *</label>
                    <input required type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)}
                      placeholder="1500000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Area (sqft)</label>
                    <input type="number" min="0" value={form.area_sqft} onChange={e => set('area_sqft', e.target.value)}
                      placeholder="1200"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bedrooms</label>
                    <select value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]">
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bathrooms</label>
                    <select value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]">
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                    <select value={form.type} onChange={e => set('type', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]">
                      <option value="rent">For Rent</option>
                      <option value="sale">For Sale</option>
                      <option value="lease">Lease</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select value={form.status} onChange={e => set('status', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]">
                      <option value="available">Available</option>
                      <option value="taken">Taken</option>
                      <option value="coming_soon">Coming Soon</option>
                      <option value="under_negotiation">Under Negotiation</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="featured" checked={form.featured} onChange={e => set('featured', e.target.checked)}
                    className="w-4 h-4 text-[#6b9e6e] rounded border-gray-300 focus:ring-[#6b9e6e]" />
                  <label htmlFor="featured" className="text-sm font-medium text-gray-700">Feature this listing</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3 bg-[#6b9e6e] hover:bg-[#4a7f4d] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                    {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create listing'}
                  </button>
                  <button type="button" onClick={() => navigate('/landlord/listings')}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">
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

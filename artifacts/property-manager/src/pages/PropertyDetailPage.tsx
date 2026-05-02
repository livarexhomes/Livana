import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'wouter'
import { MapPin, BedDouble, Bath, Maximize, ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import { createClient, isSupabaseConfigured, getSupabaseImageUrl } from '../lib/supabase'
import type { PropertyWithLandlord, PropertyImage, Landlord } from '../lib/types'

type FullProperty = PropertyWithLandlord & {
  landlords: Pick<Landlord, 'id' | 'full_name' | 'whatsapp' | 'bio' | 'avatar_url' | 'is_verified'> | null
  property_images: (Pick<PropertyImage, 'id' | 'storage_path' | 'alt_text' | 'is_cover' | 'sort_order'>)[]
}

const statusLabels: Record<string, string> = {
  available: 'Available',
  taken: 'Taken',
  coming_soon: 'Coming Soon',
  under_negotiation: 'Under Negotiation',
}

const statusStyles: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  taken: 'bg-red-100 text-red-700',
  coming_soon: 'bg-blue-100 text-blue-700',
  under_negotiation: 'bg-yellow-100 text-yellow-700',
}

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [property, setProperty] = useState<FullProperty | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [enquiryMsg, setEnquiryMsg] = useState('')
  const [enquiryLoading, setEnquiryLoading] = useState(false)
  const [enquirySuccess, setEnquirySuccess] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured() || !params.id) { setLoading(false); return }
    const supabase = createClient()
    Promise.all([
      supabase
        .from('properties')
        .select('*, landlords(id, full_name, whatsapp, bio, avatar_url, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)')
        .eq('id', params.id)
        .single(),
      supabase.auth.getUser(),
    ]).then(async ([{ data: prop }, { data: { user } }]) => {
      if (!prop) { setNotFound(true); setLoading(false); return }
      setProperty(prop as FullProperty)
      setIsAuthenticated(!!user)
      if (user) {
        const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
        if (tenant) {
          setTenantId(tenant.id)
          const { data: sv } = await supabase.from('saved_properties').select('id').eq('tenant_id', tenant.id).eq('property_id', params.id!).single() as { data: { id: string } | null }
          setSaved(!!sv)
        }
      }
      setLoading(false)
    })
  }, [params.id])

  const images = (property?.property_images ?? [])
    .sort((a, b) => (a.is_cover ? -1 : b.is_cover ? 1 : (a.sort_order ?? 0) - (b.sort_order ?? 0)))

  async function handleSave() {
    if (!isAuthenticated) { navigate('/login'); return }
    if (!tenantId) { navigate('/user'); return }
    setSaving(true)
    const supabase = createClient()
    if (saved) {
      await supabase.from('saved_properties').delete().eq('tenant_id', tenantId).eq('property_id', params.id!)
      setSaved(false)
    } else {
      await (supabase.from('saved_properties').insert({ tenant_id: tenantId, property_id: params.id! }) as unknown as Promise<unknown>)
      setSaved(true)
    }
    setSaving(false)
  }

  async function handleEnquiry(e: React.FormEvent) {
    e.preventDefault()
    if (!isAuthenticated) { navigate('/login'); return }
    if (!tenantId) { navigate('/user'); return }
    setEnquiryLoading(true)
    const supabase = createClient()
    await (supabase.from('enquiries').insert({
      tenant_id: tenantId,
      property_id: params.id!,
      landlord_id: property?.landlords?.id ?? null,
      message: enquiryMsg,
    }) as unknown as Promise<unknown>)
    setEnquirySuccess(true)
    setEnquiryLoading(false)
    setEnquiryMsg('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  if (notFound || !property) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property not found</h1>
          <p className="text-gray-500 mb-6">This listing may have been removed or doesn't exist.</p>
          <Link href="/listings" className="px-5 py-2.5 bg-[#6b9e6e] text-white rounded-lg font-medium">Browse Listings</Link>
        </div>
      </div>
    )
  }

  const landlord = property.landlords
  const whatsappUrl = landlord
    ? `https://wa.me/${landlord.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in: ${property.title}`)}`
    : null

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicNavbar />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">Home</Link>
          <span>/</span>
          <Link href="/listings" className="hover:text-gray-900">Listings</Link>
          <span>/</span>
          <span className="text-gray-900 truncate max-w-xs">{property.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery */}
            <div className="relative aspect-[16/9] bg-gray-200 rounded-2xl overflow-hidden">
              {images.length > 0 ? (
                <>
                  <img
                    src={getSupabaseImageUrl(images[imgIndex]?.storage_path)}
                    alt={images[imgIndex]?.alt_text ?? property.title}
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button onClick={() => setImgIndex(i => (i - 1 + images.length) % images.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={() => setImgIndex(i => (i + 1) % images.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                          <button key={i} onClick={() => setImgIndex(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No images available</div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={img.id} onClick={() => setImgIndex(i)}
                    className={`shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === imgIndex ? 'border-[#6b9e6e]' : 'border-transparent'}`}>
                    <img src={getSupabaseImageUrl(img.storage_path)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
                  <div className="flex items-center gap-1.5 text-gray-500 mt-2 text-sm">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{property.address}, {property.city}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[property.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {statusLabels[property.status] ?? property.status}
                </span>
              </div>

              <p className="text-3xl font-bold text-gray-900 mb-5">
                ₦{Number(property.price).toLocaleString()}
                {property.type === 'rent' && <span className="text-lg font-normal text-gray-500">/year</span>}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-100">
                <span className="flex items-center gap-2"><BedDouble className="w-4 h-4 text-gray-400" />{property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-2"><Bath className="w-4 h-4 text-gray-400" />{property.bathrooms} bathroom{property.bathrooms !== 1 ? 's' : ''}</span>
                {property.area_sqft && <span className="flex items-center gap-2"><Maximize className="w-4 h-4 text-gray-400" />{property.area_sqft.toLocaleString()} sqft</span>}
                <span className="capitalize px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium">For {property.type}</span>
              </div>

              {property.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{property.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  saved ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                {saved ? 'Saved' : 'Save Property'}
              </button>

              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25d366] hover:bg-[#1ebe5d] text-white font-semibold text-sm transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Contact on WhatsApp
                </a>
              )}

              <button
                onClick={() => setEnquiryOpen(!enquiryOpen)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#6b9e6e] hover:bg-[#4a7f4d] text-white font-semibold text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Send Enquiry
              </button>

              {enquiryOpen && (
                <div className="pt-2">
                  {enquirySuccess ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center">
                      Enquiry sent! The landlord will get back to you.
                    </div>
                  ) : (
                    <form onSubmit={handleEnquiry} className="space-y-3">
                      <textarea
                        value={enquiryMsg}
                        onChange={e => setEnquiryMsg(e.target.value)}
                        required
                        rows={4}
                        placeholder="Write your message..."
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e] resize-none"
                      />
                      <button
                        type="submit"
                        disabled={enquiryLoading || enquiryMsg.length < 10}
                        className="w-full py-2.5 bg-[#6b9e6e] hover:bg-[#4a7f4d] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        {enquiryLoading ? 'Sending...' : 'Send message'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Landlord */}
            {landlord && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Listed by</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#6b9e6e] to-[#aadb5a] flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">{landlord.full_name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900 text-sm">{landlord.full_name}</p>
                      {landlord.is_verified && (
                        <svg className="w-4 h-4 text-[#6b9e6e]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {landlord.is_verified && <p className="text-xs text-[#6b9e6e] font-medium">Verified Landlord</p>}
                  </div>
                </div>
                {landlord.bio && <p className="text-xs text-gray-500 leading-relaxed">{landlord.bio}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

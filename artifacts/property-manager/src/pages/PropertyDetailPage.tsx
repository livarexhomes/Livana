import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'wouter'
import { MapPin, BedDouble, Bath, Maximize, ChevronLeft, ChevronRight, Heart, MessageCircle, ArrowLeft, Share2, CheckCircle } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import { createClient, isSupabaseConfigured, getSupabaseImageUrl } from '../lib/supabase'
import type { PropertyWithLandlord, PropertyImage, Landlord } from '../lib/types'

type FullProperty = PropertyWithLandlord & {
  landlords: Pick<Landlord, 'id' | 'full_name' | 'whatsapp' | 'bio' | 'avatar_url' | 'is_verified'> | null
  property_images: (Pick<PropertyImage, 'id' | 'storage_path' | 'alt_text' | 'is_cover' | 'sort_order'>)[]
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  available:         { label: 'Available',         cls: 'bg-green-100 text-green-700' },
  taken:             { label: 'Taken',              cls: 'bg-red-100 text-red-700' },
  coming_soon:       { label: 'Coming Soon',        cls: 'bg-blue-100 text-blue-700' },
  under_negotiation: { label: 'Under Negotiation', cls: 'bg-amber-100 text-amber-700' },
}

const TYPE_LABEL: Record<string, string> = {
  rent: 'For Rent', sale: 'For Sale', lease: 'Lease', commercial: 'Commercial',
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
  const [copied, setCopied] = useState(false)

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
      await supabase.from('saved_properties').insert({ tenant_id: tenantId, property_id: params.id! })
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
    await supabase.from('enquiries').insert({
      tenant_id: tenantId,
      property_id: params.id!,
      landlord_id: property?.landlords?.id ?? null,
      message: enquiryMsg,
    })
    setEnquirySuccess(true)
    setEnquiryLoading(false)
    setEnquiryMsg('')
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: property?.title ?? 'Livana Listing', url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  if (notFound || !property) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-24">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-9 h-9 text-gray-300" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property not found</h1>
          <p className="text-gray-500 mb-6">This listing may have been removed or doesn't exist.</p>
          <Link href="/listings" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">Browse Listings</Link>
        </div>
      </div>
    )
  }

  const landlord = property.landlords
  const whatsappUrl = landlord?.whatsapp
    ? `https://wa.me/${landlord.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in: ${property.title}`)}`
    : null
  const statusCfg = STATUS_CONFIG[property.status] ?? { label: property.status, cls: 'bg-gray-100 text-gray-600' }
  const landlordInitials = landlord?.full_name ? landlord.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB]">
      <PublicNavbar />

      {/* Spacer for fixed navbar */}
      <div className="h-[72px]" />

      {/* Breadcrumb + Back */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate('/listings')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <span className="text-gray-200">·</span>
          <Link href="/listings" className="hover:text-gray-900 transition-colors">Listings</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-xs">{property.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Gallery */}
            <div className="rounded-2xl overflow-hidden bg-gray-200 shadow-sm">
              <div className="relative aspect-[16/10]">
                {images.length > 0 ? (
                  <>
                    <img
                      src={getSupabaseImageUrl(images[imgIndex]?.storage_path)}
                      alt={images[imgIndex]?.alt_text ?? property.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                    {images.length > 1 && (
                      <>
                        <button onClick={() => setImgIndex(i => (i - 1 + images.length) % images.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105">
                          <ChevronLeft className="w-5 h-5 text-gray-800" />
                        </button>
                        <button onClick={() => setImgIndex(i => (i + 1) % images.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105">
                          <ChevronRight className="w-5 h-5 text-gray-800" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, i) => (
                            <button key={i} onClick={() => setImgIndex(i)}
                              className={`rounded-full transition-all ${i === imgIndex ? 'bg-white w-5 h-2' : 'w-2 h-2 bg-white/60 hover:bg-white/90'}`} />
                          ))}
                        </div>
                        <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                          {imgIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                    <MapPin className="w-10 h-10 text-gray-300" />
                    <p className="text-sm">No photos yet</p>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto bg-white border-t border-gray-100">
                  {images.map((img, i) => (
                    <button key={img.id} onClick={() => setImgIndex(i)}
                      className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === imgIndex ? 'border-blue-600 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={getSupabaseImageUrl(img.storage_path)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title + Key Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              {/* Status + Type row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.cls}`}>{statusCfg.label}</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">{TYPE_LABEL[property.type] ?? property.type}</span>
                {property.featured && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">⭐ Featured</span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug mb-2">{property.title}</h1>

              <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-5">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{property.address}, {property.city}</span>
              </div>

              {/* Price */}
              <div className="flex items-end gap-2 mb-5 pb-5 border-b border-gray-100">
                <p className="text-3xl font-extrabold text-gray-900">
                  ₦{Number(property.price).toLocaleString()}
                </p>
                {property.type === 'rent' && <span className="text-base font-normal text-gray-400 mb-0.5">/year</span>}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <BedDouble className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-gray-900">{property.bedrooms}</p>
                  <p className="text-xs text-gray-500">Bedroom{property.bedrooms !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <Bath className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-gray-900">{property.bathrooms}</p>
                  <p className="text-xs text-gray-500">Bathroom{property.bathrooms !== 1 ? 's' : ''}</p>
                </div>
                {property.area_sqft ? (
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Maximize className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-lg font-extrabold text-gray-900">{property.area_sqft.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">sq ft</p>
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900 truncate">{property.city}</p>
                    <p className="text-xs text-gray-500">Location</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                <h3 className="font-bold text-gray-900 mb-3">About this property</h3>
                <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">{property.description}</p>
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">

            {/* Action card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 lg:sticky lg:top-24">
              {/* WhatsApp */}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: '#25D366' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Contact on WhatsApp
                </a>
              )}

              {/* Send Enquiry */}
              <button
                onClick={() => setEnquiryOpen(!enquiryOpen)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4" />
                Send Enquiry
              </button>

              {enquiryOpen && (
                <div className="pt-1">
                  {enquirySuccess ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center flex flex-col items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>Enquiry sent! The landlord will respond soon.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleEnquiry} className="space-y-3">
                      <textarea
                        value={enquiryMsg}
                        onChange={e => setEnquiryMsg(e.target.value)}
                        required rows={4}
                        placeholder="Write your message to the landlord..."
                        className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 focus:bg-white transition-all"
                      />
                      <button type="submit" disabled={enquiryLoading || enquiryMsg.length < 10}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                        {enquiryLoading ? 'Sending…' : 'Send message'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Secondary actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={saving}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                    saved ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}>
                  <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  {saved ? 'Saved' : 'Save'}
                </button>
                <button onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 font-semibold text-sm transition-all">
                  <Share2 className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>

            {/* Landlord card */}
            {landlord && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide text-gray-500">Listed by</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white font-bold text-sm">{landlordInitials}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-gray-900">{landlord.full_name}</p>
                      {landlord.is_verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-full text-[11px] font-semibold text-blue-700">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Landlord on Livana</p>
                  </div>
                </div>
                {landlord.bio && (
                  <p className="text-xs text-gray-500 leading-relaxed mt-2 pt-3 border-t border-gray-100">{landlord.bio}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

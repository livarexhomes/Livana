import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'wouter'
import {
  MapPin, BedDouble, Bath, Maximize, ChevronLeft, ChevronRight,
  Heart, MessageCircle, ArrowLeft, Share2, CheckCircle, Send,
  LogIn, UserPlus, MessageSquare,
} from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import { createClient, isSupabaseConfigured, getSupabaseImageUrl } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import type { PropertyWithLandlord, PropertyImage, Landlord } from '../lib/types'

type FullProperty = PropertyWithLandlord & {
  landlords: Pick<Landlord, 'id' | 'full_name' | 'whatsapp' | 'bio' | 'avatar_url' | 'is_verified'> | null
  property_images: (Pick<PropertyImage, 'id' | 'storage_path' | 'alt_text' | 'is_cover' | 'sort_order'>)[]
}

type Comment = {
  id: string
  tenant_name: string
  message: string
  created_at: string
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

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [property, setProperty] = useState<FullProperty | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const [saved, setSaved]       = useState(false)
  const [saving, setSaving]     = useState(false)

  const [userRole, setUserRole] = useState<'guest' | 'tenant' | 'landlord' | 'admin'>('guest')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string>('')

  const [enquiryOpen, setEnquiryOpen]       = useState(false)
  const [enquiryMsg, setEnquiryMsg]         = useState('')
  const [enquiryLoading, setEnquiryLoading] = useState(false)
  const [enquirySuccess, setEnquirySuccess] = useState(false)

  const [copied, setCopied]   = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentsReady, setCommentsReady] = useState(false)

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

      if (user) {
        if (isAdminUser(user)) {
          setUserRole('admin')
        } else {
          const [{ data: tenant }, { data: landlord }] = await Promise.all([
            supabase.from('tenants').select('id, full_name').eq('user_id', user.id).single() as unknown as Promise<{ data: { id: string; full_name: string } | null }>,
            supabase.from('landlords').select('id').eq('user_id', user.id).single() as unknown as Promise<{ data: { id: string } | null }>,
          ])
          if (tenant) {
            setUserRole('tenant')
            setTenantId(tenant.id)
            setTenantName(tenant.full_name)
            const { data: sv } = await supabase.from('saved_properties').select('id').eq('tenant_id', tenant.id).eq('property_id', params.id!).single() as { data: { id: string } | null }
            setSaved(!!sv)
          } else if (landlord) {
            setUserRole('landlord')
          }
        }
      }
      setLoading(false)
    })

    // Load comments (graceful if table missing)
    supabase
      .from('property_comments')
      .select('id, tenant_name, message, created_at')
      .eq('property_id', params.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setComments((data as Comment[]) ?? [])
        setCommentsReady(true)
      }, () => setCommentsReady(true))
  }, [params.id])

  const images = (property?.property_images ?? [])
    .sort((a, b) => (a.is_cover ? -1 : b.is_cover ? 1 : (a.sort_order ?? 0) - (b.sort_order ?? 0)))

  async function handleSave() {
    if (userRole === 'guest') { navigate('/login'); return }
    if (userRole !== 'tenant' || !tenantId) return
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
    if (!tenantId || !property) return
    setEnquiryLoading(true)
    const supabase = createClient()
    await supabase.from('enquiries').insert({
      tenant_id: tenantId,
      property_id: params.id!,
      landlord_id: property.landlords?.id ?? null,
      message: enquiryMsg,
    })
    setEnquirySuccess(true)
    setEnquiryLoading(false)
    setEnquiryMsg('')
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !commentText.trim()) return
    setCommentLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('property_comments').insert({
      property_id: params.id!,
      tenant_id: tenantId,
      tenant_name: tenantName,
      message: commentText.trim(),
    }).select().single()
    if (!error && data) {
      setComments(prev => [data as Comment, ...prev])
      setCommentText('')
    }
    setCommentLoading(false)
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: property?.title ?? 'LIVAREX Listing', url: window.location.href })
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
  const emailUrl = `mailto:support@livarex.com?subject=${encodeURIComponent(`Enquiry: ${property.title}`)}`
  const statusCfg = STATUS_CONFIG[property.status] ?? { label: property.status, cls: 'bg-gray-100 text-gray-600' }
  const landlordInitials = landlord?.full_name ? landlord.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB]">
      <PublicNavbar />
      <div className="h-[72px]" />

      {/* Breadcrumb */}
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
          <div className="lg:col-span-2 space-y-5 order-1 lg:order-none">

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
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar bg-white border-t border-gray-100">
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
              <div className="flex items-end gap-2 mb-5 pb-5 border-b border-gray-100">
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">₦{Number(property.price).toLocaleString()}</p>
                {property.type === 'rent' && <span className="text-sm sm:text-base font-normal text-gray-400 mb-0.5">/year</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
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

            {/* ── Comments Section ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">
                  Comments {commentsReady && comments.length > 0 && (
                    <span className="text-gray-400 font-normal">({comments.length})</span>
                  )}
                </h3>
              </div>

              {/* Post comment — tenants only */}
              {userRole === 'tenant' && (
                <form onSubmit={handleComment} className="flex gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-white">
                      {tenantName ? tenantName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'T'}
                    </span>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Add a comment about this property…"
                      required
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                    />
                    <button type="submit" disabled={commentLoading || commentText.trim().length < 3}
                      className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Guest prompt */}
              {userRole === 'guest' && (
                <div className="mb-5 flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <MessageCircle className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-700 flex-1">Sign in to leave a comment.</p>
                  <div className="flex gap-2">
                    <Link href="/login" className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                      <LogIn className="w-3 h-3" /> Sign in
                    </Link>
                    <Link href="/register" className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <UserPlus className="w-3 h-3" /> Join
                    </Link>
                  </div>
                </div>
              )}

              {/* Landlord / admin note */}
              {(userRole === 'landlord' || userRole === 'admin') && (
                <div className="mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-400 text-center">
                  Only tenants can post comments on listings.
                </div>
              )}

              {/* Comments list */}
              {!commentsReady ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map(c => {
                    const initials = c.tenant_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                    return (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-[10px] font-bold text-white">{initials}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">{c.tenant_name}</span>
                            <span className="text-[11px] text-gray-400">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-4 py-3">{c.message}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4 order-first lg:order-none">

            {/* ── Contact card (redesigned) ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden lg:sticky lg:top-24">

              {/* Price header strip */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-50">
                <p className="text-2xl font-extrabold text-gray-900">₦{Number(property.price).toLocaleString()}</p>
                {property.type === 'rent' && <p className="text-xs text-gray-400 mt-0.5">per year</p>}
              </div>

              <div className="p-5 space-y-3">
                {/* WhatsApp — redesigned */}
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border-2 border-[#25D366]/30 hover:border-[#25D366]/60 bg-[#25D366]/5 hover:bg-[#25D366]/10 transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-800">Chat on WhatsApp</p>
                      <p className="text-xs text-gray-400">Talk to the landlord directly</p>
                    </div>
                  </a>
                )}

                {/* Email */}
                <a href={emailUrl}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border-2 border-blue-100 hover:border-blue-300 bg-blue-50/40 hover:bg-blue-50 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800">Send Email</p>
                    <p className="text-xs text-gray-400">support@livarex.com</p>
                  </div>
                </a>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400 font-medium">or</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Send Enquiry (tenant only) */}
                {userRole === 'tenant' ? (
                  <>
                    <button
                      onClick={() => { setEnquiryOpen(!enquiryOpen); setEnquirySuccess(false) }}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm transition-all active:scale-[0.98]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {enquiryOpen ? 'Close Enquiry' : 'Send Enquiry'}
                    </button>

                    {enquiryOpen && (
                      <div>
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
                              placeholder="Write your message to the landlord…"
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
                  </>
                ) : userRole === 'guest' ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center space-y-2">
                    <p className="text-sm text-gray-600 font-medium">Sign up as a tenant to send enquiries</p>
                    <div className="flex gap-2">
                      <Link href="/login" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors">
                        <LogIn className="w-3.5 h-3.5" /> Sign in
                      </Link>
                      <Link href="/register" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                        <UserPlus className="w-3.5 h-3.5" /> Register
                      </Link>
                    </div>
                  </div>
                ) : null}

                {/* Save + Share */}
                {userRole === 'tenant' && (
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
                )}

                {userRole === 'guest' && (
                  <button onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 font-semibold text-sm transition-all">
                    <Share2 className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Share listing'}
                  </button>
                )}
              </div>
            </div>

            {/* Landlord card */}
            {landlord && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide text-gray-500">Listed by</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    {landlord.avatar_url
                      ? <img src={landlord.avatar_url} alt={landlord.full_name ?? ''} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                      : <span className="text-white font-bold text-sm">{landlordInitials}</span>
                    }
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
                    <p className="text-xs text-gray-400 mt-0.5">Landlord on LIVAREX</p>
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

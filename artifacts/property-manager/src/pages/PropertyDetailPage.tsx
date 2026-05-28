import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, BedDouble, Bath, Maximize,
  Heart, MessageCircle, ArrowLeft, Share2, CheckCircle, Send,
  LogIn, UserPlus, MessageSquare, Building2, Calendar,
  ShieldCheck, Info, Mail,
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
    <div className="min-h-screen bg-[#FDFDFD] selection:bg-blue-100 selection:text-blue-900">
      <PublicNavbar />

      {/* ── HERO GALLERY ── */}
      <section className="pt-[72px] px-4 md:px-6 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-3 h-[400px] md:h-[550px] rounded-3xl overflow-hidden mt-4 relative">

          {/* Main large image */}
          <div className="md:col-span-2 md:row-span-2 relative overflow-hidden bg-gray-100">
            {images[0] ? (
              <motion.img
                initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }}
                src={getSupabaseImageUrl(images[0].storage_path)}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer"
                alt="Property main"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <Building2 className="w-12 h-12 text-gray-300" strokeWidth={1} />
              </div>
            )}
          </div>

          {/* Grid images */}
          <div className="hidden md:block col-span-1 row-span-1 relative overflow-hidden bg-gray-100">
            {images[1] && <img src={getSupabaseImageUrl(images[1].storage_path)} className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer" alt="" />}
          </div>
          <div className="hidden md:block col-span-1 row-span-1 relative overflow-hidden bg-gray-100 rounded-tr-3xl">
            {images[2] && <img src={getSupabaseImageUrl(images[2].storage_path)} className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer" alt="" />}
          </div>
          <div className="hidden md:block col-span-1 row-span-1 relative overflow-hidden bg-gray-100">
            {images[3] && <img src={getSupabaseImageUrl(images[3].storage_path)} className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer" alt="" />}
          </div>
          <div className="hidden md:block col-span-1 row-span-1 relative overflow-hidden bg-gray-100 rounded-br-3xl">
            {images[4] ? (
              <>
                <img src={getSupabaseImageUrl(images[4].storage_path)} className="w-full h-full object-cover" alt="" />
                {images.length > 5 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px] cursor-pointer">
                    <span className="text-white font-bold text-lg">+{images.length - 4} photos</span>
                  </div>
                )}
              </>
            ) : <div className="w-full h-full bg-gray-50" />}
          </div>

          {/* Floating back button */}
          <div className="absolute top-6 left-6">
            <button onClick={() => navigate('/listings')}
              className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm hover:bg-white transition-all active:scale-95 group">
              <ArrowLeft className="w-5 h-5 text-gray-700 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Floating share/save */}
          <div className="absolute top-6 right-6 flex gap-2">
            <button onClick={handleShare}
              className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm hover:bg-white transition-all active:scale-95">
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
            {userRole === 'tenant' && (
              <button onClick={handleSave}
                className={`p-3 backdrop-blur-md rounded-2xl shadow-sm transition-all active:scale-95 ${saved ? 'bg-rose-500 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'}`}>
                <Heart className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 pb-28 lg:pb-10">
        <div className="grid lg:grid-cols-[1fr_380px] gap-12">

          {/* LEFT COLUMN */}
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="space-y-10"
          >
            {/* Header */}
            <section>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.cls}`}>{statusCfg.label.toUpperCase()}</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">{TYPE_LABEL[property.type]}</span>
                {landlord?.is_verified && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Listing
                  </span>
                )}
                {property.featured && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase">⭐ Featured</span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.1] mb-4">{property.title}</h1>
              <div className="flex items-center gap-3 text-gray-500 text-base">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                {[property.address, property.city].filter(Boolean).join(', ')}
              </div>
            </section>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <BedDouble className="w-6 h-6 text-blue-600" strokeWidth={1.5} />, value: property.bedrooms, label: 'Bedrooms' },
                { icon: <Bath className="w-6 h-6 text-blue-600" strokeWidth={1.5} />, value: property.bathrooms, label: 'Bathrooms' },
                ...(property.area_sqft ? [{ icon: <Maximize className="w-6 h-6 text-blue-600" strokeWidth={1.5} />, value: property.area_sqft.toLocaleString(), label: 'Sq. Ft.' }] : []),
                { icon: <Calendar className="w-6 h-6 text-blue-600" strokeWidth={1.5} />, value: new Date(property.created_at).getFullYear(), label: 'Listed' },
              ].map(({ icon, value, label }) => (
                <div key={label} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  {icon}
                  <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
                  <p className="text-sm text-gray-400 font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {property.description && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  About this home <Info className="w-5 h-5 text-gray-300" />
                </h2>
                <p className="text-gray-600 leading-relaxed text-base whitespace-pre-line max-w-3xl">{property.description}</p>
              </section>
            )}

            <hr className="border-gray-100" />

            {/* Comments */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                Community Talk <span className="text-gray-300 font-normal text-xl">({comments.length})</span>
              </h2>

              {userRole === 'tenant' && (
                <div className="flex gap-4 bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold shadow-lg shadow-blue-200 text-lg">
                    {tenantName ? tenantName[0].toUpperCase() : 'T'}
                  </div>
                  <form onSubmit={handleComment} className="flex-1 flex flex-col gap-3">
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                      placeholder="Ask a question or share your thoughts..."
                      className="w-full bg-transparent border-none focus:ring-0 text-gray-800 placeholder:text-gray-400 resize-none py-2 outline-none"
                      rows={2} />
                    <div className="flex justify-end">
                      <button disabled={commentLoading || !commentText.trim()}
                        className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-800 transition-all flex items-center gap-2">
                        Post <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {userRole === 'guest' && (
                <div className="flex items-center gap-3 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                  <MessageCircle className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-700 flex-1">Sign in to join the conversation.</p>
                  <div className="flex gap-2">
                    <Link href="/login" className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"><LogIn className="w-3 h-3" /> Sign in</Link>
                    <Link href="/register" className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><UserPlus className="w-3 h-3" /> Join</Link>
                  </div>
                </div>
              )}

              {!commentsReady ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">No comments yet. Be the first!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence mode="popLayout">
                    {comments.map((c, i) => (
                      <motion.div key={c.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 font-bold text-sm">
                          {c.tenant_name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-gray-900 text-sm">{c.tenant_name}</span>
                            <span className="text-xs text-gray-400">· {timeAgo(c.created_at)}</span>
                          </div>
                          <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm text-gray-600 leading-relaxed text-sm">{c.message}</div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </motion.div>

          {/* RIGHT SIDEBAR */}
          <aside>
            <div className="sticky top-24 space-y-5">

              {/* Pricing & contact card */}
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
                <div className="p-7">
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-black text-gray-900 tracking-tight">₦{Number(property.price).toLocaleString()}</span>
                    {property.type === 'rent' && <span className="text-gray-400 font-medium ml-1">/yr</span>}
                  </div>

                  <div className="space-y-3">
                    {landlord?.whatsapp && (
                      <a href={`https://wa.me/${landlord.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in: ${property.title}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-green-200 transition-all active:scale-[0.98]">
                        <MessageSquare className="w-5 h-5" /> Chat on WhatsApp
                      </a>
                    )}
                    <button onClick={() => { setEnquiryOpen(!enquiryOpen); setEnquirySuccess(false) }}
                      className="flex items-center justify-center gap-3 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-[0.98]">
                      <Mail className="w-5 h-5" /> {enquiryOpen ? 'Close Enquiry' : 'Direct Enquiry'}
                    </button>
                  </div>

                  {enquiryOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 border-t border-gray-100 overflow-hidden">
                      {enquirySuccess ? (
                        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-center font-medium text-sm border border-emerald-100 flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Enquiry sent! The landlord will contact you shortly.
                        </div>
                      ) : (
                        <form onSubmit={handleEnquiry} className="space-y-3">
                          <textarea required value={enquiryMsg} onChange={e => setEnquiryMsg(e.target.value)}
                            placeholder="Tell the landlord why you're interested..."
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none" />
                          <button disabled={enquiryLoading || enquiryMsg.length < 10}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {enquiryLoading ? 'Sending…' : 'Send Message'}
                          </button>
                        </form>
                      )}
                    </motion.div>
                  )}

                  {userRole === 'guest' && (
                    <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center space-y-3">
                      <p className="text-sm text-gray-600 font-medium">Sign up to send enquiries</p>
                      <div className="flex gap-2">
                        <Link href="/login" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors">
                          <LogIn className="w-3.5 h-3.5" /> Sign in
                        </Link>
                        <Link href="/register" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                          <UserPlus className="w-3.5 h-3.5" /> Register
                        </Link>
                      </div>
                    </div>
                  )}

                  {userRole === 'tenant' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleSave} disabled={saving}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border transition-all ${saved ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                        <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} /> {saved ? 'Saved' : 'Save'}
                      </button>
                      <button onClick={handleShare}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 font-semibold text-sm transition-all">
                        <Share2 className="w-4 h-4" /> {copied ? 'Copied!' : 'Share'}
                      </button>
                    </div>
                  )}

                  {/* Landlord */}
                  {landlord && (
                    <div className="mt-7 pt-7 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Listed By</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 overflow-hidden ring-4 ring-blue-50/50 shrink-0">
                          {landlord.avatar_url
                            ? <img src={landlord.avatar_url} className="w-full h-full object-cover" alt={landlord.full_name ?? ''} onError={e => { (e.currentTarget as HTMLImageElement).style.display='none' }} />
                            : <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-sm">{landlordInitials}</div>
                          }
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{landlord.full_name}</p>
                          {landlord.is_verified
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle className="w-3 h-3" /> Verified landlord</span>
                            : <p className="text-xs text-gray-400">Landlord on Livana</p>
                          }
                        </div>
                      </div>
                      {landlord.bio && <p className="text-xs text-gray-500 leading-relaxed mt-3 pt-3 border-t border-gray-100">{landlord.bio}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Safety card */}
              <div className="bg-blue-50/60 rounded-[32px] p-6 border border-blue-100/60">
                <div className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-blue-900 mb-1">Livana Safety Tip</p>
                    <p className="text-xs text-blue-700/70 leading-relaxed">Always inspect the property in person before making any payments. We never ask for money via the platform.</p>
                  </div>
                </div>
              </div>

            </div>
          </aside>

        </div>
      </main>

      {/* Mobile action bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Price</span>
          <span className="text-xl font-black text-gray-900">₦{Number(property.price).toLocaleString()}</span>
        </div>
        <button onClick={() => { setEnquiryOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          className="bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-gray-200 hover:bg-gray-800 transition-colors">
          Contact Now
        </button>
      </div>

      <Footer />
    </div>
  )
}

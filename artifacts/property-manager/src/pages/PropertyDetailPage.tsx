import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, BedDouble, Bath, Maximize, Heart, MessageCircle,
  ArrowLeft, Share2, CheckCircle, Send, LogIn, UserPlus,
  MessageSquare, Building2, Calendar, ShieldCheck, Info,
  Mail, Wifi, Car, Dumbbell, Waves, Wind, Shield, Zap,
  Droplets, TreePine, UtensilsCrossed, Tv, Lock, Sun, Package,
  Eye,
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import { createClient, isSupabaseConfigured, getSupabaseImageUrl } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import type { PropertyWithLandlord, PropertyImage, Landlord } from '../lib/types'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const AMENITIES = [
  { icon: Wifi,            label: 'High-Speed WiFi' },
  { icon: Car,             label: 'Parking Space' },
  { icon: Dumbbell,        label: 'Gym / Fitness' },
  { icon: Waves,           label: 'Swimming Pool' },
  { icon: Wind,            label: 'Air Conditioning' },
  { icon: Shield,          label: '24/7 Security' },
  { icon: Zap,             label: 'Backup Power' },
  { icon: Droplets,        label: 'Running Water' },
  { icon: TreePine,        label: 'Garden / Lawn' },
  { icon: UtensilsCrossed, label: 'Modern Kitchen' },
  { icon: Tv,              label: 'Smart TV' },
  { icon: Lock,            label: 'Smart Lock' },
  { icon: Sun,             label: 'Solar Panels' },
  { icon: Package,         label: 'Storage Room' },
]

type ActiveTab = 'overview' | 'amenities' | 'location'

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

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  available:         { label: 'Available',        dot: 'bg-emerald-400', bg: 'bg-emerald-50/80', text: 'text-emerald-700' },
  taken:             { label: 'Taken',             dot: 'bg-red-400',     bg: 'bg-red-50/80',     text: 'text-red-700' },
  coming_soon:       { label: 'Coming Soon',       dot: 'bg-blue-400',    bg: 'bg-blue-50/80',    text: 'text-blue-700' },
  under_negotiation: { label: 'Under Negotiation', dot: 'bg-amber-400',   bg: 'bg-amber-50/80',   text: 'text-amber-700' },
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
  const [saved, setSaved]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [activeImg, setActiveImg] = useState(0)

  const [userRole, setUserRole] = useState<'guest' | 'tenant' | 'landlord' | 'admin'>('guest')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string>('')

  const [enquiryOpen, setEnquiryOpen]       = useState(false)
  const [enquiryMsg, setEnquiryMsg]         = useState('')
  const [enquiryLoading, setEnquiryLoading] = useState(false)
  const [enquirySuccess, setEnquirySuccess] = useState(false)

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [copied, setCopied]       = useState(false)
  const [comments, setComments]   = useState<Comment[]>([])
  const [commentText, setCommentText]     = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentsReady, setCommentsReady]   = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured() || !params.id) { setLoading(false); return }
    const supabase = createClient()

    async function init() {
      // getSession reads from local cache — no network round-trip, never returns
      // null for an already-authenticated user the way getUser() can on navigation.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null

      const { data: prop } = await supabase
        .from('properties')
        .select('*, landlords(id, full_name, whatsapp, bio, avatar_url, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)')
        .eq('id', params.id!)
        .single()

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
          // If neither tenant nor landlord row exists yet, the user is still
          // authenticated — treat as tenant so they don't see the sign-in prompt.
          else {
            setUserRole('tenant')
          }
        }
      }
      setLoading(false)
    }

    init()
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
      navigator.share({ title: property?.title ?? 'Livana Listing', url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading property…</p>
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !property) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-24">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-9 h-9 text-gray-300" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property not found</h1>
          <p className="text-gray-500 mb-6">This listing may have been removed or doesn't exist.</p>
          <Link href="/listings" className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors text-sm">Browse Listings</Link>
        </div>
      </div>
    )
  }

  const landlord = property.landlords
  const statusCfg = STATUS_CONFIG[property.status] ?? { label: property.status, dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600' }
  const landlordInitials = landlord?.full_name ? landlord.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'

  return (
    <div className="min-h-screen bg-[#F8F8F6] selection:bg-blue-100 selection:text-blue-900">
      <PublicNavbar />

      {/* ── GALLERY ── */}
      <section className="pt-[80px]">
        <div className="relative">
          {/* Main image */}
          <div className="relative h-[55vh] md:h-[70vh] overflow-hidden bg-gray-100">
            <AnimatePresence mode="wait">
              {images[activeImg] ? (
                <motion.img
                  key={activeImg}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  src={getSupabaseImageUrl(images[activeImg].storage_path)}
                  className="w-full h-full object-cover"
                  alt="Property"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Building2 className="w-16 h-16 text-gray-200" strokeWidth={1} />
                </div>
              )}
            </AnimatePresence>

            {/* Dark gradient overlay at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

            {/* Top controls */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
              <button
                onClick={() => navigate('/listings')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl text-sm font-semibold hover:bg-white/20 transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="p-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl hover:bg-white/20 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                {userRole === 'tenant' && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`p-2.5 backdrop-blur-md border rounded-2xl transition-all active:scale-95 ${
                      saved
                        ? 'bg-rose-500 border-rose-400 text-white'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.text} backdrop-blur-sm`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                  {statusCfg.label}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-sm text-white border border-white/20">
                  {TYPE_LABEL[property.type]}
                </span>
                {landlord?.is_verified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 backdrop-blur-sm text-emerald-300 border border-emerald-400/30">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
                {property.featured && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 backdrop-blur-sm text-amber-300 border border-amber-400/30">
                    ⭐ Featured
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-sm">
                {property.title}
              </h1>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <MapPin className="w-3.5 h-3.5 text-white/50 shrink-0" />
                {[property.address, property.city].filter(Boolean).join(', ')}, Nigeria
              </div>
            </div>

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
                <Eye className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/80 text-xs font-semibold">{activeImg + 1} / {images.length}</span>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-7xl mx-auto">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(i)}
                    className={`relative shrink-0 w-16 h-12 md:w-20 md:h-14 rounded-xl overflow-hidden transition-all ${
                      activeImg === i ? 'ring-2 ring-gray-900 ring-offset-1' : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={getSupabaseImageUrl(img.storage_path)} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 pb-32 lg:pb-12">
        <div className="grid lg:grid-cols-[1fr_400px] gap-10 xl:gap-14">

          {/* LEFT COLUMN */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="space-y-8 min-w-0"
          >
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: BedDouble, value: property.bedrooms,   label: 'Bedrooms',  suffix: '' },
                { icon: Bath,      value: property.bathrooms,  label: 'Bathrooms', suffix: '' },
                ...(property.area_sqft
                  ? [{ icon: Maximize, value: property.area_sqft.toLocaleString(), label: 'Sq. Ft.', suffix: '' }]
                  : []),
                { icon: Calendar,  value: new Date(property.created_at).getFullYear(), label: 'Year Listed', suffix: '' },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center mb-3 transition-colors">
                    <Icon className="w-4.5 h-4.5 text-gray-400 group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
                  </div>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
            {/* Tabs */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-gray-100">
                {([
                  { id: 'overview',  label: 'Overview' },
                  { id: 'amenities', label: 'Amenities' },
                  { id: 'location',  label: 'Location' },
                ] as { id: ActiveTab; label: string }[]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 py-4 text-sm font-bold transition-colors ${
                      activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="tab-line"
                        className="absolute bottom-0 left-4 right-4 h-[2px] bg-gray-900 rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6 md:p-8">
                <AnimatePresence mode="wait">

                  {activeTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-6"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
                          About this property <Info className="w-4 h-4 text-gray-300" />
                        </h2>
                        <p className="text-gray-500 leading-[1.8] text-[15px] whitespace-pre-line">
                          {property.description || 'No description provided for this listing.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {[
                          { label: 'Type',    value: TYPE_LABEL[property.type] ?? property.type },
                          { label: 'Status',  value: statusCfg.label },
                          { label: 'City',    value: property.city },
                          { label: 'Listed',  value: new Date(property.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                            <p className="text-sm font-bold text-gray-800">{value}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'amenities' && (
                    <motion.div
                      key="amenities"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-5"
                    >
                      <h2 className="text-lg font-bold text-gray-900">What this place offers</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                        {AMENITIES.map((amenity, i) => (
                          <motion.div
                            key={amenity.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                            className="group flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all cursor-default"
                          >
                            <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 group-hover:border-blue-100 group-hover:bg-blue-50 flex items-center justify-center shrink-0 transition-all shadow-sm">
                              <amenity.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
                            </div>
                            <span className="text-[13px] font-semibold text-gray-600 group-hover:text-gray-800 transition-colors">{amenity.label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'location' && (
                    <motion.div
                      key="location"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-5"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Where you'll be</h2>
                        <p className="text-sm text-gray-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          {[property.address, property.city].filter(Boolean).join(', ')}, Nigeria
                        </p>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-gray-100 h-[300px] md:h-[360px] shadow-sm">
                        <MapContainer
                          center={[6.5244, 3.3792]}
                          zoom={13}
                          scrollWheelZoom={false}
                          className="w-full h-full"
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <Marker position={[6.5244, 3.3792]}>
                            <Popup>
                              <span className="font-semibold text-gray-900 text-xs">{property.title}</span><br />
                              <span className="text-gray-400 text-xs">{property.address}, {property.city}</span>
                            </Popup>
                          </Marker>
                        </MapContainer>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { time: '5 min',  place: 'Falomo Bridge' },
                          { time: '10 min', place: 'Victoria Island' },
                          { time: '15 min', place: 'Lekki Phase 1' },
                        ].map(({ time, place }) => (
                          <div key={place} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                            <p className="text-sm font-black text-gray-900">{time}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{place}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
            {/* Community */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  Community
                  <span className="ml-2 text-sm font-semibold text-gray-300">({comments.length})</span>
                </h2>
              </div>

              {userRole === 'tenant' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                      {tenantName ? tenantName[0].toUpperCase() : 'T'}
                    </div>
                    <form onSubmit={handleComment} className="flex-1 space-y-3">
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Share your thoughts or ask a question…"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                        rows={2}
                      />
                      <div className="flex justify-end">
                        <button
                          disabled={commentLoading || !commentText.trim()}
                          className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-gray-800 transition-all active:scale-95"
                        >
                          Post <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {userRole === 'guest' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 flex-1">Sign in to join the conversation.</p>
                  <div className="flex gap-2 shrink-0">
                    <Link href="/login" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <LogIn className="w-3 h-3" /> Sign in
                    </Link>
                    <Link href="/register" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                      <UserPlus className="w-3 h-3" /> Join
                    </Link>
                  </div>
                </div>
              )}

              {(userRole === 'landlord' || userRole === 'admin') && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">Comments are for tenants. Switch to a tenant account to participate.</p>
                </div>
              )}

              {!commentsReady ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-400 font-medium">No comments yet. Be the first!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {comments.map((c, i) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 text-violet-600 flex items-center justify-center shrink-0 font-bold text-sm">
                          {c.tenant_name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-gray-900 text-sm">{c.tenant_name}</span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{c.message}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          {/* RIGHT SIDEBAR */}
          <aside className="lg:block">
            <div className="sticky top-24 space-y-4">

              {/* Price + CTA card */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/80 overflow-hidden">
                {/* Price header */}
                <div className="px-7 pt-7 pb-5 border-b border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {TYPE_LABEL[property.type]}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-gray-900 tracking-tight">
                      ₦{Number(property.price).toLocaleString()}
                    </span>
                    {property.type === 'rent' && (
                      <span className="text-sm text-gray-400 font-medium">/year</span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {/* WhatsApp */}
                  {landlord?.whatsapp && (
                    <a
                      href={`https://wa.me/${landlord.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in: ${property.title}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#25D366] text-white rounded-2xl font-bold text-sm hover:bg-[#20c05c] transition-all active:scale-[0.98] shadow-lg shadow-green-100"
                    >
                      <MessageSquare className="w-4 h-4" /> Chat on WhatsApp
                    </a>
                  )}

                  {/* Enquiry toggle */}
                  <button
                    onClick={() => { setEnquiryOpen(!enquiryOpen); setEnquirySuccess(false) }}
                    className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-[0.98]"
                  >
                    <Mail className="w-4 h-4" />
                    {enquiryOpen ? 'Close' : 'Send Enquiry'}
                  </button>

                  {/* Enquiry form */}
                  <AnimatePresence>
                    {enquiryOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-1">
                          {enquirySuccess ? (
                            <div className="flex items-center gap-2.5 p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-medium border border-emerald-100">
                              <CheckCircle className="w-4 h-4 shrink-0" />
                              Enquiry sent! The landlord will contact you shortly.
                            </div>
                          ) : (
                            <form onSubmit={handleEnquiry} className="space-y-3">
                              <textarea
                                required
                                value={enquiryMsg}
                                onChange={e => setEnquiryMsg(e.target.value)}
                                placeholder="Tell the landlord why you're interested…"
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 min-h-[90px] resize-none transition-all"
                              />
                              <button
                                disabled={enquiryLoading || enquiryMsg.length < 10}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
                              >
                                {enquiryLoading ? 'Sending…' : 'Send Message'}
                              </button>
                            </form>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Guest CTA */}
                  {userRole === 'guest' && (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center space-y-3">
                      <p className="text-xs text-gray-500 font-semibold">Sign up to send enquiries</p>
                      <div className="flex gap-2">
                        <Link href="/login" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-white transition-colors">
                          <LogIn className="w-3.5 h-3.5" /> Sign in
                        </Link>
                        <Link href="/register" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors">
                          <UserPlus className="w-3.5 h-3.5" /> Register
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Tenant save/share */}
                  {userRole === 'tenant' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
                          saved
                            ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                        {saved ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 font-semibold text-sm transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                        {copied ? 'Copied!' : 'Share'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Landlord section */}
                {landlord && (
                  <div className="px-5 pb-5">
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Listed by</p>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-white border border-gray-200 overflow-hidden shrink-0 shadow-sm">
                          {landlord.avatar_url
                            ? <img src={landlord.avatar_url} className="w-full h-full object-cover" alt={landlord.full_name ?? ''} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                            : <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold text-sm">{landlordInitials}</div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{landlord.full_name}</p>
                          {landlord.is_verified
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle className="w-3 h-3" /> Verified landlord</span>
                            : <p className="text-xs text-gray-400">Landlord on Livana</p>
                          }
                        </div>
                      </div>
                      {landlord.bio && (
                        <p className="text-xs text-gray-500 leading-relaxed mt-3 pt-3 border-t border-gray-100">{landlord.bio}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Safety tip */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">Livana Safety Tip</p>
                    <p className="text-xs text-gray-500 leading-relaxed">Always inspect the property in person before making any payments. We never ask for money via the platform.</p>
                  </div>
                </div>
              </div>

            </div>
          </aside>

        </div>
      </main>

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</p>
          <p className="text-xl font-black text-gray-900 tracking-tight">₦{Number(property.price).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          {userRole === 'tenant' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`p-3 rounded-2xl border font-semibold transition-all active:scale-95 ${
                saved ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
            </button>
          )}
          <button
            onClick={() => { setEnquiryOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-colors active:scale-95 shadow-lg shadow-gray-900/10"
          >
            Contact Now
          </button>
        </div>
      </div>

      <Footer />
    </div>
  )
}

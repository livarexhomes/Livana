import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useLocation } from '@/lib/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, BedDouble, Bath, Maximize, Heart,
  ArrowLeft, Share2, CheckCircle,
  Building2, Calendar, ShieldCheck, Info,
  Mail, Wifi, Car, Dumbbell, Waves, Wind, Shield, Zap,
  Droplets, TreePine, UtensilsCrossed, Tv, Lock, Sun, Package,
  Eye, Phone, X, ReceiptText, ChevronRight,
} from 'lucide-react'
import PropertyDetailMap from '../components/property/PropertyDetailMap'
import PublicNavbar from '../components/layout/PublicNavbar'
import Footer from '../components/layout/Footer'
import SEO from '../components/SEO'
import { createClient, isSupabaseConfigured, getSupabaseImageUrl } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import { calcFeeBreakdown, getFeeConfig, type FeeConfig } from '../lib/fees'
import { formatNaira } from '../lib/currency'
import { subscribeListingRulesChange } from '../lib/settings-store'
import { getPlatformSettings } from '../lib/platform-settings'
import type { PropertyWithLandlord, PropertyImage, Landlord } from '@/types'


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
  amenities: string[]
  latitude: number | null
  longitude: number | null
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
  const id = params?.id
  const [, navigate] = useLocation()
  const [property, setProperty] = useState<FullProperty | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const [userRole, setUserRole] = useState<'guest' | 'tenant' | 'landlord' | 'admin'>('guest')
  const [tenantId, setTenantId] = useState<string | null>(null)

  const [enquiryOpen, setEnquiryOpen]       = useState(false)
  const [enquiryMsg, setEnquiryMsg]         = useState('')
  const [enquiryLoading, setEnquiryLoading] = useState(false)
  const [enquirySuccess, setEnquirySuccess] = useState(false)

  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactMethod, setContactMethod] = useState<'whatsapp' | 'form' | null>(null)

  // Admin phone from Settings — single source of truth for WhatsApp support.
  const [supportPhone, setSupportPhone] = useState('07061370742')

  useEffect(() => {
    let active = true
    getPlatformSettings().then(s => { if (active) setSupportPhone(s.phone) })
    return () => { active = false }
  }, [])

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [copied, setCopied]       = useState(false)
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null)

  // Load the configured Agency Fee percentage (for the Total Payable card) and
  // keep it in sync if the admin updates Listing Rules while this page is open.
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let active = true
    getFeeConfig().then(cfg => { if (active) setFeeConfig(cfg) })
    const unsub = subscribeListingRulesChange(() => {
      getFeeConfig({ refresh: true }).then(cfg => { if (active) setFeeConfig(cfg) })
    })
    return () => { active = false; unsub() }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured() || !id) { setLoading(false); return }
    const supabase = createClient()

    async function init() {
      // getSession reads from local cache — no network round-trip, never returns
      // null for an already-authenticated user the way getUser() can on navigation.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null

      const { data: prop } = await supabase
        .from('properties')
        .select('*, landlords(id, full_name, whatsapp, bio, avatar_url, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)')
        .eq('id', id!)
        .single()

      if (!prop) { setNotFound(true); setLoading(false); return }
      setProperty(prop as FullProperty)

      if (user) {
        if (isAdminUser(user)) {
          setUserRole('admin')
        } else {
          const [{ data: tenant }, { data: landlord }] = await Promise.all([
            supabase.from('tenants').select('id').eq('user_id', user.id).single() as unknown as Promise<{ data: { id: string } | null }>,
            supabase.from('landlords').select('id').eq('user_id', user.id).single() as unknown as Promise<{ data: { id: string } | null }>,
          ])
          if (tenant) {
            setUserRole('tenant')
            setTenantId(tenant.id)
            const { data: sv } = await supabase.from('saved_properties').select('id').eq('tenant_id', tenant.id).eq('property_id', id!).single() as { data: { id: string } | null }
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
  }, [id])

  const images = (property?.property_images ?? [])
    .sort((a, b) => (a.is_cover ? -1 : b.is_cover ? 1 : (a.sort_order ?? 0) - (b.sort_order ?? 0)))

  function prevImage() {
    setActiveImg(i => (images.length === 0 ? 0 : (i - 1 + images.length) % images.length))
  }
  function nextImage() {
    setActiveImg(i => (images.length === 0 ? 0 : (i + 1) % images.length))
  }

  // Keyboard navigation for the lightbox (desktop arrows + Escape to close).
  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prevImage()
      else if (e.key === 'ArrowRight') nextImage()
      else if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, images.length])

  // Touch swipe support for the lightbox on mobile.
  const touchStartX = useRef<number | null>(null)
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx > 0) prevImage()
      else nextImage()
    }
    touchStartX.current = null
  }

  async function handleSave() {
    if (userRole === 'guest') { navigate('/login'); return }
    if (userRole !== 'tenant' || !tenantId) return
    setSaving(true)
    const supabase = createClient()
    if (saved) {
      await supabase.from('saved_properties').delete().eq('tenant_id', tenantId).eq('property_id', id!)
      setSaved(false)
    } else {
      await supabase.from('saved_properties').insert({ tenant_id: tenantId, property_id: id! })
      setSaved(true)
    }
    setSaving(false)
  }

  async function handleEnquiry(e: React.FormEvent) {
    e.preventDefault()
    if (userRole === 'guest') { navigate('/login'); return }
    if (!tenantId || !property) return
    setEnquiryLoading(true)
    const supabase = createClient()
    
    const { error } = await supabase.from('enquiries').insert({
      tenant_id: tenantId,
      property_id: id!,
      landlord_id: null,
      message: enquiryMsg,
      status: 'open',
    })
    
    if (error) {
      console.error('Enquiry error:', error)
      setEnquiryLoading(false)
      return
    }
    
    setEnquirySuccess(true)
    setEnquiryLoading(false)
    setEnquiryMsg('')

    // Notify admin via WhatsApp (fire-and-forget — don't block UI)
    fetch('/api/whatsapp/notify-inspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantName: null,
        propertyTitle: property?.title ?? null,
        propertyCity: property?.city ?? null,
        propertyId: property?.id ?? null,
        message: enquiryMsg,
      }),
    }).catch(() => { /* silent — notification is best-effort */ })

    // Auto-close after 3 seconds
    setTimeout(() => {
      setEnquirySuccess(false)
      setEnquiryOpen(false)
      setContactModalOpen(false)
    }, 3000)
  }

  function handleWhatsAppContact() {
    if (userRole === 'guest') { navigate('/login'); return }
    const cleanNumber = supportPhone.replace(/\D/g, '')
    const message = `Hi Livarex, I'm interested in a property: ${property?.title} (ID: ${property?.id}). Can you help me with an inspection?`
    const whatsappUrl = `https://wa.me/234${cleanNumber}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setContactModalOpen(false)
  }

  function openContactModal() {
    if (userRole === 'guest') { navigate('/login'); return }
    setContactModalOpen(true)
    setContactMethod(null)
    setEnquirySuccess(false)
  }

  function selectContactMethod(method: 'whatsapp' | 'form') {
    setContactMethod(method)
    if (method === 'form') {
      setEnquiryOpen(true)
    } else {
      handleWhatsAppContact()
    }
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
  const addressVisible = userRole !== 'guest'
  const publicLocation = property ? property.city : ''
  const fullLocation = property ? [property.address, property.city].filter(Boolean).join(', ') : ''
  const locationText = addressVisible ? fullLocation : publicLocation
  const breakdown = property ? calcFeeBreakdown(property, feeConfig ?? undefined) : null

  function handleBookInspection() {
    if (userRole === 'guest') { navigate('/login'); return }
    setEnquiryOpen(true)
    setEnquiryMsg(`Hi, I'd like to book an inspection for ${property?.title || 'this property'}.`)
  }

  const coverImage = images.find(i => i.is_cover) ?? images[0]
  const ogImage = coverImage ? getSupabaseImageUrl(coverImage.storage_path) : undefined
  const propertySchema = property ? {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: property.title,
    description: property.description ?? `${TYPE_LABEL[property.type]} in ${property.city ?? ''}, Nigeria`,
    url: `https://livarex.com.ng/property/${property.id}`,
    ...(ogImage ? { image: ogImage } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.city ?? '',
      addressRegion: property.state ?? '',
      addressCountry: 'NG',
    },
    numberOfRooms: property.bedrooms ?? undefined,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'NGN',
      availability: property.status === 'available'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
    },
    provider: {
      '@type': 'RealEstateAgent',
      name: 'LIVAREX',
      url: 'https://livarex.com.ng',
    },
    mainEntityOfPage: `https://livarex.com.ng/property/${property.id}`,
  } : undefined

  return (
    <div className="min-h-screen bg-[#F8F8F6] selection:bg-blue-100 selection:text-blue-900">
      {property && (
        <SEO
          title={`${property.title} — ${TYPE_LABEL[property.type]} in ${property.city ?? 'Nigeria'}`}
          description={property.description
            ? property.description.slice(0, 155)
            : `${TYPE_LABEL[property.type]}: ${property.bedrooms ?? ''} bedroom property in ${property.city ?? ''}, ${property.state ?? 'Nigeria'}. ₦${Number(property.price).toLocaleString()}.`}
          image={ogImage}
          url={`/property/${property.id}`}
          type="article"
          schema={propertySchema}
        />
      )}
      <PublicNavbar />

      {/* ── GALLERY ── */}
      <section className="pt-[80px]">
        <div className="relative">
          {/* Main image */}
          <div className="relative w-full aspect-[4/3] max-h-[460px] md:aspect-auto md:h-[70vh] md:max-h-none overflow-hidden bg-gray-100">
            <AnimatePresence mode="wait">
              {images[activeImg] ? (
                <motion.img
                  key={activeImg}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  src={getSupabaseImageUrl(images[activeImg].storage_path)}
                  className="w-full h-full object-cover object-center cursor-zoom-in"
                  alt={images[activeImg].alt_text || property.title}
                  onClick={() => setLightboxOpen(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Building2 className="w-16 h-16 text-gray-200" strokeWidth={1} />
                </div>
              )}
            </AnimatePresence>

            {/* Click anywhere on the hero to open the full-screen viewer */}
            {images.length > 0 && (
              <button
                onClick={() => setLightboxOpen(true)}
                aria-label="View photos"
                className="absolute inset-0 z-[1] cursor-zoom-in"
              />
            )}

            {/* Subtle vignette — keeps top controls readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />

            {/* Top controls */}
            <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between">
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


            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-6 right-6 z-10 md:bottom-8 md:right-8 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
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
                    <img src={getSupabaseImageUrl(img.storage_path)} className="w-full h-full object-cover" alt={img.alt_text || property.title} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── TITLE BLOCK — below hero in white space ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Badges — only the availability badge (rent/sale) is shown to the
              public. Featured / Verified Landlord exist internally but are not
              displayed on the property details page. */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
              {statusCfg.label}{property.type === 'rent' || property.type === 'lease' ? ' for Rent' : property.type === 'sale' ? ' for Sale' : ''}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
              {TYPE_LABEL[property.type]}
            </span>
          </div>
          {/* Title */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight mb-3">
            {property.title}
          </h1>
          {/* Location */}
          <div className="flex items-center gap-1.5 text-gray-500 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{locationText}, Nigeria</span>
          </div>
          {!addressVisible && (
            <p className="mt-2 text-xs text-gray-400">Create a free account to unlock the full address and contact details.</p>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-32 lg:pb-12">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:gap-10 xl:gap-14">

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
                      {property.amenities && property.amenities.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                          {AMENITIES.filter(a => property.amenities?.includes(a.label)).map((amenity, i) => (
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
                      ) : (
                        <p className="text-sm text-gray-400">No amenities listed for this property.</p>
                      )}
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
                          {addressVisible ? fullLocation : property.city}, Nigeria
                        </p>
                        {!addressVisible && (
                          <p className="text-xs text-gray-400 mt-2">Sign in to view the full address and request an inspection through Livarex.</p>
                        )}
                      </div>

                      {property.latitude && property.longitude ? (
                        <div className="rounded-2xl overflow-hidden border border-gray-100 h-[260px] md:h-[360px] shadow-sm">
                          <PropertyDetailMap
                            lat={property.latitude}
                            lng={property.longitude}
                            title={property.title}
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-gray-100 h-[200px] flex items-center justify-center bg-gray-50">
                          <p className="text-sm text-gray-400">Map location not available for this property.</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* RIGHT SIDEBAR */}
          <aside>
            <div className="sticky top-24 space-y-4">

              {/* Price + CTA card — hidden on mobile (sticky bar handles it) */}
              <div className="hidden lg:block bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/80 overflow-hidden">
                {/* Price header */}
                <div className="px-7 pt-7 pb-5 border-b border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {TYPE_LABEL[property.type]}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-gray-900 tracking-tight">
                      {formatNaira(property.price)}
                    </span>
                    {property.type === 'rent' && (
                      <span className="text-sm text-gray-400 font-medium">/year</span>
                    )}
                  </div>
                </div>

                {/* Total Payable breakdown */}
                {breakdown && (
                  <div className="px-7 py-4 border-b border-gray-50 bg-blue-50/40">
                    <div className="flex items-center gap-2 mb-3">
                      <ReceiptText className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">What you'll pay</p>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Rent</span>
                        <span className="font-semibold text-gray-900">{formatNaira(breakdown.rent)}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Agency Fee{feeConfig ? ` (${feeConfig.agencyFeePercent}%)` : ''}</span>
                        <span className="font-semibold text-gray-900">{formatNaira(breakdown.agencyFee)}</span>
                      </div>
                      {breakdown.agreementFee > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Agreement Fee</span>
                          <span className="font-semibold text-gray-900">{formatNaira(breakdown.agreementFee)}</span>
                        </div>
                      )}
                      {breakdown.commissionFee > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Commission Fee</span>
                          <span className="font-semibold text-gray-900">{formatNaira(breakdown.commissionFee)}</span>
                        </div>
                      )}
                      {breakdown.otherCharges > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Other Charges</span>
                          <span className="font-semibold text-gray-900">{formatNaira(breakdown.otherCharges)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                        <span className="font-bold text-gray-900">Total Payable</span>
                        <span className="font-extrabold text-blue-700">{formatNaira(breakdown.total)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-3">
                  {/* Contact Options - WhatsApp + Request Inspection */}
                  <div className="grid grid-cols-2 gap-2">
                    {userRole === 'guest' ? (
                      <button
                        onClick={() => navigate('/login')}
                        className="flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-400 rounded-2xl font-bold text-sm cursor-pointer hover:bg-gray-200 transition-all"
                      >
                        <Lock className="w-4 h-4" /> WhatsApp
                      </button>
                    ) : (
                      <button
                        onClick={handleWhatsAppContact}
                        className="flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all active:scale-[0.98]"
                      >
                        <Phone className="w-4 h-4" /> WhatsApp
                      </button>
                    )}
                    {userRole === 'guest' ? (
                      <button
                        onClick={() => navigate('/login')}
                        className="flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-400 rounded-2xl font-bold text-sm cursor-pointer hover:bg-gray-200 transition-all"
                      >
                        <Lock className="w-4 h-4" /> Request inspection
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEnquiryOpen(!enquiryOpen); setEnquirySuccess(false); setContactModalOpen(false) }}
                        className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all active:scale-[0.98]"
                      >
                        <Calendar className="w-4 h-4" />
                        {enquiryOpen ? 'Close' : 'Request inspection'}
                      </button>
                    )}
                  </div>

                  {/* Contact Method Modal */}
                  <AnimatePresence>
                    {contactModalOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-gray-900">Contact options</p>
                            <button onClick={() => setContactModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-200 text-gray-400">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* {landlord?.whatsapp ? (
                            <button
                              onClick={() => selectContactMethod('whatsapp')}
                              className="flex items-center gap-3 w-full p-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all text-left"
                            >
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                <Phone className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">Livarex WhatsApp</p>
                                <p className="text-xs text-gray-500">Speak with Livarex support</p>
                              </div>
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 w-full p-3 bg-gray-100 rounded-xl border border-gray-200 opacity-60">
                              <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                                <Phone className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-400">WhatsApp unavailable</p>
                                <p className="text-xs text-gray-400">Livarex support is offline</p>
                              </div>
                            </div>
                          )} */}
                          
                          {/* <button
                            onClick={() => selectContactMethod('form')}
                            className="flex items-center gap-3 w-full p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                              <Mail className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">Send Enquiry</p>
                              <p className="text-xs text-gray-500">Livarex will contact you shortly</p>
                            </div>
                          </button> */}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                              Enquiry sent to Livarex! Our team will contact you shortly.
                            </div>
                          ) : (
                            <form onSubmit={handleEnquiry} className="space-y-3">
                              <textarea
                                required
                                value={enquiryMsg}
                                onChange={e => setEnquiryMsg(e.target.value)}
                                placeholder="Tell us why you're interested in this property…"
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

                  {/* Guest CTA - Lock message */}
                  {userRole === 'guest' && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                          <Lock className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700">Create an account to request inspections</p>
                          <p className="text-xs text-gray-400">Free signup unlocks inspection booking, reservations, and alerts.</p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white border border-gray-100 p-3 text-xs text-gray-500">
                        <p className="font-semibold text-gray-700 mb-1">Why register?</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Request inspection or reserve this property</li>
                          <li>Unlock full property address</li>
                          <li>Save properties and get alerts</li>
                        </ul>
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
                      {landlord.whatsapp && (
                        <button
                          onClick={handleWhatsAppContact}
                          className={`mt-3 flex items-center gap-2 w-full py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
                            userRole === 'guest'
                              ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-pointer hover:bg-gray-200'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          <Phone className="w-4 h-4" />
                          {userRole === 'guest' ? 'Sign in to chat with Livarex' : 'WhatsApp Livarex Support'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Safety tip — shown on all sizes */}
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

              {/* Verification process */}
              <div className="rounded-3xl border border-gray-100 bg-white p-5">
                <p className="text-sm font-bold text-gray-900 mb-3">How Livana verifies landlords</p>
                <ol className="space-y-3 text-sm text-gray-600">
                  <li className="flex gap-2"><span className="text-blue-600">1.</span> Government ID check</li>
                  <li className="flex gap-2"><span className="text-blue-600">2.</span> Phone verification</li>
                  <li className="flex gap-2"><span className="text-blue-600">3.</span> Property ownership review</li>
                  <li className="flex gap-2"><span className="text-blue-600">4.</span> Manual admin approval</li>
                </ol>
              </div>

            </div>
          </aside>

        </div>
      </main>

      {/* ── Full-screen image viewer (lightbox) ── */}
      <AnimatePresence>
        {lightboxOpen && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Property photos"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
              <span className="text-white/80 text-sm font-semibold">
                {activeImg + 1} / {images.length}
              </span>
              <button
                onClick={() => setLightboxOpen(false)}
                aria-label="Close photo viewer"
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image stage */}
            <div
              className="flex-1 flex items-center justify-center min-h-0 px-4 sm:px-16 select-none"
              onClick={e => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImg}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  src={getSupabaseImageUrl(images[activeImg].storage_path, 1600)}
                  alt={images[activeImg].alt_text || property.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  draggable={false}
                />
              </AnimatePresence>
            </div>

            {/* Prev / Next */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage() }}
                  aria-label="Previous photo"
                  className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage() }}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Thumbnails */}
            {images.length > 1 && (
              <div
                className="flex items-center gap-2 justify-center px-4 py-4 overflow-x-auto shrink-0"
                onClick={e => e.stopPropagation()}
              >
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(i)}
                    className={`relative shrink-0 w-14 h-10 rounded-lg overflow-hidden transition-all ${
                      activeImg === i
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
                        : 'opacity-40 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={getSupabaseImageUrl(img.storage_path, 200)}
                      alt={img.alt_text || `Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</p>
          <p className="text-xl font-black text-gray-900 tracking-tight">{formatNaira(property.price)}</p>
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
            onClick={() => {
              if (userRole === 'guest') {
                navigate('/login')
              } else {
                openContactModal()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-colors active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            <Phone className="w-4 h-4 inline mr-2" />
            {userRole === 'guest' ? 'Sign in to Contact' : 'Contact'}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  )
}

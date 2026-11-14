import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams, useLocation } from '@/lib/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BedDouble, Bath, Maximize, Heart,
  ArrowLeft, Share2, CheckCircle,
  Building2, Calendar, ShieldCheck,
  Mail, Wifi, Car, Dumbbell, Waves, Wind, Shield, Zap,
  Droplets, TreePine, UtensilsCrossed, Tv, Lock, Sun, Package,
  Eye, X, ChevronRight, ChevronLeft,
  MapPin as MapPinIcon, MessageCircle,
  ArrowUpRight, ExternalLink, Clock, Key, Home, AlertCircle,
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
import { trackPropertyEvent } from '../lib/property-analytics'
import type { PropertyWithLandlord, PropertyImage, Landlord } from '@/types'

type IconComponent = React.ComponentType<{ className?: string; strokeWidth?: number }>

const AMENITIES = [
  { icon: Wifi,            label: 'High-Speed WiFi',        category: 'connectivity' },
  { icon: Car,             label: 'Parking Space',          category: 'parking' },
  { icon: Dumbbell,        label: 'Gym / Fitness',          category: 'lifestyle' },
  { icon: Waves,           label: 'Swimming Pool',          category: 'lifestyle' },
  { icon: Wind,            label: 'Air Conditioning',       category: 'comfort' },
  { icon: Shield,          label: '24/7 Security',          category: 'security' },
  { icon: Zap,             label: 'Backup Power',           category: 'utilities' },
  { icon: Droplets,        label: 'Running Water',          category: 'utilities' },
  { icon: TreePine,        label: 'Garden / Lawn',          category: 'outdoor' },
  { icon: UtensilsCrossed, label: 'Modern Kitchen',         category: 'indoor' },
  { icon: Tv,              label: 'Smart TV',               category: 'indoor' },
  { icon: Lock,            label: 'Smart Lock',             category: 'security' },
  { icon: Sun,             label: 'Solar Panels',           category: 'utilities' },
  { icon: Package,         label: 'Storage Room',           category: 'indoor' },
]

type FullProperty = PropertyWithLandlord & {
  landlords: Pick<Landlord, 'id' | 'full_name' | 'whatsapp' | 'bio' | 'avatar_url' | 'is_verified'> | null
  property_images: (Pick<PropertyImage, 'id' | 'storage_path' | 'alt_text' | 'is_cover' | 'sort_order'>)[]
  amenities: string[]
  latitude: number | null
  longitude: number | null
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; icon: string }> = {
  available:         { label: 'Available',        dot: 'bg-emerald-400', bg: 'bg-emerald-50/90', text: 'text-emerald-700', icon: '✓' },
  taken:             { label: 'Taken',             dot: 'bg-red-400',     bg: 'bg-red-50/90',     text: 'text-red-700',     icon: '✕' },
  coming_soon:       { label: 'Coming Soon',       dot: 'bg-blue-400',    bg: 'bg-blue-50/90',    text: 'text-blue-700',    icon: '⏳' },
  under_negotiation: { label: 'Under Negotiation', dot: 'bg-amber-400',   bg: 'bg-amber-50/90',   text: 'text-amber-700',   icon: '⟳' },
}

const TYPE_LABEL: Record<string, string> = {
  rent: 'For Rent', sale: 'For Sale', lease: 'Lease', commercial: 'Commercial',
}

const TYPE_ICONS: Record<string, IconComponent> = {
  rent: Home,
  sale: Key,
  lease: Calendar,
  commercial: Building2,
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Helper Components ───

function PropertyImage({ src, alt, priority = false, className = '', sizes }: { src: string; alt: string; priority?: boolean; className?: string; sizes?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw'}
      className={`w-full h-full object-cover ${className}`}
    />
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 mb-1.5">{eyebrow}</p>
      <h2 className="text-2xl sm:text-[28px] font-extrabold text-slate-950 tracking-tight">{title}</h2>
    </div>
  )
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
}

// ─── Main Component ───

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
  const [copied, setCopied]       = useState(false)
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null)
  const [userRole, setUserRole] = useState<'guest' | 'tenant' | 'landlord' | 'admin'>('guest')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [enquiryOpen, setEnquiryOpen]       = useState(false)
  const [enquiryMsg, setEnquiryMsg]         = useState('')
  const [enquiryLoading, setEnquiryLoading] = useState(false)
  const [enquirySuccess, setEnquirySuccess] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [supportPhone, setSupportPhone] = useState('07061370742')

  const touchStartX = useRef<number | null>(null)

  // Load platform settings
  useEffect(() => {
    let active = true
    getPlatformSettings().then(s => { if (active) setSupportPhone(s.phone) })
    return () => { active = false }
  }, [])

  // Load fee config
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let active = true
    getFeeConfig().then(cfg => { if (active) setFeeConfig(cfg) })
    const unsub = subscribeListingRulesChange(() => {
      getFeeConfig({ refresh: true }).then(cfg => { if (active) setFeeConfig(cfg) })
    })
    return () => { active = false; unsub() }
  }, [])

  // Load property data
  useEffect(() => {
    if (!isSupabaseConfigured() || !id) { setLoading(false); return }
    const supabase = createClient()

    async function init() {
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
          } else {
            setUserRole('tenant')
          }
        }
      }
      setLoading(false)
    }

    init()
  }, [id])

  // Track detail view
  useEffect(() => {
    if (!property?.id) return
    trackPropertyEvent(property.id, 'detail_view').catch(error => {
      console.warn('[property-analytics] detail view tracking failed:', error)
    })
  }, [property?.id])

  // Keyboard navigation for lightbox
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
  }, [lightboxOpen])

  // Touch swipe for lightbox
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx > 0) prevImage()
      else nextImage()
    }
    touchStartX.current = null
  }

  const images = (property?.property_images ?? [])
    .sort((a, b) => (a.is_cover ? -1 : b.is_cover ? 1 : (a.sort_order ?? 0) - (b.sort_order ?? 0)))

  const prevImage = useCallback(() => {
    setActiveImg(i => (images.length === 0 ? 0 : (i - 1 + images.length) % images.length))
  }, [images.length])

  const nextImage = useCallback(() => {
    setActiveImg(i => (images.length === 0 ? 0 : (i + 1) % images.length))
  }, [images.length])

  const handleSave = async () => {
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

  const handleEnquiry = async (e: React.FormEvent) => {
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
    }).catch(() => {})

    setTimeout(() => {
      setEnquirySuccess(false)
      setEnquiryOpen(false)
      setContactModalOpen(false)
    }, 3000)
  }

  const trackInteraction = (eventType: 'contact_admin_click' | 'enquiry_initiated') => {
    if (!property?.id) return
    trackPropertyEvent(property.id, eventType).catch(error => {
      console.warn(`[property-analytics] ${eventType} tracking failed:`, error)
    })
  }

  const openEnquiryForm = () => {
    if (!enquiryOpen) trackInteraction('enquiry_initiated')
    setEnquiryOpen(true)
    setEnquirySuccess(false)
  }

  const handleWhatsAppContact = () => {
    if (userRole === 'guest') { navigate('/login'); return }
    const cleanNumber = supportPhone.replace(/\D/g, '')
    const message = `Hi Livarex, I'm interested in a property: ${property?.title} (ID: ${property?.id}). Can you help me with an inspection?`
    const whatsappUrl = `https://wa.me/234${cleanNumber}?text=${encodeURIComponent(message)}`
    trackInteraction('contact_admin_click')
    window.open(whatsappUrl, '_blank')
    setContactModalOpen(false)
  }

  const openContactModal = () => {
    if (userRole === 'guest') { navigate('/login'); return }
    setContactModalOpen(true)
    setEnquirySuccess(false)
  }

  const selectContactMethod = (method: 'whatsapp' | 'form') => {
    if (method === 'form') {
      openEnquiryForm()
    } else {
      handleWhatsAppContact()
    }
    setContactModalOpen(false)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: property?.title ?? 'Livarex Listing', url: window.location.href })
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleBookInspection = () => {
    if (userRole === 'guest') { navigate('/login'); return }
    openEnquiryForm()
    setEnquiryMsg(`Hi, I'd like to book an inspection for ${property?.title || 'this property'}.`)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
            </div>
            <p className="text-sm text-slate-400 font-medium tracking-wide">Loading property…</p>
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (notFound || !property) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-24">
          <div className="w-24 h-24 rounded-[2rem] bg-white border border-slate-200 shadow-xl shadow-slate-200/60 flex items-center justify-center mx-auto mb-8">
            <MapPinIcon className="w-10 h-10 text-slate-300" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mb-2">Property not found</h1>
          <p className="text-slate-500 mb-8 max-w-sm">This listing may have been removed or doesn't exist.</p>
          <Link href="/listings" className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-full font-semibold transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Browse Listings</Link>
        </div>
      </div>
    )
  }

  const landlord = property.landlords
  const statusCfg = STATUS_CONFIG[property.status] ?? { label: property.status, dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600', icon: '?' }
  const landlordInitials = landlord?.full_name ? landlord.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'
  const addressVisible = userRole !== 'guest'
  const publicLocation = property ? property.city : ''
  const fullLocation = property ? [property.address, property.city].filter(Boolean).join(', ') : ''
  const locationText = addressVisible ? fullLocation : publicLocation
  const breakdown = property ? calcFeeBreakdown(property, feeConfig ?? undefined) : null

  const coverImage = images.find(i => i.is_cover) ?? images[0]
  const ogImage = coverImage ? getSupabaseImageUrl(coverImage.storage_path) : undefined
  const TypeIcon = TYPE_ICONS[property.type] ?? Home

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

  const quickStats = [
    { icon: BedDouble, value: property.bedrooms ?? '—', label: 'Bedrooms' },
    { icon: Bath, value: property.bathrooms ?? '—', label: 'Bathrooms' },
    ...(property.area_sqft ? [{ icon: Maximize, value: property.area_sqft.toLocaleString(), label: 'Sq ft' }] : []),
    { icon: TypeIcon as IconComponent, value: TYPE_LABEL[property.type], label: 'Listing' },
  ]

  const detailRows: { icon: IconComponent; label: string; value: string | number }[] = [
    { icon: Home, label: 'Property Type', value: property.property_type || TYPE_LABEL[property.type] },
    { icon: BedDouble, label: 'Bedrooms', value: property.bedrooms ?? '—' },
    { icon: Bath, label: 'Bathrooms', value: property.bathrooms ?? '—' },
    { icon: ShieldCheck, label: 'Status', value: statusCfg.label },
    { icon: MapPinIcon, label: 'City', value: property.city },
    { icon: Calendar, label: 'Listed', value: new Date(property.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-0 selection:bg-blue-600 selection:text-white">
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
      <PublicNavbar />

      {/* ── GALLERY ── */}
      <section className="relative pt-4 sm:pt-6" aria-label="Property photos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden bg-slate-200 aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.2/1] max-h-[640px] shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5">
            <AnimatePresence mode="wait">
              {images[activeImg] ? (
                <motion.div
                  key={activeImg}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                >
                  <PropertyImage
                    src={getSupabaseImageUrl(images[activeImg].storage_path)}
                    alt={images[activeImg].alt_text || property.title}
                    priority
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-slate-950/30 pointer-events-none" />
                  <button
                    onClick={() => setLightboxOpen(true)}
                    aria-label="View photos fullscreen"
                    className="absolute inset-0 z-10 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                  />
                </motion.div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
                  <Building2 className="w-24 h-24 text-slate-200" strokeWidth={1} />
                </div>
              )}
            </AnimatePresence>

            {/* Top controls */}
            <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 z-20 flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/listings')}
                className="flex items-center gap-2 pl-3 pr-4 py-2.5 bg-white/80 backdrop-blur-xl border border-white/40 text-slate-900 rounded-full text-sm font-semibold shadow-lg shadow-slate-900/10 hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label="Back to listings"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </motion.button>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleShare}
                  aria-label="Share this property"
                  className="flex h-11 w-11 items-center justify-center bg-white/80 backdrop-blur-xl border border-white/40 text-slate-900 rounded-full hover:bg-white transition-colors shadow-lg shadow-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <Share2 className="w-4 h-4" />
                </motion.button>
                {userRole === 'tenant' && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleSave}
                    disabled={saving}
                    aria-label={saved ? 'Remove from saved' : 'Save property'}
                    aria-pressed={saved}
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors shadow-lg shadow-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      saved
                        ? 'bg-rose-500 border border-rose-400 text-white'
                        : 'bg-white/80 backdrop-blur-xl border border-white/40 text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Bottom-left: badges */}
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20 flex flex-wrap items-center gap-2">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-xl border border-white/50 ${statusCfg.bg} ${statusCfg.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                {statusCfg.label}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/80 backdrop-blur-xl border border-white/50 text-slate-900"
              >
                <TypeIcon className="w-3.5 h-3.5 text-blue-600" strokeWidth={2.25} />
                {TYPE_LABEL[property.type]}
              </motion.span>
            </div>

            {/* Bottom-right: counter + expand */}
            {images.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex items-center gap-2"
              >
                {images.length > 1 && (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950/50 backdrop-blur-xl rounded-full border border-white/15">
                    <Eye className="w-3.5 h-3.5 text-white/70" />
                    <span className="text-white text-xs font-semibold tabular-nums">{activeImg + 1} / {images.length}</span>
                  </div>
                )}
                <button
                  onClick={() => setLightboxOpen(true)}
                  aria-label="Open fullscreen gallery"
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-white/90 backdrop-blur-xl rounded-full text-xs font-bold text-slate-900 hover:bg-white transition-colors"
                >
                  <Maximize className="w-3.5 h-3.5" /> View all
                </button>
              </motion.div>
            )}

            {/* Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  aria-label="Previous photo"
                  className="hidden sm:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white/80 backdrop-blur-xl text-slate-900 hover:bg-white shadow-lg transition-all hover:scale-105"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  aria-label="Next photo"
                  className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white/80 backdrop-blur-xl text-slate-900 hover:bg-white shadow-lg transition-all hover:scale-105"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="mt-3 flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
              {images.map((img, i) => (
                <motion.button
                  key={img.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveImg(i)}
                  aria-label={`View photo ${i + 1} of ${images.length}`}
                  aria-current={activeImg === i ? 'true' : undefined}
                  className={`relative shrink-0 w-20 h-14 sm:w-28 sm:h-[72px] rounded-2xl overflow-hidden transition-all ${
                    activeImg === i
                      ? 'ring-2 ring-slate-950 ring-offset-2 ring-offset-slate-50'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <PropertyImage
                    src={getSupabaseImageUrl(img.storage_path, 300)}
                    alt={img.alt_text || `Photo ${i + 1}`}
                    sizes="112px"
                  />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── TITLE & QUICK STATS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/10 text-blue-700 font-semibold">
              <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
              {locationText}, Nigeria
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Listed {timeAgo(property.created_at)}
            </span>
          </div>

          <h1 className="text-[2rem] sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-[-0.035em] leading-[1.05] max-w-4xl">
            {property.title}
          </h1>

          {!addressVisible && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Create a free account to unlock the full address and contact details.
            </motion.p>
          )}

          <div className={`grid gap-3 pt-2 ${quickStats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
            {quickStats.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="group flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:from-blue-600 group-hover:to-indigo-600 transition-all">
                  <Icon className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-slate-950 leading-tight truncate">{value}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-10 lg:gap-14">

          {/* LEFT COLUMN */}
          <div className="space-y-14 min-w-0">

            {/* About */}
            <motion.section {...fadeUp}>
              <SectionHeading eyebrow="Overview" title="About this property" />
              <p className="text-slate-600 leading-[1.8] text-[17px] whitespace-pre-line break-words">
                {property.description || 'No description provided for this listing.'}
              </p>
            </motion.section>

            {/* Details */}
            <motion.section {...fadeUp}>
              <SectionHeading eyebrow="At a glance" title="Property details" />
              <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 divide-slate-100">
                  {detailRows.map(({ icon: Icon, label, value }, i) => (
                    <div
                      key={label}
                      className={`flex items-center justify-between gap-4 px-5 py-4 sm:px-6 ${
                        i < detailRows.length - 2 ? 'sm:border-b sm:border-slate-100' : ''
                      } ${i % 2 === 0 ? 'sm:border-r sm:border-slate-100' : ''}`}
                    >
                      <span className="flex items-center gap-3 text-sm text-slate-500">
                        <Icon className="w-[18px] h-[18px] text-blue-600 shrink-0" strokeWidth={1.75} />
                        {label}
                      </span>
                      <span className="text-sm font-bold text-slate-950 text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <motion.section {...fadeUp}>
                <SectionHeading eyebrow="Lifestyle" title="Included in your rental" />
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3">
                  {AMENITIES.filter(a => property.amenities?.includes(a.label)).map((amenity, i) => (
                    <motion.div
                      key={amenity.label}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 }}
                      className="group flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-blue-600 flex items-center justify-center shrink-0 transition-colors">
                        <amenity.icon className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" strokeWidth={1.75} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{amenity.label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Location */}
            <motion.section {...fadeUp}>
              <SectionHeading eyebrow="Neighbourhood" title="Where you'll be" />
              <div className="flex items-center gap-2 mb-4">
                <MapPinIcon className="w-5 h-5 text-blue-600" />
                <p className="text-slate-700 font-medium">{addressVisible ? fullLocation : property.city}, Nigeria</p>
              </div>
              {!addressVisible && (
                <p className="text-sm text-slate-500 mb-4">Sign in to view the full address and request an inspection through Livarex.</p>
              )}
              {property.latitude && property.longitude ? (
                <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm ring-4 ring-white">
                  <PropertyDetailMap
                    lat={property.latitude}
                    lng={property.longitude}
                    title={property.title}
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 h-[300px] flex items-center justify-center bg-white">
                  <div className="text-center px-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <MapPinIcon className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                    </div>
                    <p className="text-slate-500 text-sm">Map location not available for this property.</p>
                  </div>
                </div>
              )}
            </motion.section>

          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="min-w-0 lg:sticky lg:top-24 self-start">
            <div className="space-y-5">

              {/* Pricing Card */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-[28px] overflow-hidden bg-slate-950 text-white shadow-2xl shadow-blue-950/20"
              >
                <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-600/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />

                {/* Price header */}
                <div className="relative px-6 pt-6 pb-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                      {TYPE_LABEL[property.type]}
                    </p>
                    {landlord?.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-400/15 text-emerald-300 border border-emerald-400/20">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[2.5rem] leading-none font-black tracking-tight">
                      {formatNaira(property.price)}
                    </span>
                    {property.type === 'rent' && (
                      <span className="text-sm text-white/50 font-medium">/year</span>
                    )}
                  </div>
                </div>

                {/* Breakdown */}
                {breakdown && (
                  <div className="relative mx-4 mb-4 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm px-5 py-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50 mb-4">Move-in Breakdown</p>
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">Rental Price</p>
                          <p className="text-xs text-white/45">{property.type === 'rent' ? 'Yearly' : 'One-time'}</p>
                        </div>
                        <p className="text-sm font-bold tabular-nums">{formatNaira(breakdown.rent)}</p>
                      </div>
                      {breakdown.agencyFee > 0 && (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">Agency Fee</p>
                            <p className="text-xs text-white/45">Commission to the agent{feeConfig ? ` (${feeConfig.agencyFeePercent}%)` : ''}</p>
                          </div>
                          <p className="text-sm font-bold tabular-nums">{formatNaira(breakdown.agencyFee)}</p>
                        </div>
                      )}
                      {breakdown.agreementFee > 0 && (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">Legal Fee</p>
                            <p className="text-xs text-white/45">For tenancy / legal agreement</p>
                          </div>
                          <p className="text-sm font-bold tabular-nums">{formatNaira(breakdown.agreementFee)}</p>
                        </div>
                      )}
                      {breakdown.commissionFee > 0 && (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">Commission Fee</p>
                            <p className="text-xs text-white/45">Additional commission</p>
                          </div>
                          <p className="text-sm font-bold tabular-nums">{formatNaira(breakdown.commissionFee)}</p>
                        </div>
                      )}
                      {breakdown.otherCharges > 0 && (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">Other Charges</p>
                            <p className="text-xs text-white/45">Additional fees</p>
                          </div>
                          <p className="text-sm font-bold tabular-nums">{formatNaira(breakdown.otherCharges)}</p>
                        </div>
                      )}
                      <div className="pt-4 mt-1 border-t border-dashed border-white/15">
                        <div className="flex items-end justify-between gap-3">
                          <p className="text-sm font-bold text-white/80">Total Due at Move-in</p>
                          <p className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent tabular-nums">{formatNaira(breakdown.total)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="relative px-4 pb-4 space-y-2.5">
                  {userRole === 'guest' ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/30 hover:from-blue-400 hover:to-indigo-400 transition-all"
                      >
                        Apply Now
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 bg-white/10 text-white border border-white/15 rounded-2xl font-bold text-sm hover:bg-white/15 transition-all"
                      >
                        Schedule Inspection
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleBookInspection}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/30 hover:from-blue-400 hover:to-indigo-400 transition-all"
                      >
                        Schedule Inspection
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleWhatsAppContact}
                        className="w-full py-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 inline mr-2 -mt-0.5" />
                        Contact via WhatsApp
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Agent Card */}
              {landlord && (
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-4">Listed by</p>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 ring-2 ring-white shadow-md overflow-hidden shrink-0">
                      {landlord.avatar_url
                        ? <img src={landlord.avatar_url} className="w-full h-full object-cover" alt={landlord.full_name ?? ''} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                        : <div className="w-full h-full flex items-center justify-center text-blue-700 font-extrabold text-lg">{landlordInitials}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-950 text-base truncate">{landlord.full_name}</p>
                      <p className="text-sm text-slate-500">Real Estate Agent</p>
                      {landlord.is_verified && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Verified Agent
                        </span>
                      )}
                    </div>
                  </div>
                  {landlord.bio && (
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{landlord.bio}</p>
                  )}
                  {landlord.whatsapp && (userRole === 'tenant' || userRole === 'guest') && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleWhatsAppContact}
                      className={`w-full py-3 rounded-2xl text-sm font-bold transition-colors ${
                        userRole === 'guest'
                          ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-pointer hover:bg-slate-200'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 inline mr-2 -mt-0.5" />
                      {userRole === 'guest' ? 'Sign in to Contact' : 'Contact Agent'}
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* Safety Tip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-3xl p-5"
              >
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-950 mb-1">Safety Tip</p>
                    <p className="text-xs text-amber-800/80 leading-relaxed">Always inspect the property in person before making any payments. Livarex doesn't handle payments or agreements for listings.</p>
                  </div>
                </div>
              </motion.div>

              {/* Secondary Actions */}
              {userRole === 'tenant' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border transition-all ${
                      saved
                        ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                    {saved ? 'Saved' : 'Save'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Share'}
                  </motion.button>
                </motion.div>
              )}

            </div>
          </aside>

        </div>
      </main>

      {/* ── FULLSCREEN LIGHTBOX ── */}
      <AnimatePresence>
        {lightboxOpen && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Property photos"
            onClick={() => setLightboxOpen(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="flex items-center justify-between px-4 py-4 sm:px-8 shrink-0" onClick={e => e.stopPropagation()}>
              <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-bold tabular-nums">
                {activeImg + 1} / {images.length}
              </span>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setLightboxOpen(false)}
                aria-label="Close photo viewer"
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div
              className="flex-1 flex items-center justify-center min-h-0 px-4 sm:px-20 select-none"
              onClick={e => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImg}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.03 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  src={getSupabaseImageUrl(images[activeImg].storage_path, 1600)}
                  alt={images[activeImg].alt_text || property.title}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                  draggable={false}
                />
              </AnimatePresence>
            </div>

            {images.length > 1 && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); prevImage() }}
                  aria-label="Previous photo"
                  className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); nextImage() }}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </>
            )}

            {images.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-center gap-2 px-4 py-4 overflow-x-auto shrink-0"
                onClick={e => e.stopPropagation()}
              >
                {images.map((img, i) => (
                  <motion.button
                    key={img.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveImg(i)}
                    className={`relative shrink-0 w-16 h-12 rounded-xl overflow-hidden transition-all ${
                      activeImg === i
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
                        : 'opacity-40 hover:opacity-80'
                    }`}
                  >
                    <PropertyImage
                      src={getSupabaseImageUrl(img.storage_path, 200)}
                      alt={img.alt_text || `Photo ${i + 1}`}
                      sizes="64px"
                    />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sticky Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-[22px] bg-white/85 backdrop-blur-2xl border border-white/60 ring-1 ring-slate-900/5 px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.18)]">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</p>
            <p className="text-xl font-black text-slate-950 tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">{formatNaira(property.price)}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {userRole === 'tenant' && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleSave}
                disabled={saving}
                aria-label={saved ? 'Remove from saved' : 'Save property'}
                className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all ${
                  saved ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
              </motion.button>
            )}
            {(userRole === 'tenant' || userRole === 'guest') && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (userRole === 'guest') {
                    navigate('/login')
                  } else {
                    openContactModal()
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                className="h-12 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/30"
              >
                <MessageCircle className="w-4 h-4 inline mr-2 -mt-0.5" />
                {userRole === 'guest' ? 'Sign in to Contact' : 'Contact'}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <AnimatePresence>
        {contactModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm flex items-end justify-center px-4 pb-4 sm:items-center sm:px-0"
            onClick={() => setContactModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Contact options"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-lg font-extrabold text-slate-950 tracking-tight">Contact options</p>
                  <p className="text-sm text-slate-500">Choose how you'd like to reach us</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setContactModalOpen(false)}
                  aria-label="Close"
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="px-5 pb-5 space-y-3">
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { selectContactMethod('whatsapp'); setContactModalOpen(false) }}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-950">WhatsApp Livarex</p>
                    <p className="text-sm text-slate-500">Instant chat with our support team</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-300 ml-auto" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { selectContactMethod('form'); setContactModalOpen(false) }}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/25">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-950">Send Enquiry</p>
                    <p className="text-sm text-slate-500">We'll contact you shortly</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-slate-300 ml-auto" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enquiry Form Modal */}
      <AnimatePresence>
        {enquiryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center px-4 py-8"
            onClick={() => { setEnquiryOpen(false); setEnquirySuccess(false) }}
            role="dialog"
            aria-modal="true"
            aria-label="Send enquiry"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-lg font-extrabold text-slate-950 tracking-tight">Send Enquiry</p>
                  <p className="text-sm text-slate-500 truncate max-w-[240px]">{property.title}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setEnquiryOpen(false); setEnquirySuccess(false) }}
                  aria-label="Close"
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="px-6 pb-6">
                {enquirySuccess ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-medium border border-emerald-100">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold">Enquiry sent!</p>
                      <p className="text-xs text-emerald-600">Our team will contact you shortly.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleEnquiry} className="space-y-4">
                    <div>
                      <label htmlFor="enquiry-message" className="block text-sm font-semibold text-slate-700 mb-2">Your message</label>
                      <textarea
                        id="enquiry-message"
                        required
                        value={enquiryMsg}
                        onChange={e => setEnquiryMsg(e.target.value)}
                        placeholder="Tell us why you're interested in this property…"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white min-h-[110px] resize-none transition-all"
                        rows={4}
                      />
                      <p className="text-xs text-slate-400 mt-1.5 text-right tabular-nums">{enquiryMsg.length}/500</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={enquiryLoading || enquiryMsg.length < 10}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                    >
                      {enquiryLoading ? 'Sending…' : 'Send Message'}
                    </motion.button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
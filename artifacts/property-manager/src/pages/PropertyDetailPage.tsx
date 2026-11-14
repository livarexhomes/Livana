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
    <div className="mb-5 sm:mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 mb-1">{eyebrow}</p>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
    </div>
  )
}

function FactPill({ icon: Icon, value, label }: { icon: IconComponent; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 px-4 py-2.5">
      <Icon className="w-4.5 h-4.5 w-5 h-5 text-blue-600" strokeWidth={1.8} />
      <div className="leading-tight">
        <span className="block text-sm font-bold text-slate-900">{value}</span>
        <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
    </div>
  )
}

function FeeRow({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">{value}</p>
    </div>
  )
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

  // Loading state — skeleton layout
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <PublicNavbar />
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-16">
          <div className="animate-pulse space-y-6" aria-busy="true">
            <div className="grid gap-2 sm:gap-3 lg:grid-cols-[1.8fr_1fr]">
              <div className="rounded-2xl lg:rounded-l-3xl lg:rounded-r-none bg-slate-200/70 aspect-[4/3] sm:aspect-[16/9] lg:aspect-[16/10]" />
              <div className="hidden lg:grid grid-rows-2 gap-3">
                <div className="rounded-tr-3xl bg-slate-200/70" />
                <div className="rounded-br-3xl bg-slate-100" />
              </div>
            </div>
            <div className="h-9 w-2/3 sm:w-1/2 rounded-xl bg-slate-200/70" />
            <div className="h-4 w-1/3 rounded bg-slate-100" />
            <div className="grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-8 lg:gap-12">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 rounded bg-slate-100" style={{ width: `${90 - i * 8}%` }} />
                ))}
              </div>
              <div className="h-96 rounded-3xl bg-slate-200/70" />
            </div>
            <p className="sr-only">Loading property…</p>
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (notFound || !property) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200/70 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <MapPinIcon className="w-9 h-9 text-slate-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Property not found</h1>
          <p className="text-slate-500 mb-6">This listing may have been removed or doesn't exist.</p>
          <Link
            href="/listings"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all text-sm shadow-lg shadow-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95"
          >
            Browse Listings
          </Link>
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

  return (
    <div className="min-h-screen bg-white">
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

      {/* ── GALLERY SECTION ── */}
      <section className="relative" aria-label="Property photos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-6">
          <div className="grid gap-2 sm:gap-3 lg:grid-cols-[1.8fr_1fr]">

            {/* Main Image */}
            <div className="relative overflow-hidden rounded-2xl lg:rounded-l-3xl lg:rounded-r-none bg-slate-100 aspect-[4/3] sm:aspect-[16/9] lg:aspect-[16/10] group">
              <AnimatePresence mode="wait">
                {images[activeImg] ? (
                  <motion.div
                    key={activeImg}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="absolute inset-0"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                  >
                    <PropertyImage
                      src={getSupabaseImageUrl(images[activeImg].storage_path)}
                      alt={images[activeImg].alt_text || property.title}
                      priority
                      sizes="(max-width: 1024px) 100vw, 60vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 pointer-events-none" />
                    <button
                      onClick={() => setLightboxOpen(true)}
                      aria-label="View photos fullscreen"
                      className="absolute inset-0 z-10 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    />
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                    <Building2 className="w-20 h-20 text-slate-200" strokeWidth={1} />
                  </div>
                )}
              </AnimatePresence>

              {/* Top Controls */}
              <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-20 flex items-center justify-between">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/listings')}
                  className="inline-flex items-center gap-2 h-10 px-4 bg-white/90 backdrop-blur-md text-slate-900 rounded-full text-sm font-semibold shadow-lg ring-1 ring-black/5 hover:bg-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Back to listings"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </motion.button>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleShare}
                    aria-label="Share this property"
                    className="flex h-10 w-10 items-center justify-center bg-white/90 backdrop-blur-md text-slate-900 rounded-full shadow-lg ring-1 ring-black/5 hover:bg-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>
                  {userRole === 'tenant' && (
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSave}
                      disabled={saving}
                      aria-label={saved ? 'Remove from saved' : 'Save property'}
                      aria-pressed={saved}
                      className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        saved
                          ? 'bg-rose-500 text-white ring-1 ring-rose-400'
                          : 'bg-white/90 backdrop-blur-md text-slate-900 ring-1 ring-black/5 hover:bg-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Desktop arrows */}
              {images.length > 1 && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); prevImage() }}
                    aria-label="Previous photo"
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-slate-900 shadow-lg ring-1 ring-black/5 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); nextImage() }}
                    aria-label="Next photo"
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-slate-900 shadow-lg ring-1 ring-black/5 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </>
              )}

              {/* Status & Type Badges */}
              <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-20 flex flex-wrap items-center gap-2">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide ring-1 ring-black/5 shadow-lg ${statusCfg.bg} ${statusCfg.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                  {statusCfg.label}
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-white/90 backdrop-blur-md ring-1 ring-black/5 text-slate-800 shadow-lg"
                >
                  <TypeIcon className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
                  {TYPE_LABEL[property.type]}
                </motion.span>
              </div>

              {/* Image Counter */}
              {images.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md ring-1 ring-white/10"
                >
                  <Eye className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-white/90 text-xs font-semibold tabular-nums">{activeImg + 1} / {images.length}</span>
                </motion.div>
              )}
            </div>

            {/* Side Grid — desktop only */}
            <div className="hidden lg:grid grid-rows-2 gap-3 h-full">
              {[1, 2].map((offset) => {
                const img = images[offset]
                return img ? (
                  <button
                    key={img.id}
                    onClick={() => { setActiveImg(offset); setLightboxOpen(true) }}
                    aria-label={`Open photo ${offset + 1} of ${images.length} in fullscreen`}
                    className={`relative group/tile overflow-hidden bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      offset === 1 ? 'rounded-tr-3xl' : 'rounded-br-3xl'
                    }`}
                  >
                    <PropertyImage
                      src={getSupabaseImageUrl(img.storage_path, 800)}
                      alt={img.alt_text || property.title}
                      sizes="(min-width: 1024px) 33vw"
                      className="transition-transform duration-700 group-hover/tile:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover/tile:bg-slate-900/10 transition-colors" />
                    {offset === 2 && images.length > 3 && (
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur text-xs font-bold text-slate-900 shadow-lg ring-1 ring-black/5 group-hover/tile:scale-105 transition-transform">
                        <Maximize className="w-3.5 h-3.5" />
                        View all {images.length} photos
                      </span>
                    )}
                  </button>
                ) : (
                  <div
                    key={`placeholder-${offset}`}
                    className={`bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200/60 flex items-center justify-center ${
                      offset === 1 ? 'rounded-tr-3xl' : 'rounded-br-3xl'
                    }`}
                  >
                    <Building2 className="w-10 h-10 text-slate-200" strokeWidth={1} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mobile Thumbnail Strip */}
          {images.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide lg:hidden"
            >
              {images.map((img, i) => (
                <motion.button
                  key={img.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveImg(i)}
                  aria-label={`View photo ${i + 1} of ${images.length}`}
                  aria-current={activeImg === i ? 'true' : undefined}
                  className={`relative shrink-0 w-20 h-14 rounded-xl overflow-hidden transition-all ${
                    activeImg === i ? 'ring-2 ring-blue-600 ring-offset-2' : 'opacity-60 hover:opacity-100 ring-1 ring-slate-200'
                  }`}
                >
                  <PropertyImage
                    src={getSupabaseImageUrl(img.storage_path, 300)}
                    alt={img.alt_text || `Photo ${i + 1}`}
                    sizes="80px"
                  />
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── TITLE & LOCATION ── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-slate-400 mb-3"
          >
            <Link href="/listings" className="hover:text-blue-600 font-medium transition-colors">Listings</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-blue-600 transition-colors">{property.city || 'Nigeria'}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600 font-medium truncate max-w-[160px] sm:max-w-xs">{property.title}</span>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10"
          >
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                {property.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="font-medium">{locationText}, Nigeria</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block" />
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {timeAgo(property.created_at)}
                </span>
              </div>

              {!addressVisible && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 ring-1 ring-slate-200/70 rounded-full px-3.5 py-2"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Create a free account to unlock the full address and contact details.
                </motion.p>
              )}
            </div>

            {/* Quick Facts */}
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <FactPill icon={BedDouble} value={property.bedrooms ?? '—'} label="Beds" />
              <FactPill icon={Bath} value={property.bathrooms ?? '—'} label="Baths" />
              {property.area_sqft && (
                <FactPill icon={Maximize} value={property.area_sqft.toLocaleString()} label="Sq ft" />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-16">
        <div className="grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-8 lg:gap-12">

          {/* LEFT COLUMN - Content Sections */}
          <div className="space-y-12 min-w-0">

            {/* Property Description Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <SectionHeading eyebrow="Overview" title="About this property" />
              <p className="text-slate-600 leading-relaxed text-[15px] sm:text-base whitespace-pre-line break-words">
                {property.description || 'No description provided for this listing.'}
              </p>
            </motion.section>

            {/* Property Details Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SectionHeading eyebrow="Specifications" title="Property details" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { icon: Home, label: 'Property Type', value: property.property_type || TYPE_LABEL[property.type] },
                  { icon: BedDouble, label: 'Bedrooms', value: property.bedrooms ?? '—' },
                  { icon: Bath, label: 'Bathrooms', value: property.bathrooms ?? '—' },
                  { icon: ShieldCheck, label: 'Status', value: statusCfg.label },
                  { icon: MapPinIcon, label: 'City', value: property.city },
                  { icon: Calendar, label: 'Listed', value: new Date(property.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-white ring-1 ring-slate-200/70 hover:ring-blue-200 hover:shadow-sm hover:shadow-blue-900/5 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <item.icon className="w-4.5 h-4.5 w-5 h-5 text-blue-600" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{item.label}</p>
                      <p className="font-semibold text-slate-900 text-sm truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Amenities Section */}
            {property.amenities && property.amenities.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <SectionHeading eyebrow="Comfort & Convenience" title="What's included" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AMENITIES.filter(a => property.amenities?.includes(a.label)).map((amenity, i) => (
                    <motion.div
                      key={amenity.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/60 hover:bg-white hover:ring-blue-200 hover:shadow-sm hover:shadow-blue-900/5 transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200/80 flex items-center justify-center shrink-0">
                        <amenity.icon className="w-4.5 h-4.5 w-5 h-5 text-blue-600" strokeWidth={1.6} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{amenity.label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Location Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <SectionHeading eyebrow="Neighbourhood" title="Where you'll be" />
              <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
                <MapPinIcon className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="font-medium">{addressVisible ? fullLocation : property.city}, Nigeria</span>
              </div>
              {!addressVisible && (
                <p className="text-sm text-slate-500 mb-4 bg-slate-50 rounded-xl px-4 py-3 ring-1 ring-slate-200/60">
                  Sign in to view the full address and request an inspection through Livarex.
                </p>
              )}
              {property.latitude && property.longitude ? (
                <div className="rounded-3xl overflow-hidden ring-1 ring-slate-200/70 shadow-sm">
                  <PropertyDetailMap
                    lat={property.latitude}
                    lng={property.longitude}
                    title={property.title}
                  />
                </div>
              ) : (
                <div className="rounded-3xl ring-1 ring-slate-200/70 h-[300px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                  <div className="text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-white ring-1 ring-slate-200 flex items-center justify-center mx-auto mb-3">
                      <MapPinIcon className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-slate-500">Map location not available for this property.</p>
                  </div>
                </div>
              )}
            </motion.section>

          </div>

          {/* RIGHT SIDEBAR - Pricing & Agent Card */}
          <aside className="min-w-0 lg:sticky lg:top-24 self-start">
            <div className="space-y-5">

              {/* Pricing Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-xl shadow-slate-900/5 overflow-hidden"
              >
                {/* Price Header */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                      {TYPE_LABEL[property.type]}
                    </p>
                    {landlord?.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                      {formatNaira(property.price)}
                    </span>
                    {property.type === 'rent' && (
                      <span className="text-sm font-medium text-slate-400">/year</span>
                    )}
                  </div>
                </div>

                {/* Move-in Breakdown */}
                {breakdown && (
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
                    <p className="text-sm font-bold text-slate-900 mb-4">Move-in breakdown</p>
                    <div className="space-y-3">
                      <FeeRow
                        label="Rental Price"
                        sub={property.type === 'rent' ? 'Yearly' : 'One-time'}
                        value={formatNaira(breakdown.rent)}
                      />
                      {breakdown.agencyFee > 0 && (
                        <FeeRow
                          label="Agency Fee"
                          sub={`Commission to the agent${feeConfig ? ` (${feeConfig.agencyFeePercent}%)` : ''}`}
                          value={formatNaira(breakdown.agencyFee)}
                        />
                      )}
                      {breakdown.agreementFee > 0 && (
                        <FeeRow
                          label="Legal Fee"
                          sub="For tenancy / legal agreement"
                          value={formatNaira(breakdown.agreementFee)}
                        />
                      )}
                      {breakdown.commissionFee > 0 && (
                        <FeeRow
                          label="Commission Fee"
                          sub="Additional commission"
                          value={formatNaira(breakdown.commissionFee)}
                        />
                      )}
                      {breakdown.otherCharges > 0 && (
                        <FeeRow
                          label="Other Charges"
                          sub="Additional fees"
                          value={formatNaira(breakdown.otherCharges)}
                        />
                      )}
                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-blue-50 ring-1 ring-blue-100 px-4 py-3.5">
                        <p className="text-sm font-bold text-blue-900">Total due at move-in</p>
                        <p className="text-lg font-extrabold text-blue-700 tabular-nums">{formatNaira(breakdown.total)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-5 sm:p-6 space-y-3">
                  {userRole === 'guest' ? (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98]"
                      >
                        Apply Now
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 bg-white text-blue-700 ring-1 ring-inset ring-blue-200 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all active:scale-[0.98]"
                      >
                        Schedule Inspection
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleBookInspection}
                        className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98]"
                      >
                        Schedule Inspection
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleWhatsAppContact}
                        className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-[0.98]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Contact via WhatsApp
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Agent Card */}
              {landlord && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-sm p-6"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 ring-2 ring-white shadow-md overflow-hidden">
                        {landlord.avatar_url
                          ? <img src={landlord.avatar_url} className="w-full h-full object-cover" alt={landlord.full_name ?? ''} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                          : <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-lg">{landlordInitials}</div>
                        }
                      </div>
                      {landlord.is_verified && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base truncate">{landlord.full_name}</p>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Real Estate Agent</p>
                      {landlord.is_verified && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600">
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
                      whileTap={{ scale: 0.98 }}
                      onClick={handleWhatsAppContact}
                      className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                        userRole === 'guest'
                          ? 'bg-slate-100 ring-1 ring-slate-200 text-slate-400 hover:bg-slate-200'
                          : 'bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
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
                className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-200/70 p-5"
              >
                <div className="flex gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/80 ring-1 ring-amber-200 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900 mb-1">Safety first</p>
                    <p className="text-xs text-amber-700/90 leading-relaxed">Always inspect the property in person before making any payments. Livarex doesn't handle payments or agreements for listings.</p>
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
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm ring-1 transition-all active:scale-[0.98] ${
                      saved
                        ? 'bg-rose-50 text-rose-600 ring-rose-200 hover:bg-rose-100'
                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                    {saved ? 'Saved' : 'Save'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm transition-all active:scale-[0.98]"
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Property photos"
            onClick={() => setLightboxOpen(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 shrink-0" onClick={e => e.stopPropagation()}>
              <span className="text-white/80 text-sm font-semibold tabular-nums">
                {activeImg + 1} / {images.length}
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setLightboxOpen(false)}
                aria-label="Close photo viewer"
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Image Stage */}
            <div
              className="flex-1 flex items-center justify-center min-h-0 px-4 sm:px-16 select-none"
              onClick={e => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImg}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  src={getSupabaseImageUrl(images[activeImg].storage_path, 1600)}
                  alt={images[activeImg].alt_text || property.title}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                  draggable={false}
                />
              </AnimatePresence>
            </div>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); prevImage() }}
                  aria-label="Previous photo"
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors backdrop-blur-sm"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); nextImage() }}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors backdrop-blur-sm"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </>
            )}

            {/* Thumbnails */}
            {images.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 px-4 py-4 overflow-x-auto shrink-0 scrollbar-hide"
                onClick={e => e.stopPropagation()}
              >
                {images.map((img, i) => (
                  <motion.button
                    key={img.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveImg(i)}
                    aria-label={`View photo ${i + 1} of ${images.length}`}
                    aria-current={activeImg === i ? 'true' : undefined}
                    className={`relative shrink-0 w-16 h-12 rounded-xl overflow-hidden transition-all ${
                      activeImg === i
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgba(15,23,42,0.1)]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Price</p>
          <p className="text-xl font-extrabold text-slate-900 tracking-tight truncate">{formatNaira(property.price)}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {userRole === 'tenant' && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSave}
              disabled={saving}
              aria-label={saved ? 'Remove from saved' : 'Save property'}
              className={`p-3 rounded-xl ring-1 font-semibold transition-all active:scale-95 ${
                saved ? 'bg-rose-50 ring-rose-200 text-rose-500' : 'bg-white ring-slate-200 text-slate-500'
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
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors active:scale-95 shadow-lg shadow-blue-600/25 flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {userRole === 'guest' ? 'Sign in to Contact' : 'Contact'}
            </motion.button>
          )}
        </div>
      </div>

      {/* Footer spacer so sticky bar never covers content on mobile */}
      <div className="h-20 lg:hidden" aria-hidden="true" />

      {/* Contact Modal */}
      <AnimatePresence>
        {contactModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end justify-center px-4 pb-4 sm:items-center sm:px-0"
            onClick={() => setContactModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Contact options"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4.5 py-5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900 tracking-tight">Contact options</p>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setContactModalOpen(false)}
                  aria-label="Close contact options"
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="p-5 sm:p-6 space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { selectContactMethod('whatsapp'); setContactModalOpen(false) }}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl bg-white ring-1 ring-slate-200 hover:ring-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm transition-all text-left active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-900">WhatsApp Livarex</p>
                    <p className="text-sm text-slate-500">Instant chat with our support team</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-300 shrink-0" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { selectContactMethod('form'); setContactModalOpen(false) }}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl bg-white ring-1 ring-slate-200 hover:ring-blue-300 hover:bg-blue-50/50 hover:shadow-sm transition-all text-left active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-900">Send Enquiry</p>
                    <p className="text-sm text-slate-500">We'll contact you shortly</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-slate-300 shrink-0" />
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
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8"
            onClick={() => { setEnquiryOpen(false); setEnquirySuccess(false) }}
            role="dialog"
            aria-modal="true"
            aria-label="Send enquiry"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900 tracking-tight">Send Enquiry</p>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setEnquiryOpen(false); setEnquirySuccess(false) }}
                  aria-label="Close enquiry form"
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="p-6">
                {enquirySuccess ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Enquiry sent!</p>
                      <p className="text-sm text-slate-500 mt-1">Our team will contact you shortly.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleEnquiry} className="space-y-4">
                    <div>
                      <label htmlFor="enquiry-message" className="block text-sm font-semibold text-slate-700 mb-2">Your message</label>
                      <textarea
                        id="enquiry-message"
                        required
                        maxLength={500}
                        value={enquiryMsg}
                        onChange={e => setEnquiryMsg(e.target.value)}
                        placeholder="Tell us why you're interested in this property…"
                        className="w-full p-4 bg-slate-50 ring-1 ring-slate-200 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white min-h-[110px] resize-none transition-all"
                        rows={4}
                      />
                      <p className="text-xs text-slate-400 mt-1.5 text-right tabular-nums">{enquiryMsg.length}/500</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      disabled={enquiryLoading || enquiryMsg.length < 10}
                      className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98]"
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
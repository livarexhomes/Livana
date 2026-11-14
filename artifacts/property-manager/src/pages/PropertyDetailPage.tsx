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
  available:         { label: 'Available',        dot: 'bg-emerald-400', bg: 'bg-emerald-50/80', text: 'text-emerald-700', icon: '✓' },
  taken:             { label: 'Taken',             dot: 'bg-red-400',     bg: 'bg-red-50/80',     text: 'text-red-700',     icon: '✕' },
  coming_soon:       { label: 'Coming Soon',       dot: 'bg-blue-400',    bg: 'bg-blue-50/80',    text: 'text-blue-700',    icon: '⏳' },
  under_negotiation: { label: 'Under Negotiation', dot: 'bg-amber-400',   bg: 'bg-amber-50/80',   text: 'text-amber-700',   icon: '⟳' },
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
      <div className="min-h-screen bg-white flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Loading property…</p>
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
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-24">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <MapPinIcon className="w-9 h-9 text-slate-300" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Property not found</h1>
          <p className="text-slate-500 mb-6">This listing may have been removed or doesn't exist.</p>
          <Link href="/listings" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Browse Listings</Link>
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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Hero Image */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-100 aspect-[16/9] sm:aspect-[21/9] lg:aspect-[2/1] max-h-[600px]">
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
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />
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
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/listings')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-sm border border-white/20 text-slate-900 rounded-xl text-sm font-semibold shadow-lg hover:bg-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label="Back to listings"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </motion.button>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleShare}
                  aria-label="Share this property"
                  className="flex h-11 w-11 items-center justify-center bg-white/90 backdrop-blur-sm border border-white/20 text-slate-900 rounded-xl hover:bg-white transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <Share2 className="w-4 h-4" />
                </motion.button>
                {userRole === 'tenant' && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSave}
                    disabled={saving}
                    aria-label={saved ? 'Remove from saved' : 'Save property'}
                    aria-pressed={saved}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      saved
                        ? 'bg-rose-500 border-rose-400 text-white'
                        : 'bg-white/90 backdrop-blur-sm border border-white/20 text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Status & Type Badges */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.text} border`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                {statusCfg.label}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/90 backdrop-blur-sm border border-white/20 text-slate-900 shadow-lg"
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
                className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10"
              >
                <Eye className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/90 text-xs font-semibold">{activeImg + 1} / {images.length}</span>
              </motion.div>
            )}

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4"
              >
                <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-7xl mx-auto">
                  {images.map((img, i) => (
                    <motion.button
                      key={img.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveImg(i)}
                      aria-label={`View photo ${i + 1} of ${images.length}`}
                      aria-current={activeImg === i ? 'true' : undefined}
                      className={`relative shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden transition-all ${
                        activeImg === i ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <PropertyImage
                        src={getSupabaseImageUrl(img.storage_path, 300)}
                        alt={img.alt_text || `Photo ${i + 1}`}
                        sizes="80px"
                      />
                      {activeImg === i && (
                        <div className="absolute inset-0 bg-blue-500/20" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── TITLE & LOCATION ── */}
      <div className="bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {property.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 text-slate-500 text-sm">
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{locationText}, Nigeria</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="font-medium text-slate-600">{timeAgo(property.created_at)}</span>
              {property.area_sqft && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="font-medium text-slate-600">{property.area_sqft.toLocaleString()} sq ft</span>
                </>
              )}
            </div>

            {!addressVisible && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-slate-400 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Create a free account to unlock the full address and contact details.
              </motion.p>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-8 lg:gap-12">

          {/* LEFT COLUMN - Content Sections */}
          <div className="space-y-10 min-w-0">
            
            {/* Property Description Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Property Description</h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 leading-relaxed text-base whitespace-pre-line break-words">
                  {property.description || 'No description provided for this listing.'}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {timeAgo(property.created_at)}
                </span>
                {property.area_sqft && (
                  <span className="flex items-center gap-1.5">
                    <Maximize className="w-4 h-4" />
                    {property.area_sqft.toLocaleString()} sq ft
                  </span>
                )}
              </div>
            </motion.section>

            {/* Property Details Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Property Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <Home className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Property Type</p>
                    <p className="font-semibold text-slate-900">{property.property_type || TYPE_LABEL[property.type]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <BedDouble className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Bedrooms</p>
                    <p className="font-semibold text-slate-900">{property.bedrooms ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <Bath className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Bathrooms</p>
                    <p className="font-semibold text-slate-900">{property.bathrooms ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="font-semibold text-slate-900">{statusCfg.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <MapPinIcon className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">City</p>
                    <p className="font-semibold text-slate-900">{property.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Listed</p>
                    <p className="font-semibold text-slate-900">{new Date(property.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Amenities Section */}
            {property.amenities && property.amenities.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white"
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Included in Your Rental</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AMENITIES.filter(a => property.amenities?.includes(a.label)).map((amenity, i) => (
                    <motion.div
                      key={amenity.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <amenity.icon className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
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
              className="bg-white"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Where you'll be</h2>
              <div className="flex items-center gap-2 mb-4">
                <MapPinIcon className="w-5 h-5 text-slate-400" />
                <p className="text-slate-600">{addressVisible ? fullLocation : property.city}, Nigeria</p>
              </div>
              {!addressVisible && (
                <p className="text-sm text-slate-500 mb-4">Sign in to view the full address and request an inspection through Livarex.</p>
              )}
              {property.latitude && property.longitude ? (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <PropertyDetailMap
                    lat={property.latitude}
                    lng={property.longitude}
                    title={property.title}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 h-[300px] flex items-center justify-center bg-slate-50">
                  <div className="text-center px-6">
                    <MapPinIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-slate-500">Map location not available for this property.</p>
                  </div>
                </div>
              )}
            </motion.section>

          </div>

          {/* RIGHT SIDEBAR - Pricing & Agent Card */}
          <aside className="min-w-0 lg:sticky lg:top-24 self-start">
            <div className="space-y-6">

              {/* Pricing Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
              >
                {/* Price Header */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-500">
                      {TYPE_LABEL[property.type]}
                    </p>
                    {landlord?.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {formatNaira(property.price)}
                    </span>
                    {property.type === 'rent' && (
                      <span className="text-sm text-slate-500">/year</span>
                    )}
                  </div>
                </div>

                {/* Move-in Breakdown */}
                {breakdown && (
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-sm font-semibold text-slate-900 mb-4">Move-in Breakdown</p>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Rental Price</p>
                          <p className="text-xs text-slate-500">{property.type === 'rent' ? 'Yearly' : 'One-time'}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatNaira(breakdown.rent)}</p>
                      </div>
                      {breakdown.agencyFee > 0 && (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Agency Fee</p>
                            <p className="text-xs text-slate-500">Commission to the agent{feeConfig ? ` (${feeConfig.agencyFeePercent}%)` : ''}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{formatNaira(breakdown.agencyFee)}</p>
                        </div>
                      )}
                      {breakdown.agreementFee > 0 && (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Legal Fee</p>
                            <p className="text-xs text-slate-500">For tenancy / legal agreement</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{formatNaira(breakdown.agreementFee)}</p>
                        </div>
                      )}
                      {breakdown.commissionFee > 0 && (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Commission Fee</p>
                            <p className="text-xs text-slate-500">Additional commission</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{formatNaira(breakdown.commissionFee)}</p>
                        </div>
                      )}
                      {breakdown.otherCharges > 0 && (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Other Charges</p>
                            <p className="text-xs text-slate-500">Additional fees</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{formatNaira(breakdown.otherCharges)}</p>
                        </div>
                      )}
                      <div className="pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <p className="text-base font-bold text-slate-900">Total Due at Move-in</p>
                          <p className="text-xl font-bold text-blue-600">{formatNaira(breakdown.total)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-6 space-y-3">
                  {userRole === 'guest' ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/login')}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all"
                      >
                        Apply Now
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/login')}
                        className="w-full py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-all"
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
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all"
                      >
                        Schedule Inspection
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleWhatsAppContact}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 inline mr-2" />
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
                  className="bg-white rounded-2xl border border-slate-200 p-6"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden shrink-0">
                      {landlord.avatar_url
                        ? <img src={landlord.avatar_url} className="w-full h-full object-cover" alt={landlord.full_name ?? ''} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                        : <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-lg">{landlordInitials}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base truncate">{landlord.full_name}</p>
                      <p className="text-sm text-slate-500">Real Estate Agent</p>
                      {landlord.is_verified && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle className="w-3 h-3" />
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
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        userRole === 'guest'
                          ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-pointer hover:bg-slate-200'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 inline mr-2" />
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
                className="bg-amber-50 border border-amber-200 rounded-2xl p-5"
              >
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-1">Safety Tip</p>
                    <p className="text-xs text-amber-700 leading-relaxed">Always inspect the property in person before making any payments. Livarex doesn't handle payments or agreements for listings.</p>
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
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
                      saved
                        ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                    {saved ? 'Saved' : 'Save'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm transition-all"
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
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Property photos"
            onClick={() => setLightboxOpen(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 shrink-0" onClick={e => e.stopPropagation()}>
              <span className="text-white/80 text-sm font-semibold">
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
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
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
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); nextImage() }}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
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
                className="flex items-center gap-2 px-4 py-4 overflow-x-auto shrink-0"
                onClick={e => e.stopPropagation()}
              >
                {images.map((img, i) => (
                  <motion.button
                    key={img.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveImg(i)}
                    className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all ${
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_-4px_24px_rgba(15,23,42,0.08)]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</p>
          <p className="text-xl font-black text-slate-900 tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">{formatNaira(property.price)}</p>
        </div>
        <div className="flex gap-2">
          {userRole === 'tenant' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className={`p-3 rounded-xl border font-semibold transition-all active:scale-95 ${
                saved ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
            </motion.button>
          )}
          {(userRole === 'tenant' || userRole === 'guest') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (userRole === 'guest') {
                  navigate('/login')
                } else {
                  openContactModal()
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              }}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors active:scale-95 shadow-sm"
            >
              <MessageCircle className="w-4 h-4 inline mr-2" />
              {userRole === 'guest' ? 'Sign in to Contact' : 'Contact'}
            </motion.button>
          )}
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
            className="fixed inset-0 z-[90] bg-black/50 flex items-end justify-center px-4 pb-4 sm:items-center sm:px-0"
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
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900">Contact options</p>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setContactModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="p-6 space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { selectContactMethod('whatsapp'); setContactModalOpen(false) }}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm hover:bg-emerald-50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">WhatsApp Livarex</p>
                    <p className="text-sm text-slate-500">Instant chat with our support team</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-300 ml-auto" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { selectContactMethod('form'); setContactModalOpen(false) }}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm hover:bg-blue-50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">Send Enquiry</p>
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
            className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center px-4 py-8"
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
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900">Send Enquiry</p>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setEnquiryOpen(false); setEnquirySuccess(false) }}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="p-6">
                {enquirySuccess ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-medium border border-emerald-100 text-center">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Enquiry sent!</p>
                      <p className="text-xs text-emerald-600">Our team will contact you shortly.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleEnquiry} className="space-y-4">
                    <div>
                      <label htmlFor="enquiry-message" className="block text-sm font-medium text-slate-700 mb-2">Your message</label>
                      <textarea
                        id="enquiry-message"
                        required
                        value={enquiryMsg}
                        onChange={e => setEnquiryMsg(e.target.value)}
                        placeholder="Tell us why you're interested in this property…"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-h-[100px] resize-none transition-all"
                        rows={4}
                      />
                      <p className="text-xs text-slate-400 mt-1 text-right">{enquiryMsg.length}/500</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={enquiryLoading || enquiryMsg.length < 10}
                      className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
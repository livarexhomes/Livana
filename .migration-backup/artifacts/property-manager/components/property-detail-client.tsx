'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, BedDouble, Bath, Maximize, Heart,
  ArrowLeft, Share2, CheckCircle,
  Building2, Calendar, ShieldCheck, Info,
  Mail, Wifi, Car, Dumbbell, Waves, Wind, Shield, Zap,
  Droplets, TreePine, UtensilsCrossed, Tv, Lock, Sun, Package,
  Eye, Phone, X,
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import PublicNavbar from '@/src/components/PublicNavbar'
import Footer from '@/src/components/Footer'
import { createClient, isSupabaseConfigured, getSupabaseImageUrl } from '@/src/lib/supabase'
import { isAdminUser } from '@/src/lib/auth'
import type { PropertyWithLandlord, PropertyImage, Landlord } from '@/src/lib/types'

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
  { icon: Lock,             label: 'Smart Lock' },
  { icon: Sun,             label: 'Solar Panels' },
  { icon: Package,         label: 'Storage Room' },
]

export type FullProperty = PropertyWithLandlord & {
  landlords: Pick<Landlord, 'id' | 'full_name' | 'whatsapp' | 'bio' | 'avatar_url' | 'is_verified'> | null
  property_images: (Pick<PropertyImage, 'id' | 'storage_path' | 'alt_text' | 'is_cover' | 'sort_order'> | null)[]
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

export default function PropertyDetailClient({ property }: { property: FullProperty }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'amenities' | 'location'>('overview')
  const [isSaved, setIsSaved] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showEnquiry, setShowEnquiry] = useState(false)
  const [enquiryForm, setEnquiryForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [enquirySent, setEnquirySent] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [showAllImages, setShowAllImages] = useState(false)

  const images = (property.property_images ?? []).filter(Boolean) as NonNullable<FullProperty['property_images'][number]>[]
  const coverImage = images.find((img) => img.is_cover) ?? images[0]
  const otherImages = images.filter((img) => img.id !== coverImage?.id)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && isAdminUser(user)) { router.push('/admin'); return }
      setIsAuthenticated(!!user)
      if (user) {
        setCurrentUser({ id: user.id, email: user.email ?? '' })
        const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single()
        if (tenant) {
          const { data: saved } = await supabase.from('saved_properties').select('property_id').eq('tenant_id', (tenant as { id: string }).id)
          setIsSaved((saved ?? []).some((r: { property_id: string }) => r.property_id === property.id))
        }
      }
    })
  }, [property.id, router])

  async function toggleSave() {
    if (!isAuthenticated) { router.push('/login'); return }
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', currentUser!.id).single()
    if (!tenant) return
    const tenantId = (tenant as { id: string }).id
    if (isSaved) {
      await supabase.from('saved_properties').delete().eq('tenant_id', tenantId).eq('property_id', property.id)
      setIsSaved(false)
    } else {
      await supabase.from('saved_properties').insert({ tenant_id: tenantId, property_id: property.id })
      setIsSaved(true)
    }
  }

  async function submitEnquiry(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    await supabase.from('enquiries').insert({
      property_id: property.id,
      name: enquiryForm.name,
      email: enquiryForm.email,
      phone: enquiryForm.phone,
      message: enquiryForm.message,
      status: 'new',
    })
    setEnquirySent(true)
    setTimeout(() => { setShowEnquiry(false); setEnquirySent(false); setEnquiryForm({ name: '', email: '', phone: '', message: '' }) }, 2000)
  }

  const status = STATUS_CONFIG[property.status] ?? STATUS_CONFIG.available
  const typeLabel = TYPE_LABEL[property.type] ?? property.type

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      <main className="flex-1 pt-20">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/listings" className="hover:text-gray-600 transition-colors">Listings</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate">{property.title}</span>
          </div>
        </div>

        {/* Image gallery */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-3xl overflow-hidden">
            {/* Main image */}
            <div className="relative aspect-[4/3] md:aspect-auto md:row-span-2 bg-gray-100 cursor-pointer group" onClick={() => setShowAllImages(true)}>
              {coverImage ? (
                <img src={getSupabaseImageUrl(coverImage.storage_path, 1200)} alt={coverImage.alt_text || property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.bg} ${status.text} flex items-center gap-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-900/80 text-white backdrop-blur-sm">
                  {typeLabel}
                </span>
              </div>
            </div>
            {/* Side images */}
            {otherImages.slice(0, 4).map((img, i) => (
              <div key={img.id} className="relative aspect-[4/3] bg-gray-100 cursor-pointer group hidden md:block" onClick={() => setShowAllImages(true)}>
                <img src={getSupabaseImageUrl(img.storage_path, 600)} alt={img.alt_text || `${property.title} ${i + 2}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                {i === 3 && images.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{images.length - 5} more</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-20">
          <div className="grid lg:grid-cols-[1fr_380px] gap-10">
            {/* Left column */}
            <div>
              {/* Title & price */}
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">{property.title}</h1>
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                  <MapPin className="w-4 h-4" />
                  {property.address}, {property.city}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" /> {property.bedrooms ?? '-'} Beds</span>
                  <span className="flex items-center gap-1"><Bath className="w-4 h-4" /> {property.bathrooms ?? '-'} Baths</span>
                  <span className="flex items-center gap-1"><Maximize className="w-4 h-4" /> {property.area_sqft ? `${property.area_sqft} sqft` : '-'}</span>
                </div>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                <p className="text-sm text-gray-500 mb-1">Price</p>
                <p className="text-3xl font-extrabold text-gray-900">
                  ₦{property.price?.toLocaleString() ?? '—'}
                  {property.type === 'rent' && <span className="text-base font-normal text-gray-500">/year</span>}
                </p>
                {property.price_negotiable && (
                  <p className="text-sm text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Price is negotiable
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-gray-100">
                {(['overview', 'amenities', 'location'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 text-sm font-bold capitalize transition-all border-b-2 ${
                      activeTab === tab
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="prose prose-gray max-w-none">
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Description</h3>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description || 'No description available.'}</p>
                    </div>

                    {/* Key details */}
                    <div className="mt-8">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Property Details</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[
                          { label: 'Property Type', value: property.property_type || '-' },
                          { label: 'Bedrooms', value: property.bedrooms ?? '-' },
                          { label: 'Bathrooms', value: property.bathrooms ?? '-' },
                          { label: 'Area', value: property.area_sqft ? `${property.area_sqft} sqft` : '-' },
                          { label: 'Furnished', value: property.furnished ? 'Yes' : 'No' },
                          { label: 'Parking', value: property.parking_spaces ? `${property.parking_spaces} space(s)` : '-' },
                          { label: 'Year Built', value: property.year_built ?? '-' },
                          { label: 'Listed', value: timeAgo(property.created_at) },
                          { label: 'Property ID', value: property.id.slice(0, 8).toUpperCase() },
                        ].map((detail) => (
                          <div key={detail.label} className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{detail.label}</p>
                            <p className="text-sm font-bold text-gray-900 mt-1">{detail.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'amenities' && (
                  <motion.div key="amenities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Amenities</h3>
                    {property.amenities && property.amenities.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {property.amenities.map((amenity) => {
                          const config = AMENITIES.find((a) => a.label === amenity)
                          const Icon = config?.icon ?? CheckCircle
                          return (
                            <div key={amenity} className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-700">{amenity}</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No amenities listed.</p>
                    )}
                  </motion.div>
                )}

                {activeTab === 'location' && (
                  <motion.div key="location" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Location</h3>
                    <div className="bg-gray-50 rounded-2xl overflow-hidden h-80">
                      {property.latitude && property.longitude ? (
                        <MapContainer
                          center={[property.latitude, property.longitude]}
                          zoom={15}
                          scrollWheelZoom={false}
                          className="w-full h-full"
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <Marker position={[property.latitude, property.longitude]}>
                            <Popup>{property.title}</Popup>
                          </Marker>
                        </MapContainer>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <MapPin className="w-8 h-8 mr-2" />
                          Location map not available
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-3 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {property.address}, {property.city}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              {/* Agent card */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Listed by</h3>
                {property.landlords ? (
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {property.landlords.avatar_url ? (
                        <img src={property.landlords.avatar_url} alt={property.landlords.full_name || 'Agent'}
                          className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (property.landlords.full_name || 'A').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 truncate">{property.landlords.full_name || 'Agent'}</p>
                        {property.landlords.is_verified && (
                          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Verified Landlord</p>
                      {property.landlords.bio && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{property.landlords.bio}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Agent information not available.</p>
                )}

                <div className="mt-5 space-y-2.5">
                  <button
                    onClick={() => setShowContact(true)}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Contact Agent
                  </button>
                  <button
                    onClick={() => setShowEnquiry(true)}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Send Enquiry
                  </button>
                  <button
                    onClick={toggleSave}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border ${
                      isSaved
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save Property'}
                  </button>
                </div>
              </div>

              {/* Safety tips */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-blue-900">Safety Tips</h3>
                </div>
                <ul className="space-y-2">
                  {[
                    'Always inspect the property in person before paying',
                    'Never send money before viewing the property',
                    'Verify the landlord\'s identity through Livarex',
                    'Use Livarex\'s secure payment system when available',
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-xs text-blue-800">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Share */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Share</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href)
                      setShowShare(true)
                      setTimeout(() => setShowShare(false), 2000)
                    }}
                    className="flex-1 py-2.5 bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Copy Link
                  </button>
                </div>
                {showShare && (
                  <p className="text-xs text-emerald-600 font-medium mt-2 text-center">Link copied to clipboard!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Contact modal */}
      <AnimatePresence>
        {showContact && property.landlords?.whatsapp && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowContact(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Contact Agent</h3>
                <button onClick={() => setShowContact(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-3">
                <a
                  href={`https://wa.me/${property.landlords.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">WhatsApp</p>
                    <p className="text-xs text-gray-500">{property.landlords.whatsapp}</p>
                  </div>
                </a>
                {property.landlords.full_name && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <Info className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{property.landlords.full_name}</p>
                      <p className="text-xs text-gray-500">Verified Landlord</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enquiry modal */}
      <AnimatePresence>
        {showEnquiry && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEnquiry(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Send Enquiry</h3>
                <button onClick={() => setShowEnquiry(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {enquirySent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Enquiry Sent!</h4>
                  <p className="text-sm text-gray-500">The landlord will get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={submitEnquiry} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Name</label>
                    <input
                      type="text"
                      required
                      value={enquiryForm.name}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                    <input
                      type="email"
                      required
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Phone</label>
                    <input
                      type="tel"
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+234..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Message</label>
                    <textarea
                      required
                      rows={4}
                      value={enquiryForm.message}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="I'm interested in this property because..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors"
                  >
                    Send Enquiry
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image gallery modal */}
      <AnimatePresence>
        {showAllImages && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAllImages(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">All Photos</h3>
                <button onClick={() => setShowAllImages(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-800">
                    <img
                      src={getSupabaseImageUrl(img.storage_path, 800)}
                      alt={img.alt_text || property.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

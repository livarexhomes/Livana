import { useState, useEffect } from 'react'
import { useParams } from 'wouter'
import { MapPin, ShieldCheck, ArrowRight, Building2, ChevronDown, Search } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import SEO from '@/components/SEO'
import PropertyCard from '@/components/property/PropertyCard'
import NotifyWhenAvailableForm from '@/components/sections/NotifyWhenAvailableForm'
import { Link } from '@/lib/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import type { PropertyWithLandlord } from '@/types'

const LOCATIONS: Record<string, {
  city: string
  area: string
  title: string
  subtitle: string
  description: string
  neighborhoods: string[]
}> = {
  lekki: {
    city: 'Lagos', area: 'Lekki',
    title: 'Properties in Lekki, Lagos',
    subtitle: "Lagos' most sought-after address",
    description: 'Find verified homes, apartments and commercial spaces for rent and lease in Lekki, Lagos. Every listing on LIVAREX is reviewed and landlord-verified — no agents, no hidden fees.',
    neighborhoods: ['Lekki Phase 1', 'Lekki Phase 2', 'VGC', 'Chevron Drive', 'Oral Estate'],
  },
  ikeja: {
    city: 'Lagos', area: 'Ikeja',
    title: 'Properties in Ikeja, Lagos',
    subtitle: 'Lagos State capital — central and connected',
    description: 'Browse verified apartments and houses for rent and lease in Ikeja, Lagos. LIVAREX connects you directly with verified landlords in GRA, Maryland, Allen Avenue and more.',
    neighborhoods: ['GRA Ikeja', 'Maryland', 'Agidingbi', 'Opebi', 'Allen Avenue'],
  },
  ajah: {
    city: 'Lagos', area: 'Ajah',
    title: 'Properties in Ajah, Lagos',
    subtitle: 'Fast-growing hub on the Lekki axis',
    description: 'Find affordable verified homes for rent and lease in Ajah, Lagos. Direct landlord listings in Badore, Abraham Adesanya, Sangotedo and more — with no agent fees.',
    neighborhoods: ['Badore', 'Abraham Adesanya', 'Sangotedo', 'Ogombo', 'Cooperative Villa'],
  },
  yaba: {
    city: 'Lagos', area: 'Yaba',
    title: 'Properties in Yaba, Lagos',
    subtitle: "Lagos tech hub — vibrant, affordable, central",
    description: 'Find verified flats and apartments for rent in Yaba, Lagos. Close to the University of Lagos, tech hubs, and the mainland business district.',
    neighborhoods: ['Sabo', 'Iwaya', 'Akoka', 'Abule-Ijesha', 'Mende'],
  },
  surulere: {
    city: 'Lagos', area: 'Surulere',
    title: 'Properties in Surulere, Lagos',
    subtitle: 'Classic Lagos — residential and well-connected',
    description: 'Verified apartments and flats for rent in Surulere, Lagos. All landlords are ID-verified. Browse Adeniran Ogunsanya, Bode Thomas, Itire and surrounding areas.',
    neighborhoods: ['Adeniran Ogunsanya', 'Bode Thomas', 'Itire', 'Alaka', 'Randle'],
  },
  abuja: {
    city: 'Abuja', area: '',
    title: 'Properties in Abuja, FCT',
    subtitle: "Nigeria's capital — premium, planned, prestigious",
    description: 'Browse verified properties for rent and lease in Abuja, FCT. Find homes in Maitama, Wuse, Gwarinpa, Garki and more — all verified by LIVAREX.',
    neighborhoods: ['Maitama', 'Wuse II', 'Gwarinpa', 'Garki', 'Asokoro'],
  },
  lagos: {
    city: 'Lagos', area: '',
    title: 'Properties in Lagos',
    subtitle: "Nigeria's commercial capital — find your home",
    description: "Browse all verified properties for rent and lease in Lagos. From Lekki to Ikeja, Victoria Island to Surulere — LIVAREX has verified homes across Lagos State.",
    neighborhoods: ['Lekki', 'Ikeja', 'Victoria Island', 'Surulere', 'Yaba', 'Ajah'],
  },
  ogun: {
    city: 'Ogun', area: '',
    title: 'Properties in Ogun',
    subtitle: 'Verified homes and commercial space across Ogun State',
    description: 'Browse verified homes, apartments and commercial spaces for rent and lease in Ogun State. Every listing on LIVAREX is reviewed and landlord-verified — no agents, no hidden fees.',
    neighborhoods: ['Abeokuta', 'Sagamu', 'Ota', 'Ifo', 'Ijebu-Ode'],
  },
  'victoria-island': {
    city: 'Lagos', area: 'Victoria Island',
    title: 'Properties in Victoria Island, Lagos',
    subtitle: "Lagos' business and luxury district",
    description: 'Find premium verified apartments and commercial spaces in Victoria Island, Lagos. Direct landlord listings on LIVAREX — no agents required.',
    neighborhoods: ['VI', 'Eko Atlantic', 'Bar Beach', 'Ahmadu Bello Way', 'Adeola Odeku'],
  },
}

export default function LocationLandingPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''
  const config = LOCATIONS[slug.toLowerCase()]

  const [properties, setProperties] = useState<PropertyWithLandlord[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    if (!config) { setLoading(false); return }
    fetchProperties()
  }, [slug, typeFilter])

  async function fetchProperties() {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('properties')
      .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
      .eq('status', 'available')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(24)

    if (config.city) query = (query as any).ilike('city', `%${config.city}%`)
    if (config.area) query = (query as any).ilike('address', `%${config.area}%`)
    if (typeFilter) query = query.eq('type', typeFilter)

    const { data } = await query
    setProperties((data as PropertyWithLandlord[]) ?? [])
    setLoading(false)
  }

  if (!config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 pt-20">
        <PublicNavbar />
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-3">Location not found</h1>
          <p className="text-gray-500 mb-6">We don't have a page for that area yet.</p>
          <Link href="/listings" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all">
            Browse all properties
          </Link>
        </div>
      </div>
    )
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: config.title,
    description: config.description,
    url: `https://livarex.com.ng/properties-in/${slug}`,
    provider: {
      '@type': 'RealEstateAgent',
      name: 'LIVAREX',
      url: 'https://livarex.com.ng',
    },
    areaServed: {
      '@type': 'Place',
      name: config.area || config.city,
      containedInPlace: { '@type': 'State', name: config.city === 'Abuja' ? 'FCT' : 'Lagos State' },
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={config.title}
        description={config.description}
        url={`/properties-in/${slug}`}
        schema={schema}
      />
      <PublicNavbar />

      {/* Hero */}
      <div className="pt-[72px] bg-gradient-to-br from-gray-950 via-blue-950 to-gray-900">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            <MapPin className="w-3.5 h-3.5" /> {config.city}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-4">
            {config.title}
          </h1>
          <p className="text-blue-200/80 text-base md:text-lg max-w-2xl mx-auto mb-8">
            {config.description}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {config.neighborhoods.map(n => (
              <span key={n} className="px-3 py-1.5 bg-white/10 border border-white/15 text-white/70 text-xs font-semibold rounded-full">
                {n}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {[
              { icon: <ShieldCheck className="w-4 h-4" />, text: 'Verified landlords only' },
              { icon: <span className="font-bold">₦</span>, text: 'No agent fees' },
              { icon: <span>📅</span>, text: 'Book inspection free' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-blue-200/70">
                {icon} {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter strip */}
      <div className="sticky top-[72px] z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">
          {[
            { value: '', label: 'All' },
            { value: 'rent', label: 'For Rent' },
            { value: 'lease', label: 'Lease' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border whitespace-nowrap transition-all shrink-0 ${
                typeFilter === t.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="flex-1" />
          <Link
            href={`/listings?city=${config.city}${config.area ? `&area=${config.area}` : ''}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:border-gray-400 transition-all shrink-0"
          >
            <Search className="w-3.5 h-3.5" /> Advanced search
          </Link>
        </div>
      </div>

      {/* Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{loading ? '—' : properties.length}</span>{' '}
            verified {properties.length === 1 ? 'property' : 'properties'} in {config.area || config.city}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse h-80">
                <div className="h-48 w-full bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-2/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">No listings yet in {config.area || config.city}</h3>
            <p className="text-gray-500 text-sm mb-6">We're expanding to this area soon. Browse all available properties or check back later.</p>
            <Link href="/listings" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all text-sm">
              Browse all properties
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map(p => (
              <PropertyCard key={p.id} property={p} isAuthenticated={false} />
            ))}
          </div>
        )}
      </div>

      {/* SEO text block + area links */}
      <div className="bg-white border-t border-gray-100 mt-8">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-3">
                Renting in {config.area || config.city}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {config.area || config.city} is one of Nigeria's most in-demand property markets. LIVAREX makes it safe and stress-free to find a home here — every landlord is identity-verified and every listing is manually reviewed before going live.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mt-3">
                Browse {config.title.toLowerCase()}, contact landlords directly via WhatsApp or our platform, and book a free inspection — all without paying a single naira to an agent.
              </p>
              <Link href="/how-we-verify" className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-semibold mt-4 hover:underline">
                How we verify landlords <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-3">Explore nearby areas</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(LOCATIONS)
                  .filter(([key]) => key !== slug)
                  .slice(0, 6)
                  .map(([key, loc]) => (
                    <Link key={key} href={`/properties-in/${key}`}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 text-gray-700 hover:text-blue-700 text-sm font-medium rounded-xl transition-all">
                      {loc.area || loc.city}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

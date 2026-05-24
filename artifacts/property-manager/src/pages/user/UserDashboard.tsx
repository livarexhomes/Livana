import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import {
  Heart, MessageSquare, User, MapPin, Building2, Menu, Search, BedDouble, Bath, Tag,
} from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import UserSidebar from '../../components/UserSidebar'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'
import type { Tenant, PropertyWithLandlord } from '../../lib/types'

export function UserLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [location] = useLocation()

  useEffect(() => { setSidebarOpen(false) }, [location])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: t } = await supabase.from('tenants').select('*').eq('user_id', user.id).single() as { data: Tenant | null }
      setTenant(t)
    })
  }, [])

  const displayName = tenant?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
      <UserSidebar
        displayName={displayName}
        userEmail={user?.email}
        initials={initials}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile hamburger */}
      <button type="button" onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
        aria-label="Open menu">
        <Menu className="w-4 h-4" />
      </button>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
          <h1 className="text-base font-extrabold text-gray-900 tracking-tight">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <span className="text-sm font-semibold text-gray-700 hidden sm:block">{displayName}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>
    </div>
  )
}

function PropertyListingCard({ property, savedIds, onToggleSave }: {
  property: PropertyWithLandlord
  savedIds: Set<string>
  onToggleSave: (id: string) => void
}) {
  const coverImage = property.property_images?.find(i => i.is_cover) ?? property.property_images?.[0]
  const imageUrl = coverImage ? getSupabaseImageUrl(coverImage.storage_path) : null
  const isSaved = savedIds.has(property.id)

  return (
    <Link href={`/listings/${property.id}`}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
      {/* Image */}
      <div className="relative h-44 bg-gray-100 shrink-0">
        {imageUrl
          ? <img src={imageUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Building2 className="w-10 h-10 text-gray-200" /></div>
        }
        {/* Type badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${
          property.type === 'rent' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {property.type === 'rent' ? 'Rent' : 'Lease'}
        </span>
        {/* Save button */}
        <button
          type="button"
          onClick={e => { e.preventDefault(); onToggleSave(property.id) }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
        {property.featured && (
          <span className="absolute bottom-3 left-3 px-2 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-bold rounded-md uppercase tracking-wide">Featured</span>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-base font-bold text-gray-900 truncate leading-snug">{property.title}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          {[property.address, property.city].filter(Boolean).join(', ')}
        </p>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{property.bedrooms} bed</span>
          <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{property.bathrooms} bath</span>
          {property.area_sqft && <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{property.area_sqft.toLocaleString()} sqft</span>}
        </div>
        <p className="mt-3 text-lg font-extrabold text-gray-900">
          ₦{Number(property.price).toLocaleString()}
          {property.type === 'rent' && <span className="text-xs font-medium text-gray-400">/yr</span>}
        </p>
      </div>
    </Link>
  )
}

export default function UserDashboardPage() {
  const [properties, setProperties] = useState<PropertyWithLandlord[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'rent' | 'lease'>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (tenant) {
        setTenantId(tenant.id)
        const { data: saved } = await supabase.from('saved_properties').select('property_id').eq('tenant_id', tenant.id)
        setSavedIds(new Set((saved ?? []).map((r: any) => r.property_id)))
      }
      const { data } = await supabase
        .from('properties')
        .select('*, landlords(full_name, whatsapp, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)')
        .eq('status', 'available')
        .in('type', ['rent', 'lease'])
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(40)
      setProperties((data as PropertyWithLandlord[]) ?? [])
      setLoading(false)
    })
  }, [])

  async function handleToggleSave(propertyId: string) {
    if (!tenantId) return
    const supabase = createClient()
    if (savedIds.has(propertyId)) {
      await supabase.from('saved_properties').delete().eq('tenant_id', tenantId).eq('property_id', propertyId)
      setSavedIds(prev => { const n = new Set(prev); n.delete(propertyId); return n })
    } else {
      await supabase.from('saved_properties').insert({ tenant_id: tenantId, property_id: propertyId })
      setSavedIds(prev => new Set(prev).add(propertyId))
    }
  }

  const filtered = properties.filter(p => {
    const matchType = typeFilter === 'all' || p.type === typeFilter
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Browse Listings">
        <div className="space-y-4">
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or city…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              {(['all', 'rent', 'lease'] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize ${
                    typeFilter === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}>
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="flex gap-3">
            <Link href="/user/saved" className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 text-sm font-semibold text-gray-600 hover:border-blue-300 transition-all shadow-sm">
              <Heart className="w-4 h-4 text-red-400" /> Saved
            </Link>
            <Link href="/user/enquiries" className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 text-sm font-semibold text-gray-600 hover:border-blue-300 transition-all shadow-sm">
              <MessageSquare className="w-4 h-4 text-blue-500" /> Enquiries
            </Link>
            <Link href="/user/profile" className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 text-sm font-semibold text-gray-600 hover:border-blue-300 transition-all shadow-sm">
              <User className="w-4 h-4 text-gray-400" /> Profile
            </Link>
          </div>

          {/* Listings grid */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
              <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">No listings found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(p => (
                <PropertyListingCard
                  key={p.id}
                  property={p}
                  savedIds={savedIds}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          )}
        </div>
      </UserLayout>
    </AuthGuard>
  )
}

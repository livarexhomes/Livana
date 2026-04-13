import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { PropertyWithLandlord } from '@/lib/types/database'

const statusStyles = {
  available: 'bg-green-100 text-green-700',
  unavailable: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
}

function PropertyCard({ property }: { property: PropertyWithLandlord }) {
  const cover = property.property_images?.find((i) => i.is_cover) ?? property.property_images?.[0]
  const coverUrl = cover
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${cover.storage_path}`
    : null

  const landlord = property.landlords

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-48 bg-gray-100">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={property.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Availability badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[property.status]}`}>
          {property.status}
        </span>

        {/* Type badge */}
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700 capitalize">
          For {property.type}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
          <p className="text-sm text-gray-500 truncate mt-0.5">{property.city}</p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {property.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {property.bathrooms} bath
          </span>
          {property.area_sqft && (
            <span>{Number(property.area_sqft).toLocaleString()} sqft</span>
          )}
        </div>

        {/* Price */}
        <p className="text-lg font-bold text-gray-900">
          ${Number(property.price).toLocaleString()}
          {property.type === 'rent' && <span className="text-sm font-normal text-gray-500">/mo</span>}
        </p>

        {/* Landlord */}
        {landlord && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-indigo-600">
                  {landlord.full_name.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-gray-600">{landlord.full_name}</span>
              {landlord.is_verified && (
                <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor" aria-label="Verified landlord">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${landlord.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in your listing: ${property.title}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contact
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; city?: string; status?: string }>
}) {
  const { type, city, status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('properties')
    .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
    .eq('landlords.status', 'approved')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)
  if (city) query = query.ilike('city', `%${city}%`)
  if (status) query = query.eq('status', status)
  else query = query.eq('status', 'available') // default: available only

  const { data: properties } = await query

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Property Manager</span>
          </div>
          <Link href="/landlord/login"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Landlord portal →
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Properties</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties?.length ?? 0} listing{properties?.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Filters */}
        <form method="GET" className="flex flex-wrap gap-3">
          <select name="type" defaultValue={type ?? ''}
            className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All types</option>
            <option value="rent">For rent</option>
            <option value="sale">For sale</option>
          </select>

          <select name="status" defaultValue={status ?? 'available'}
            className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="available">Available</option>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
          </select>

          <input name="city" defaultValue={city ?? ''} placeholder="Filter by city…"
            className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

          <button type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
            Search
          </button>

          {(type || city || status) && (
            <Link href="/listings"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition">
              Clear
            </Link>
          )}
        </form>

        {/* Grid */}
        {properties?.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            <p className="text-gray-500">No properties match your search.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties?.map((p) => (
              <PropertyCard key={p.id} property={p as PropertyWithLandlord} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

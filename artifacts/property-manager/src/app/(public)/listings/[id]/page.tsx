export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ImageGallery from './ImageGallery'
import EnquireButton from '@/components/public/EnquireButton'
import type { PropertyStatus } from '@/lib/types/database'

const statusStyles: Record<PropertyStatus, string> = {
  available: 'bg-green-100 text-green-700',
  taken: 'bg-red-100 text-red-700',
  coming_soon: 'bg-blue-100 text-blue-700',
  under_negotiation: 'bg-yellow-100 text-yellow-700',
}

const statusLabels: Record<PropertyStatus, string> = {
  available: 'Available',
  taken: 'Taken',
  coming_soon: 'Coming Soon',
  under_negotiation: 'Under Negotiation',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('properties')
    .select('title, description, city, price, type')
    .eq('id', id)
    .single()

  if (!data) return { title: 'Property not found' }

  return {
    title: `${data.title} — Livana`,
    description: data.description ?? `${data.type === 'rent' ? 'For rent' : 'For sale'} in ${data.city}. $${Number(data.price).toLocaleString()}${data.type === 'rent' ? '/mo' : ''}.`,
  }
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: property }, { data: { user } }] = await Promise.all([
    supabase
      .from('properties')
      .select('*, landlords(id, full_name, whatsapp, bio, avatar_url, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)')
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
  ])

  if (!property) notFound()

  const isAuthenticated = !!user

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const images = (property.property_images as {
    id: string; storage_path: string; alt_text: string | null; is_cover: boolean; sort_order: number
  }[])
    ?.sort((a, b) => (a.is_cover ? -1 : b.is_cover ? 1 : a.sort_order - b.sort_order))
    .map((img) => ({
      ...img,
      url: `${supabaseUrl}/storage/v1/object/public/property-images/${img.storage_path}`,
    })) ?? []

  const landlord = property.landlords as {
    id: string; full_name: string; whatsapp: string; bio: string | null; avatar_url: string | null; is_verified: boolean
  } | null

  const status = property.status as PropertyStatus
  const whatsappMsg = encodeURIComponent(`Hi, I'm interested in your property: ${property.title}`)
  const whatsappUrl = landlord
    ? `https://wa.me/${landlord.whatsapp.replace(/\D/g, '')}?text=${whatsappMsg}`
    : null

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/listings" className="hover:text-gray-900 transition-colors">Listings</Link>
          <span>/</span>
          <span className="text-gray-900 truncate max-w-xs">{property.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: images + details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image gallery */}
            <ImageGallery images={images} title={property.title} />

            {/* Details card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[status]}`}>
                      {statusLabels[status]}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                      For {property.type}
                    </span>
                    {property.featured && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                        Featured
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
                  <p className="flex items-center gap-1.5 text-gray-500 mt-1.5">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {property.address}, {property.city}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">
                    ${Number(property.price).toLocaleString()}
                  </p>
                  {property.type === 'rent' && (
                    <p className="text-sm text-gray-500">per month</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 py-5 border-y border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{property.bedrooms}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Bedroom{property.bedrooms !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <p className="text-2xl font-bold text-gray-900">{property.bathrooms}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Bathroom{property.bathrooms !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {property.area_sqft ? Number(property.area_sqft).toLocaleString() : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Sq ft</p>
                </div>
              </div>

              {/* Description */}
              {property.description && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">About this property</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: contact sidebar */}
          <div className="space-y-4">
            {/* Landlord card */}
            {landlord && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 sticky top-24">
                <h2 className="text-sm font-semibold text-gray-900">Listed by</h2>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    {landlord.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={landlord.avatar_url} alt={landlord.full_name}
                        className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-indigo-600">
                        {landlord.full_name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900">{landlord.full_name}</p>
                      {landlord.is_verified && (
                        <svg className="w-4 h-4 text-indigo-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-label="Verified landlord">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {landlord.is_verified && (
                      <p className="text-xs text-indigo-600 font-medium">Verified landlord</p>
                    )}
                  </div>
                </div>

                {landlord.bio && (
                  <p className="text-sm text-gray-500 leading-relaxed">{landlord.bio}</p>
                )}

                {/* In-app enquiry */}
                <EnquireButton
                  propertyId={property.id}
                  landlordId={landlord?.id ?? null}
                  isAuthenticated={isAuthenticated}
                />

                {/* WhatsApp CTA */}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Contact on WhatsApp
                  </a>
                )}

                <p className="text-xs text-center text-gray-400">
                  You&apos;ll be connected directly with the landlord
                </p>
              </div>
            )}

            {/* Back link */}
            <Link href="/listings"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors px-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to listings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

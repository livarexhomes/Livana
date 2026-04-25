export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { landlordDeleteProperty, landlordUpdateAvailability } from '@/lib/actions/landlord-properties'
import type { Property } from '@/lib/types/database'

const statusStyles: Record<Property['status'], string> = {
  available: 'bg-green-100 text-green-700',
  taken: 'bg-red-100 text-red-700',
  coming_soon: 'bg-blue-100 text-blue-700',
  under_negotiation: 'bg-yellow-100 text-yellow-700',
}

const statusLabels: Record<Property['status'], string> = {
  available: 'Available',
  taken: 'Taken',
  coming_soon: 'Coming Soon',
  under_negotiation: 'Under Negotiation',
}

export default async function LandlordListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: landlord } = await supabase
    .from('landlords')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!landlord) redirect('/login')

  const { data: properties } = await supabase
    .from('properties')
    .select('*, property_images(storage_path, is_cover)')
    .eq('landlord_id', landlord.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">My listings</h2>
          <p className="text-xs text-gray-500 mt-0.5">{properties?.length ?? 0} total</p>
        </div>
        <Link
          href="/landlord/listings/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700
            text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add listing
        </Link>
      </div>

      {properties?.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
          </svg>
          <p className="text-sm text-gray-500">No listings yet.</p>
          <Link href="/landlord/listings/new"
            className="inline-block mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Add your first listing →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties?.map((p) => {
            const cover = (p.property_images as { storage_path: string; is_cover: boolean }[])
              ?.find((img) => img.is_cover) ?? p.property_images?.[0]

            const coverUrl = cover
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${cover.storage_path}`
              : null

            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Cover image */}
                <div className="h-40 bg-gray-100 relative">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[p.status as Property['status']]}`}>
                    {statusLabels[p.status as Property['status']]}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <p className="font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400 truncate">{p.city}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">${Number(p.price).toLocaleString()}</p>

                  {/* Availability toggle */}
                  <div className="flex flex-wrap gap-1.5">
                    {(['available', 'taken', 'coming_soon', 'under_negotiation'] as const).map((s) => (
                      <form key={s} action={async () => {
                        'use server'
                        await landlordUpdateAvailability(p.id, s)
                      }}>
                        <button type="submit"
                          className={`text-xs px-2 py-1 rounded-lg font-medium transition ${
                            p.status === s
                              ? `${statusStyles[s]} ring-1 ring-current`
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}>
                          {statusLabels[s]}
                        </button>
                      </form>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                    <Link href={`/landlord/listings/${p.id}/edit`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      Edit
                    </Link>
                    <form action={async () => {
                      'use server'
                      await landlordDeleteProperty(p.id)
                    }}>
                      <button type="submit"
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

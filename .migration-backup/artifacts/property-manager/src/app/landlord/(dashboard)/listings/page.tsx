export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { landlordDeleteProperty, landlordUpdateAvailability } from '@/lib/actions/landlord-properties'
import type { Property } from '@/lib/types/database'

const statusStyles: Record<Property['status'], string> = {
  available: 'bg-emerald-100 text-emerald-700',
  taken: 'bg-rose-100 text-rose-700',
  coming_soon: 'bg-blue-100 text-blue-700',
  under_negotiation: 'bg-amber-100 text-amber-700',
}

const statusLabels: Record<Property['status'], string> = {
  available: 'Available',
  taken: 'Taken',
  coming_soon: 'Coming Soon',
  under_negotiation: 'Negotiating',
}

const typeBadge: Record<string, string> = {
  rent: 'bg-violet-100 text-violet-700',
  sale: 'bg-sky-100 text-sky-700',
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

  const total = properties?.length ?? 0
  const available = properties?.filter((p) => p.status === 'available').length ?? 0
  const taken = properties?.filter((p) => p.status === 'taken').length ?? 0
  const forRent = properties?.filter((p) => p.type === 'rent').length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">My Listings</h2>
          <p className="text-xs text-gray-400 mt-0.5">{total} properties total</p>
        </div>
        <Link
          href="/landlord/listings/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700
            text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-indigo-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Listing
        </Link>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Available', value: available, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Taken', value: taken, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'For Rent', value: forRent, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl px-4 py-3 flex items-center justify-between`}>
            <span className="text-xs font-medium text-gray-500">{s.label}</span>
            <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Property</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {total === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400">No listings yet</p>
                    <Link href="/landlord/listings/new" className="text-sm text-indigo-600 font-medium hover:underline">
                      Add your first listing
                    </Link>
                  </div>
                </td>
              </tr>
            )}
            {properties?.map((p) => {
              const initials = (p.title ?? 'P').slice(0, 2).toUpperCase()
              return (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate max-w-[200px]">{p.title}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.city}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize ${typeBadge[p.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900">
                    ₦{Number(p.price).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${statusStyles[p.status as Property['status']] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[p.status as Property['status']] ?? p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Toggle available/taken */}
                      <form action={async () => {
                        'use server'
                        const next = p.status === 'available' ? 'taken' : 'available'
                        await landlordUpdateAvailability(p.id, next)
                      }}>
                        <button type="submit" title={p.status === 'available' ? 'Mark taken' : 'Mark available'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                      </form>
                      {/* Edit */}
                      <Link href={`/landlord/listings/${p.id}/edit`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      {/* Delete */}
                      <form action={async () => {
                        'use server'
                        await landlordDeleteProperty(p.id)
                      }}>
                        <button type="submit" title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

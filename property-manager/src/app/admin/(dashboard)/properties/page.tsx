import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deleteProperty, updatePropertyStatus } from '@/lib/actions/properties'
import type { Property } from '@/lib/types/database'

const statusStyles: Record<Property['status'], string> = {
  available: 'bg-green-100 text-green-700',
  unavailable: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
}

export default async function AdminPropertiesPage() {
  const supabase = await createClient()
  const { data: properties } = await supabase
    .from('properties')
    .select('*, landlords(full_name, is_verified), property_images(storage_path, is_cover)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">All Listings</h2>
          <p className="text-xs text-gray-500 mt-0.5">{properties?.length ?? 0} total</p>
        </div>
        <Link
          href="/admin/properties/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700
            text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add listing
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Property</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Landlord</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {properties?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  No listings yet.
                </td>
              </tr>
            )}
            {properties?.map((p) => {
              const landlord = p.landlords as { full_name: string; is_verified: boolean } | null
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[200px]">{p.title}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.city}</p>
                  </td>
                  <td className="px-4 py-3">
                    {landlord ? (
                      <span className="flex items-center gap-1">
                        {landlord.full_name}
                        {landlord.is_verified && (
                          <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{p.type}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    ${Number(p.price).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[p.status as Property['status']]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* Quick status toggle */}
                      <form action={async () => {
                        'use server'
                        const next = p.status === 'available' ? 'unavailable' : 'available'
                        await updatePropertyStatus(p.id, next)
                      }}>
                        <button
                          type="submit"
                          className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2"
                        >
                          {p.status === 'available' ? 'Mark unavailable' : 'Mark available'}
                        </button>
                      </form>
                      <Link
                        href={`/admin/properties/${p.id}/edit`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Edit
                      </Link>
                      <form action={async () => {
                        'use server'
                        await deleteProperty(p.id)
                      }}>
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                          onClick={(e) => {
                            if (!confirm('Delete this listing?')) e.preventDefault()
                          }}
                        >
                          Delete
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

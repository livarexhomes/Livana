export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { approveLandlord, rejectLandlord, toggleVerifiedBadge } from '@/lib/actions/landlords'
import type { LandlordStatus } from '@/lib/types/database'

const statusStyles: Record<LandlordStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default async function AdminLandlordsPage() {
  const supabase = await createClient()
  const { data: landlords } = await supabase
    .from('landlords')
    .select('*')
    .order('created_at', { ascending: false })

  const pending = landlords?.filter((l) => l.status === 'pending') ?? []
  const rest = landlords?.filter((l) => l.status !== 'pending') ?? []
  const sorted = [...pending, ...rest]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Landlords</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {pending.length} pending approval · {landlords?.length ?? 0} total
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">WhatsApp</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Verified</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  No landlords yet.
                </td>
              </tr>
            )}
            {sorted.map((landlord) => (
              <tr key={landlord.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{landlord.full_name}</p>
                  {landlord.bio && (
                    <p className="text-xs text-gray-400 truncate max-w-[180px]">{landlord.bio}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <a
                    href={`https://wa.me/${landlord.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    {landlord.whatsapp}
                  </a>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(landlord.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[landlord.status as LandlordStatus]}`}>
                    {landlord.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <form action={async () => {
                    'use server'
                    await toggleVerifiedBadge(landlord.id, !landlord.is_verified)
                  }}>
                    <button type="submit" className="flex items-center gap-1 text-xs font-medium transition-colors"
                      title={landlord.is_verified ? 'Remove verified badge' : 'Grant verified badge'}>
                      {landlord.is_verified ? (
                        <span className="flex items-center gap-1 text-indigo-600">
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      ) : (
                        <span className="text-gray-400 hover:text-gray-600">Unverified</span>
                      )}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {landlord.status === 'pending' && (
                      <>
                        <form action={async () => {
                          'use server'
                          await approveLandlord(landlord.id)
                        }}>
                          <button type="submit"
                            className="text-xs text-green-600 hover:text-green-800 font-medium">
                            Approve
                          </button>
                        </form>
                        <form action={async () => {
                          'use server'
                          await rejectLandlord(landlord.id)
                        }}>
                          <button type="submit"
                            className="text-xs text-red-500 hover:text-red-700 font-medium">
                            Reject
                          </button>
                        </form>
                      </>
                    )}
                    {landlord.status === 'approved' && (
                      <form action={async () => {
                        'use server'
                        await rejectLandlord(landlord.id)
                      }}>
                        <button type="submit"
                          className="text-xs text-red-500 hover:text-red-700 font-medium">
                          Revoke
                        </button>
                      </form>
                    )}
                    {landlord.status === 'rejected' && (
                      <form action={async () => {
                        'use server'
                        await approveLandlord(landlord.id)
                      }}>
                        <button type="submit"
                          className="text-xs text-green-600 hover:text-green-800 font-medium">
                          Re-approve
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { approveLandlord, rejectLandlord, toggleVerifiedBadge } from '@/lib/actions/landlords'
import type { LandlordStatus } from '@/lib/types/database'

const statusStyles: Record<LandlordStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

export default async function AdminLandlordsPage() {
  const supabase = await createClient()
  const { data: landlords } = await supabase
    .from('landlords')
    .select('*')
    .order('created_at', { ascending: false })

  const pending = landlords?.filter((l) => l.status === 'pending') ?? []
  const approved = landlords?.filter((l) => l.status === 'approved') ?? []
  const rejected = landlords?.filter((l) => l.status === 'rejected') ?? []
  const sorted = [...pending, ...approved, ...rejected]
  const total = landlords?.length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-900">Landlords</h2>
          {pending.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
              {pending.length} pending
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{total} registered · {approved.length} approved · {rejected.length} rejected</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Pending', value: pending.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', value: approved.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rejected', value: rejected.length, color: 'text-red-600', bg: 'bg-red-50' },
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
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Landlord</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">WhatsApp</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Joined</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Verified</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400">No landlords yet</p>
                  </div>
                </td>
              </tr>
            )}
            {sorted.map((landlord) => {
              const initials = (landlord.full_name ?? 'LL').slice(0, 2).toUpperCase()
              return (
                <tr key={landlord.id} className="hover:bg-gray-50/60 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate max-w-[160px]">{landlord.full_name}</p>
                        {landlord.bio && (
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{landlord.bio}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <a
                      href={`https://wa.me/${landlord.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L0 24l6.335-1.508A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.373l-.36-.214-3.727.977.994-3.634-.235-.374A9.818 9.818 0 1112 21.818z"/>
                      </svg>
                      {landlord.whatsapp}
                    </a>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {new Date(landlord.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize ${statusStyles[landlord.status as LandlordStatus]}`}>
                      {landlord.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <form action={async () => {
                      'use server'
                      await toggleVerifiedBadge(landlord.id, !landlord.is_verified)
                    }}>
                      <button type="submit"
                        title={landlord.is_verified ? 'Remove verified badge' : 'Grant verified badge'}
                        className="flex items-center gap-1.5 text-xs font-semibold transition-colors">
                        {landlord.is_verified ? (
                          <span className="flex items-center gap-1 text-indigo-600">
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="text-gray-300 hover:text-gray-500">Unverified</span>
                        )}
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {landlord.status === 'pending' && (
                        <>
                          <form action={async () => {
                            'use server'
                            await approveLandlord(landlord.id)
                          }}>
                            <button type="submit"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                              Approve
                            </button>
                          </form>
                          <form action={async () => {
                            'use server'
                            await rejectLandlord(landlord.id)
                          }}>
                            <button type="submit"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                            Re-approve
                          </button>
                        </form>
                      )}
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

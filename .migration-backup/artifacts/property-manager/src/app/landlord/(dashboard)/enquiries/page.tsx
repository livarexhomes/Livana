import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import EnquiryStatusButton from '@/components/landlord/EnquiryStatusButton'
import type { EnquiryWithTenantAndProperty } from '@/lib/types/database'

const statusStyles = {
  open: 'bg-yellow-100 text-yellow-700',
  replied: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

const statusLabels = {
  open: 'Open',
  replied: 'Replied',
  closed: 'Closed',
}

export default async function LandlordEnquiriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: landlord } = await supabase
    .from('landlords')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!landlord) redirect('/login')

  const { data: enquiries } = await supabase
    .from('enquiries')
    .select(`
      id, message, status, created_at,
      properties (id, title, city, price, type),
      tenants (full_name, phone)
    `)
    .eq('landlord_id', landlord.id)
    .order('created_at', { ascending: false })

  const items = (enquiries ?? []) as unknown as EnquiryWithTenantAndProperty[]

  const total = items.length
  const open = items.filter((i) => i.status === 'open').length
  const replied = items.filter((i) => i.status === 'replied').length
  const closed = items.filter((i) => i.status === 'closed').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-gray-900">Enquiries</h2>
        <p className="text-xs text-gray-400 mt-0.5">{total} total</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Open', value: open, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Replied', value: replied, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Closed', value: closed, color: 'text-gray-500', bg: 'bg-gray-100' },
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
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">From</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Property</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Message</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {total === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">No enquiries yet</p>
                    <p className="text-xs text-gray-400">Enquiries from tenants will appear here once your listings go live.</p>
                  </div>
                </td>
              </tr>
            )}
            {items.map((item) => {
              const initials = item.tenants?.full_name
                ? item.tenants.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : '?'

              return (
                <tr key={item.id} className="hover:bg-gray-50/60 transition-colors group">
                  {/* Tenant */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate max-w-[120px]">
                          {item.tenants?.full_name ?? '—'}
                        </p>
                        {item.tenants?.phone && (
                          <a href={`tel:${item.tenants.phone}`}
                            className="text-xs text-gray-400 hover:text-indigo-600 truncate max-w-[120px] block transition-colors">
                            {item.tenants.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Property */}
                  <td className="px-5 py-4">
                    <Link href={`/listings/${item.properties.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate max-w-[160px] block">
                      {item.properties.title}
                    </Link>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">
                      {item.properties.city} · ₦{Number(item.properties.price).toLocaleString()}
                    </p>
                  </td>

                  {/* Message */}
                  <td className="px-5 py-4 max-w-[220px]">
                    <p className="text-sm text-gray-600 truncate">{item.message}</p>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>

                  {/* Status badge */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${statusStyles[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <EnquiryStatusButton enquiryId={item.id} currentStatus={item.status} />
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

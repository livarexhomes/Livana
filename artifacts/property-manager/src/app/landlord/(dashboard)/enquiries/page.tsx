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

  const openCount = items.filter((i) => i.status === 'open').length

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Enquiries</h2>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} total · {openCount} open
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-1">No enquiries yet</h3>
          <p className="text-sm text-gray-500">
            Enquiries from tenants will appear here once your listings go live.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/listings/${item.properties.id}`}
                    className="font-semibold text-gray-900 hover:underline truncate block"
                  >
                    {item.properties.title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {item.properties.city} · ₦{Number(item.properties.price).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[item.status]}`}
                >
                  {statusLabels[item.status]}
                </span>
              </div>

              {/* Tenant info */}
              {item.tenants && (
                <p className="text-xs text-gray-500">
                  From <span className="font-medium text-gray-700">{item.tenants.full_name}</span>
                  {item.tenants.phone && (
                    <> · <a href={`tel:${item.tenants.phone}`} className="hover:underline">{item.tenants.phone}</a></>
                  )}
                </p>
              )}

              {/* Message */}
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">
                {item.message}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <EnquiryStatusButton enquiryId={item.id} currentStatus={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { MessageSquare } from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import { UserLayout } from './UserDashboard'
import { createClient } from '../../lib/supabase'

const statusStyles: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  replied: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default function UserEnquiriesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single()
      if (!tenant) { setLoading(false); return }
      const { data } = await supabase
        .from('enquiries')
        .select('id, message, status, created_at, properties(id, title, city, price, type)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
      setItems(data ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Enquiries">
        <div className="max-w-3xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Enquiries</h2>
            <p className="text-sm text-gray-500 mt-1">{items.length} {items.length === 1 ? 'enquiry' : 'enquiries'} sent</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">No enquiries yet</h3>
              <p className="text-sm text-gray-500 mb-4">Send an enquiry from any property listing.</p>
              <Link href="/listings" className="inline-flex items-center gap-2 px-4 py-2 bg-[#6b9e6e] text-white text-sm font-semibold rounded-lg">
                Browse listings
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <Link href={`/listings/${item.properties.id}`} className="font-semibold text-gray-900 hover:underline">
                        {item.properties.title}
                      </Link>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {item.properties.city} · ₦{Number(item.properties.price).toLocaleString()}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">{item.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Sent {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </UserLayout>
    </AuthGuard>
  )
}

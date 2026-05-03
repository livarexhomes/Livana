import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { MessageSquare, MapPin, Clock, ArrowRight, Building2 } from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import { UserLayout } from './UserDashboard'
import { createClient } from '../../lib/supabase'

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open:    { label: 'Open',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  replied: { label: 'Replied', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed:  { label: 'Closed', bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400'    },
}

export default function UserEnquiriesPage() {
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (!tenant) { setLoading(false); return }
      const result = await supabase
        .from('enquiries')
        .select('id, message, status, created_at, properties(id, title, city, price, type)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
      setItems((result.data as any[]) ?? [])
      setLoading(false)
    })
  }, [])

  const tabs = [
    { key: 'all',     label: 'All',     count: items.length },
    { key: 'open',    label: 'Open',    count: items.filter(i => i.status === 'open').length },
    { key: 'replied', label: 'Replied', count: items.filter(i => i.status === 'replied').length },
    { key: 'closed',  label: 'Closed',  count: items.filter(i => i.status === 'closed').length },
  ]
  const visible = filter === 'all' ? items : items.filter(i => i.status === filter)

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Enquiries">
        <div className="space-y-4 max-w-3xl">
          {/* Filter tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button key={tab.key} type="button" onClick={() => setFilter(tab.key)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}>
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">No enquiries{filter !== 'all' ? ` with status "${filter}"` : ' yet'}</h3>
              <p className="text-sm text-gray-500 mb-5">Send an enquiry from any property listing.</p>
              <Link href="/listings"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                Browse listings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map(item => {
                const s = STATUS[item.status] ?? STATUS.open
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-gray-50">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-4.5 h-4.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/listings/${item.properties.id}`}
                            className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors line-clamp-1">
                            {item.properties.title}
                          </Link>
                          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${s.bg} ${s.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          {item.properties.city && (
                            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{item.properties.city}</span>
                          )}
                          {item.properties.price && (
                            <span className="font-semibold text-gray-600">₦{Number(item.properties.price).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-0.5 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-4 py-3">{item.message}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </UserLayout>
    </AuthGuard>
  )
}

import { useState, useEffect } from 'react'
import { MessageSquare, MapPin, Phone, User, Clock, CheckCircle, X } from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open:    { label: 'Open',    bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'   },
  replied: { label: 'Replied', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed:  { label: 'Closed', bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
}

const AVATAR_GRADS = [
  'from-violet-500 to-purple-600', 'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
]
function avatarGrad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADS[h % AVATAR_GRADS.length]
}

export default function LandlordEnquiries() {
  const [landlord, setLandlord]   = useState<Landlord | null>(null)
  const [user, setUser]           = useState<{ email?: string } | null>(null)
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: l } = await supabase.from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (l) {
        const result = await supabase
          .from('enquiries')
          .select('*, properties(id, title, city, price), tenants(full_name, phone)')
          .eq('landlord_id', l.id)
          .order('created_at', { ascending: false })
        setEnquiries((result.data as any[]) ?? [])
      }
      setLoading(false)
    })
  }, [])

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('enquiries').update({ status }).eq('id', id)
    setEnquiries(es => es.map(e => e.id === id ? { ...e, status } : e))
  }

  const tabs = [
    { key: 'all',    label: 'All',     count: enquiries.length },
    { key: 'open',   label: 'Open',    count: enquiries.filter(e => e.status === 'open').length },
    { key: 'replied',label: 'Replied', count: enquiries.filter(e => e.status === 'replied').length },
    { key: 'closed', label: 'Closed',  count: enquiries.filter(e => e.status === 'closed').length },
  ]
  const visible = filter === 'all' ? enquiries : enquiries.filter(e => e.status === filter)

  return (
    <AuthGuard require="landlord">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Enquiries</h1>
              <p className="text-sm text-gray-400 mt-0.5">Messages from potential tenants</p>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
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
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-1">No enquiries{filter !== 'all' ? ` with status "${filter}"` : ''}</h3>
                <p className="text-sm text-gray-500">Enquiries from tenants will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl">
                {visible.map(e => {
                  const s = STATUS_META[e.status] ?? STATUS_META.open
                  const tenantName = e.tenants?.full_name ?? 'Tenant'
                  const initials = tenantName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                  const grad = avatarGrad(tenantName)
                  return (
                    <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                      {/* Header */}
                      <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-gray-50">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
                          <span className="text-xs font-bold text-white">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 text-sm">{tenantName}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${s.bg} ${s.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-xs font-semibold text-blue-600 truncate">{e.properties?.title ?? 'Property enquiry'}</p>
                            {e.properties?.city && (
                              <div className="flex items-center gap-0.5 text-[11px] text-gray-400 shrink-0">
                                <MapPin className="w-3 h-3" />{e.properties.city}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="flex items-center gap-0.5 text-[11px] text-gray-400 justify-end">
                            <Clock className="w-3 h-3" />
                            {new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                          {e.properties?.price && (
                            <p className="text-xs font-bold text-gray-800 mt-0.5">₦{Number(e.properties.price).toLocaleString()}</p>
                          )}
                        </div>
                      </div>

                      {/* Message */}
                      <div className="px-5 py-3.5">
                        <p className="text-sm text-gray-600 leading-relaxed">{e.message}</p>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between px-5 pb-4 pt-1 gap-3">
                        <div className="flex items-center gap-3">
                          {e.tenants?.phone && (
                            <a href={`https://wa.me/${e.tenants.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                              <Phone className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                          )}
                          <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <User className="w-3.5 h-3.5" />{tenantName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {e.status !== 'replied' && (
                            <button type="button" onClick={() => updateStatus(e.id, 'replied')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                              <CheckCircle className="w-3 h-3" /> Mark Replied
                            </button>
                          )}
                          {e.status !== 'closed' && (
                            <button type="button" onClick={() => updateStatus(e.id, 'closed')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                              <X className="w-3 h-3" /> Close
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

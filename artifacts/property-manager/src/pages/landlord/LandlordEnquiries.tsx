import { useState, useEffect } from 'react'
import { MessageSquare, MapPin, Phone, User, Clock, CheckCircle, X, Headphones, Send, ChevronDown, ChevronUp } from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open:    { label: 'Open',    bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'   },
  replied: { label: 'Replied', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed:  { label: 'Closed', bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
}

const ADMIN_WHATSAPP = '+2348005482621'
const ADMIN_EMAIL    = 'support@livana.com'

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
  const [landlord, setLandlord]         = useState<Landlord | null>(null)
  const [user, setUser]                 = useState<{ email?: string } | null>(null)
  const [enquiries, setEnquiries]       = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('all')
  const [contactOpen, setContactOpen]   = useState(false)
  const [contactMsg, setContactMsg]     = useState('')
  const [contactSent, setContactSent]   = useState(false)
  const [contactLoading, setContactLoading] = useState(false)

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

  async function handleContactAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!contactMsg.trim() || !landlord) return
    setContactLoading(true)
    const supabase = createClient()
    await supabase.from('enquiries').insert({
      tenant_id: null,
      property_id: null,
      landlord_id: landlord.id,
      message: `[LANDLORD SUPPORT] ${landlord.full_name}: ${contactMsg}`,
    }).then(() => {
      setContactSent(true)
      setContactLoading(false)
      setContactMsg('')
    }).catch(() => {
      setContactLoading(false)
    })
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
            <button
              type="button"
              onClick={() => { setContactOpen(o => !o); setContactSent(false) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0c0c15] hover:bg-[#1a1a28] text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <Headphones className="w-4 h-4" />
              <span className="hidden sm:inline">Contact Admin</span>
              {contactOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </header>

          {/* Contact Admin Panel */}
          {contactOpen && (
            <div className="mx-4 md:mx-6 mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0c0c15] flex items-center justify-center shrink-0">
                    <Headphones className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Contact Livana Support</p>
                    <p className="text-xs text-gray-400 mt-0.5">We're here to help · Usually reply within 24h</p>
                  </div>
                </div>
                <button type="button" onClick={() => setContactOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                {/* Quick contact links */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <a
                    href={`https://wa.me/${ADMIN_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent('Hi Livana Support, I need help with my account.')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 border-[#25D366]/30 bg-[#25D366]/5 hover:bg-[#25D366]/10 transition-colors group"
                  >
                    <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800">WhatsApp</p>
                      <p className="text-[11px] text-gray-400">Chat now</p>
                    </div>
                  </a>

                  <a
                    href={`mailto:${ADMIN_EMAIL}?subject=Landlord Support - ${landlord?.full_name ?? ''}`}
                    className="flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 border-blue-200/60 bg-blue-50/40 hover:bg-blue-50 transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800">Email</p>
                      <p className="text-[11px] text-gray-400">{ADMIN_EMAIL}</p>
                    </div>
                  </a>
                </div>

                {/* In-platform message */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Or send a message</p>
                  {contactSent ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Message sent! Our team will respond within 24 hours.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleContactAdmin} className="flex gap-2">
                      <input
                        type="text"
                        value={contactMsg}
                        onChange={e => setContactMsg(e.target.value)}
                        placeholder="Describe your issue or question…"
                        required
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                      />
                      <button type="submit" disabled={contactLoading || contactMsg.trim().length < 5}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shrink-0">
                        <Send className="w-3.5 h-3.5" />
                        {contactLoading ? 'Sending…' : 'Send'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

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

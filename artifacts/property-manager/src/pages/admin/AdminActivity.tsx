import { useState, useEffect } from 'react'
import { Activity, UserPlus, Building2, MessageSquare, ShieldCheck, Filter } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

type ActivityItem = {
  id: string
  type: 'landlord_signup' | 'tenant_signup' | 'property_listed' | 'enquiry_sent' | 'kyc_submitted'
  title: string
  sub: string
  ts: string
}

const TYPE_META: Record<string, { label: string; icon: any; bg: string; text: string }> = {
  landlord_signup:  { label: 'Landlord Signup',  icon: UserPlus,     bg: 'bg-violet-100', text: 'text-violet-600' },
  tenant_signup:    { label: 'Tenant Signup',    icon: UserPlus,     bg: 'bg-blue-100',   text: 'text-blue-600'   },
  property_listed:  { label: 'Property Listed',  icon: Building2,    bg: 'bg-emerald-100',text: 'text-emerald-600'},
  enquiry_sent:     { label: 'Enquiry Sent',     icon: MessageSquare,bg: 'bg-amber-100',  text: 'text-amber-600'  },
  kyc_submitted:    { label: 'KYC Submitted',    icon: ShieldCheck,  bg: 'bg-indigo-100', text: 'text-indigo-600' },
}

const ALL_TYPES = Object.keys(TYPE_META)

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function groupByDay(items: ActivityItem[]) {
  const groups: { label: string; items: ActivityItem[] }[] = []
  const map = new Map<string, ActivityItem[]>()
  for (const item of items) {
    const d = new Date(item.ts)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    let key: string
    if (d.toDateString() === today.toDateString()) key = 'Today'
    else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday'
    else key = d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })
    if (!map.has(key)) { map.set(key, []); groups.push({ label: key, items: map.get(key)! }) }
    map.get(key)!.push(item)
  }
  return groups
}

export default function AdminActivity() {
  const [user, setUser]       = useState<{ email?: string } | null>(null)
  const [items, setItems]     = useState<ActivityItem[]>([])
  const [filtered, setFiltered] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))

    Promise.all([
      supabase.from('landlords').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('tenants').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('properties').select('id, title, city, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('enquiries').select('id, message, created_at, properties(title)').order('created_at', { ascending: false }).limit(50),
    ]).then(([{ data: landlords }, { data: tenants }, { data: properties }, { data: enquiries }]) => {
      const all: ActivityItem[] = []

      for (const l of landlords ?? []) {
        all.push({ id: `ll-${l.id}`, type: 'landlord_signup', title: `${l.full_name} joined as a landlord`, sub: l.whatsapp ?? '', ts: l.created_at })
        if (l.kyc_submitted_at) {
          all.push({ id: `kyc-${l.id}`, type: 'kyc_submitted', title: `${l.full_name} submitted KYC`, sub: `Status: ${l.status}`, ts: l.kyc_submitted_at })
        }
      }
      for (const t of tenants ?? []) {
        all.push({ id: `tn-${t.id}`, type: 'tenant_signup', title: `${t.full_name} created an account`, sub: 'Tenant', ts: t.created_at })
      }
      for (const p of properties ?? []) {
        all.push({ id: `pr-${p.id}`, type: 'property_listed', title: p.title, sub: p.city ?? '', ts: p.created_at })
      }
      for (const e of enquiries ?? []) {
        all.push({ id: `eq-${e.id}`, type: 'enquiry_sent', title: `Enquiry on ${(e as any).properties?.title ?? 'a property'}`, sub: (e.message ?? '').slice(0, 60), ts: e.created_at })
      }

      all.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      setItems(all)
      setFiltered(all)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (typeFilter === 'all') { setFiltered(items); return }
    setFiltered(items.filter(i => i.type === typeFilter))
  }, [typeFilter, items])

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const groups = groupByDay(filtered)

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Activity Log"
            subtitle={`${items.length.toLocaleString()} total events`}
          />

          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
            {/* Type filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button onClick={() => setTypeFilter('all')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  typeFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}>
                <Filter className="w-3 h-3" /> All
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${typeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{items.length}</span>
              </button>
              {ALL_TYPES.map(t => {
                const meta = TYPE_META[t]
                const Icon = meta.icon
                const count = items.filter(i => i.type === t).length
                return (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      typeFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}>
                    <Icon className="w-3 h-3" /> {meta.label}
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${typeFilter === t ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                  </button>
                )
              })}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <Activity className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 px-1">{group.label}</p>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                      {group.items.map(item => {
                        const meta = TYPE_META[item.type]
                        const Icon = meta.icon
                        return (
                          <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
                              <Icon className={`w-4 h-4 ${meta.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{item.title}</p>
                              {item.sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.sub}</p>}
                              <span className="inline-block mt-1 text-[10px] font-semibold text-gray-300 uppercase tracking-wide">{meta.label}</span>
                            </div>
                            <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{relativeTime(item.ts)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

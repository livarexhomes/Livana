import { useState, useEffect } from 'react'
import { Activity, UserPlus, Building2, MessageSquare, ShieldCheck } from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient } from '../../lib/supabase'

type ActivityItem = {
  id: string
  type: 'landlord_signup' | 'tenant_signup' | 'property_listed' | 'enquiry_sent' | 'kyc_submitted'
  title: string
  sub: string
  ts: string
}

const TYPE_META: Record<string, { label: string; icon: any; bg: string; text: string }> = {
  landlord_signup:  { label: 'Landlord Signup',   icon: UserPlus,      bg: 'bg-violet-100', text: 'text-violet-600' },
  tenant_signup:    { label: 'Tenant Signup',     icon: UserPlus,      bg: 'bg-blue-100',   text: 'text-blue-600'   },
  property_listed:  { label: 'Property Listed',   icon: Building2,     bg: 'bg-emerald-100',text: 'text-emerald-600'},
  enquiry_sent:     { label: 'Enquiry Sent',      icon: MessageSquare, bg: 'bg-amber-100',  text: 'text-amber-600'  },
  kyc_submitted:    { label: 'KYC Submitted',     icon: ShieldCheck,   bg: 'bg-indigo-100', text: 'text-indigo-600' },
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
  const [user, setUser]          = useState<{ email?: string } | null>(null)
  const [items, setItems]        = useState<ActivityItem[]>([])
  const [filtered, setFiltered]  = useState<ActivityItem[]>([])
  const [loading, setLoading]    = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email })
      if (user?.id) window.__livarexUserId = user.id
    })

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

  const rawName = user?.email ? user.email.split('@')[0] : 'Admin'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const groups = groupByDay(filtered)
  const eventCounts = ALL_TYPES.reduce((acc, type) => {
    acc[type as ActivityItem['type']] = items.filter(i => i.type === type).length
    return acc
  }, {} as Record<ActivityItem['type'], number>)

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Activity Log"
            subtitle={`${items.length.toLocaleString()} total events`}
          />

          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-3 md:p-4">
              <div className="grid gap-3 xl:grid-cols-[1.7fr_0.9fr]">
                <section className="space-y-3">
                  {/* Activity overview */}
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-semibold">Activity overview</p>
                        <h2 className="mt-0.5 text-base font-bold text-slate-950">Real-time platform activity</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Registrations, listings, enquiries, and KYC events in one place.</p>
                      </div>
                      <div className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-100">
                        Showing {filtered.length.toLocaleString()} of {items.length.toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                      {[
                        { label: 'Total events',      value: items.length,                    cls: 'bg-slate-50' },
                        { label: 'Properties listed',  value: eventCounts.property_listed,     cls: 'bg-emerald-50' },
                        { label: 'Tenant signups',    value: eventCounts.tenant_signup,       cls: 'bg-blue-50' },
                        { label: 'Landlord signups',  value: eventCounts.landlord_signup,     cls: 'bg-violet-50' },
                        { label: 'Enquiries sent',    value: eventCounts.enquiry_sent,         cls: 'bg-amber-50' },
                        { label: 'KYC submissions',   value: eventCounts.kyc_submitted,       cls: 'bg-indigo-50' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-lg border border-slate-100 px-3 py-2 ${s.cls}`}>
                          <p className="text-lg leading-tight font-bold text-slate-900">{s.value.toLocaleString()}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500 truncate">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filter */}
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-semibold">Filter</p>
                        <h3 className="mt-0.5 text-sm font-semibold text-slate-950">Activity type</h3>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-100">Latest 50 events</div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <button onClick={() => setTypeFilter('all')}
                        className={`shrink-0 inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                          typeFilter === 'all' ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        <Activity className="w-3.5 h-3.5" />
                        All
                        <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-md px-1 text-[10px] font-bold tabular-nums ${typeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>{items.length}</span>
                      </button>
                      {ALL_TYPES.map(t => {
                        const meta = TYPE_META[t]
                        const Icon = meta.icon
                        const count = eventCounts[t as ActivityItem['type']]
                        const active = typeFilter === t
                        return (
                          <button key={t} onClick={() => setTypeFilter(t)}
                            className={`shrink-0 inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                              active ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}>
                            <span className={`flex h-4 w-4 items-center justify-center rounded-md ${meta.bg} ${meta.text}`}><Icon className="w-3 h-3" /></span>
                            {meta.label}
                            <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-md px-1 text-[10px] font-bold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>{count}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin w-8 h-8 border-[3px] border-slate-200 border-t-slate-900 rounded-full" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                      <Activity className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-base font-semibold text-slate-900">No activity found</p>
                      <p className="mt-1 text-sm text-slate-500">Change your filter or wait for new events to appear.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {groups.map(group => (
                        <div key={group.label} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-100">
                            <h4 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">{group.label}</h4>
                            <span className="text-[10px] font-semibold text-slate-400">{group.items.length} events</span>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {group.items.map(item => {
                              const meta = TYPE_META[item.type]
                              const Icon = meta.icon
                              return (
                                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50">
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                                    <Icon className={`w-4 h-4 ${meta.text}`} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold text-slate-900 truncate">{item.title}</p>
                                    {item.sub && <p className="mt-0.5 text-[11px] text-slate-500 truncate">{item.sub}</p>}
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{meta.label}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">{relativeTime(item.ts)}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <aside className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Recent events</p>
                    <div className="mt-2.5 space-y-1.5">
                      {filtered.slice(0, 4).map(item => {
                        const meta = TYPE_META[item.type]
                        const Icon = meta.icon
                        return (
                          <div key={item.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                              <Icon className={`w-4 h-4 ${meta.text}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-900 truncate">{item.title}</p>
                              <p className="text-[11px] text-slate-500 tabular-nums">{relativeTime(item.ts)}</p>
                            </div>
                          </div>
                        )
                      })}
                      {filtered.length === 0 && (
                        <p className="text-sm text-slate-500">No recent activity to show.</p>
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

import { useState, useEffect } from 'react'
import { Activity, UserPlus, Building2, MessageSquare, ShieldCheck, Filter } from 'lucide-react'
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
              <div className="grid gap-4 xl:grid-cols-[1.7fr_0.9fr]">
                <section className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Activity overview</p>
                        <h2 className="mt-2 text-2xl font-extrabold text-slate-950">Real-time platform activity</h2>
                        <p className="mt-2 text-sm text-slate-500">Track registrations, property listings, enquiries, and KYC events in one place.</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">Showing {filtered.length.toLocaleString()} of {items.length.toLocaleString()}</div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-sm text-slate-500">Total events</p>
                        <p className="mt-3 text-3xl font-semibold text-slate-950">{items.length.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-emerald-50 p-3">
                        <p className="text-sm text-emerald-700">Properties listed</p>
                        <p className="mt-3 text-3xl font-semibold text-emerald-900">{eventCounts.property_listed.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-blue-50 p-3">
                        <p className="text-sm text-blue-700">Tenant signups</p>
                        <p className="mt-3 text-3xl font-semibold text-blue-900">{eventCounts.tenant_signup.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-violet-50 p-3">
                        <p className="text-sm text-violet-700">Landlord signups</p>
                        <p className="mt-3 text-3xl font-semibold text-violet-900">{eventCounts.landlord_signup.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-amber-50 p-3">
                        <p className="text-sm text-amber-700">Enquiries sent</p>
                        <p className="mt-3 text-3xl font-semibold text-amber-900">{eventCounts.enquiry_sent.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-indigo-50 p-3">
                        <p className="text-sm text-indigo-700">KYC submissions</p>
                        <p className="mt-3 text-3xl font-semibold text-indigo-900">{eventCounts.kyc_submitted.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Filter</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">Activity type</h3>
                      </div>
                      <div className="rounded-3xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Latest 50 events</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => setTypeFilter('all')}
                        className={`shrink-0 flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          typeFilter === 'all' ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        <Activity className="w-4 h-4" />
                        All
                        <span className="ml-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-900 text-[11px] text-white">{items.length}</span>
                      </button>
                      {ALL_TYPES.map(t => {
                        const meta = TYPE_META[t]
                        const Icon = meta.icon
                        const count = eventCounts[t as ActivityItem['type']]
                        return (
                          <button key={t} onClick={() => setTypeFilter(t)}
                            className={`shrink-0 flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                              typeFilter === t ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}>
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${meta.bg} ${meta.text}`}><Icon className="w-4 h-4" /></span>
                            {meta.label}
                            <span className="ml-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-900 text-[11px] text-white">{count}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                      <Activity className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                      <p className="text-lg font-semibold text-slate-900">No activity found</p>
                      <p className="mt-2 text-sm text-slate-500">Change your filter or wait for new events to appear.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groups.map(group => (
                        <div key={group.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-4 mb-4">
                            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">{group.label}</h4>
                            <span className="text-xs font-semibold text-slate-500">{group.items.length} events</span>
                          </div>
                          <div className="space-y-3">
                            {group.items.map(item => {
                              const meta = TYPE_META[item.type]
                              const Icon = meta.icon
                              return (
                                <div key={item.id} className="group rounded-2xl border border-slate-100 p-3 transition hover:border-slate-300 hover:bg-slate-50">
                                  <div className="flex items-start gap-3">
                                    <div className={`mt-1 flex h-9 w-9 items-center justify-center rounded-2xl ${meta.bg}`}>
                                      <Icon className={`w-5 h-5 ${meta.text}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-slate-950 truncate">{item.title}</p>
                                      {item.sub && <p className="mt-1 text-sm text-slate-500 truncate">{item.sub}</p>}
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{meta.label}</p>
                                      <p className="mt-1 text-xs text-slate-500">{relativeTime(item.ts)}</p>
                                    </div>
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

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Recent events</p>
                    <div className="mt-4 space-y-3">
                      {filtered.slice(0, 4).map(item => {
                        const meta = TYPE_META[item.type]
                        const Icon = meta.icon
                        return (
                          <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-3xl ${meta.bg}`}>
                              <Icon className={`w-4 h-4 ${meta.text}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-950 truncate">{item.title}</p>
                              <p className="mt-1 text-xs text-slate-500 truncate">{relativeTime(item.ts)}</p>
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

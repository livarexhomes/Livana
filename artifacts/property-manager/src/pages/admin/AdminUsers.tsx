import { useState, useEffect, useRef } from 'react'
import { Search, Phone, Users, MessageSquare, Clock, UserX, MoreVertical, ShieldOff, Trash2, ShieldCheck, X, ChevronRight, Home, Calendar } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600', 'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',  'from-indigo-400 to-indigo-600',
]
function avatarGrad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 2592000) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

type Tenant = {
  id: string
  user_id: string
  full_name: string
  phone?: string | null
  email?: string | null
  created_at: string
  enquiry_count: number
  status: 'active' | 'suspended'
}

type ConfirmAction = { type: 'suspend' | 'unsuspend' | 'delete'; tenant: Tenant }

type TenantEnquiry = {
  id: string
  message: string
  status: 'open' | 'replied' | 'closed'
  created_at: string
  property_title: string | null
  property_city: string | null
}

const ENQ_STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  open:    { label: 'Open',    color: 'text-amber-700',  bg: 'bg-amber-50',  dot: 'bg-amber-400'  },
  replied: { label: 'Replied', color: 'text-blue-700',   bg: 'bg-blue-50',   dot: 'bg-blue-500'   },
  closed:  { label: 'Closed',  color: 'text-gray-500',   bg: 'bg-gray-100',  dot: 'bg-gray-400'   },
}

function TenantDrawer({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [enquiries, setEnquiries] = useState<TenantEnquiry[]>([])
  const [loading, setLoading] = useState(true)
  const grad = avatarGrad(tenant.full_name)
  const initials = getInitials(tenant.full_name)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('enquiries')
      .select('id, message, status, created_at, properties(title, city)')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEnquiries(
          (data ?? []).map((e: any) => ({
            id: e.id,
            message: e.message,
            status: e.status,
            created_at: e.created_at,
            property_title: e.properties?.title ?? null,
            property_city: e.properties?.city ?? null,
          }))
        )
        setLoading(false)
      })
  }, [tenant.id])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 shrink-0">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-gray-900 text-base truncate">{tenant.full_name}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{tenant.email ?? tenant.phone ?? 'No contact info'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 shrink-0">
          {[
            { label: 'Enquiries', value: enquiries.length },
            { label: 'Open', value: enquiries.filter(e => e.status === 'open').length },
            { label: 'Joined', value: timeAgo(tenant.created_at) },
          ].map(s => (
            <div key={s.label} className="px-4 py-3 text-center">
              <p className="text-base font-extrabold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Enquiries list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-50">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Enquiries</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : enquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No enquiries yet</p>
              <p className="text-xs text-gray-400 mt-1">This tenant hasn't sent any enquiries.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {enquiries.map(enq => {
                const s = ENQ_STATUS[enq.status] ?? ENQ_STATUS.open
                return (
                  <div key={enq.id} className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
                    {/* Property */}
                    {enq.property_title && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Home className="w-3 h-3 text-gray-400 shrink-0" />
                        <p className="text-xs font-semibold text-gray-700 truncate">{enq.property_title}</p>
                        {enq.property_city && <span className="text-xs text-gray-400 shrink-0">· {enq.property_city}</span>}
                      </div>
                    )}
                    {/* Message */}
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{enq.message}</p>
                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {timeAgo(enq.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ActionMenu({ tenant, onAction }: { tenant: Tenant; onAction: (a: ConfirmAction) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
          {tenant.status === 'suspended' ? (
            <button
              onClick={() => { setOpen(false); onAction({ type: 'unsuspend', tenant }) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Unsuspend
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); onAction({ type: 'suspend', tenant }) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <ShieldOff className="w-4 h-4" />
              Suspend
            </button>
          )}
          <div className="mx-3 my-1 h-px bg-gray-100" />
          <button
            onClick={() => { setOpen(false); onAction({ type: 'delete', tenant }) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete user
          </button>
        </div>
      )}
    </div>
  )
}

function ConfirmModal({ action, onConfirm, onCancel, loading }: {
  action: ConfirmAction
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const isDelete = action.type === 'delete'
  const isSuspend = action.type === 'suspend'
  const title = isDelete ? 'Delete user' : isSuspend ? 'Suspend user' : 'Unsuspend user'
  const message = isDelete
    ? `This will permanently delete ${action.tenant.full_name} and all their data. This cannot be undone.`
    : isSuspend
    ? `${action.tenant.full_name} will be suspended and unable to log in.`
    : `${action.tenant.full_name} will be restored and able to log in again.`
  const btnClass = isDelete
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : isSuspend
    ? 'bg-amber-500 hover:bg-amber-600 text-white'
    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
  const btnLabel = isDelete ? 'Delete' : isSuspend ? 'Suspend' : 'Unsuspend'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${isDelete ? 'bg-red-100' : isSuspend ? 'bg-amber-100' : 'bg-emerald-100'}`}>
          {isDelete
            ? <Trash2 className="w-5 h-5 text-red-600" />
            : isSuspend
            ? <ShieldOff className="w-5 h-5 text-amber-600" />
            : <ShieldCheck className="w-5 h-5 text-emerald-600" />
          }
        </div>
        <h3 className="text-base font-extrabold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${btnClass}`}
          >
            {loading ? 'Please wait…' : btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [user, setUser]                   = useState<{ email?: string } | null>(null)
  const [tenants, setTenants]             = useState<Tenant[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [confirm, setConfirm]             = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]                 = useState<string | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    supabase
      .from('tenants')
      .select('*, enquiries(count)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list: Tenant[] = (data ?? []).map((t: any) => ({
          id: t.id,
          user_id: t.user_id,
          full_name: t.full_name ?? 'Unknown Tenant',
          phone: t.phone ?? null,
          email: t.email ?? null,
          created_at: t.created_at,
          enquiry_count: t.enquiries?.[0]?.count ?? 0,
          status: t.status ?? 'active',
        }))
        setTenants(list)
        setLoading(false)
      })
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleConfirm() {
    if (!confirm) return
    setActionLoading(true)
    const supabase = createClient()
    const { tenant, type } = confirm

    if (type === 'delete') {
      const { error } = await supabase.from('tenants').delete().eq('id', tenant.id)
      if (!error) {
        setTenants(prev => prev.filter(t => t.id !== tenant.id))
        showToast(`${tenant.full_name} has been deleted.`)
      }
    } else {
      const newStatus = type === 'suspend' ? 'suspended' : 'active'
      const { error } = await supabase.from('tenants').update({ status: newStatus }).eq('id', tenant.id)
      if (!error) {
        setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: newStatus } : t))
        showToast(`${tenant.full_name} has been ${newStatus === 'suspended' ? 'suspended' : 'unsuspended'}.`)
      }
    }

    setActionLoading(false)
    setConfirm(null)
  }

  const rawName = user?.email ? user.email.split('@')[0] : 'Admin'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const filtered = tenants.filter(t => {
    const q = search.toLowerCase()
    return !q || t.full_name.toLowerCase().includes(q) || (t.phone ?? '').includes(q) || (t.email ?? '').toLowerCase().includes(q)
  })
  const totalEnquiries = tenants.reduce((s, t) => s + t.enquiry_count, 0)
  const suspendedCount = tenants.filter(t => t.status === 'suspended').length

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader title="Tenants" subtitle={`${tenants.length} registered tenants`} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Tenants',   value: tenants.length,  icon: Users,         color: 'text-blue-600',    bg: 'bg-blue-50'    },
                { label: 'Total Enquiries', value: totalEnquiries,  icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'This Month',      value: tenants.filter(t => new Date(t.created_at) > new Date(Date.now() - 30 * 86400000)).length, icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'Suspended',       value: suspendedCount,  icon: ShieldOff,     color: 'text-amber-600',   bg: 'bg-amber-50'   },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${s.color}`} strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-xl font-extrabold text-gray-900 leading-tight">{s.value}</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone…"
                className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : tenants.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <UserX className="w-8 h-8 text-blue-300" />
                </div>
                <p className="text-gray-800 font-bold text-base mb-1">No tenants yet</p>
                <p className="text-sm text-gray-400">Tenants who register on the platform will appear here.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <p className="text-gray-500 font-medium">No tenants match your search.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead className="bg-slate-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tenant</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Phone</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Enquiries</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Joined</th>
                        <th className="px-3 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(t => {
                        const grad = avatarGrad(t.full_name)
                        const initials = getInitials(t.full_name)
                        const isSuspended = t.status === 'suspended'
                        return (
                          <tr key={t.id} onClick={() => setSelectedTenant(t)} className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${isSuspended ? 'opacity-60' : ''}`}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
                                  <span className="text-xs font-bold text-white">{initials}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm leading-tight">{t.full_name}</p>
                                  {t.email && <p className="text-[11px] text-gray-400 mt-0.5">{t.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              {t.phone ? (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  <span className="text-sm text-gray-600">{t.phone}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300 italic">No phone</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                t.enquiry_count > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
                              }`}>
                                <MessageSquare className="w-3 h-3" />
                                {t.enquiry_count} {t.enquiry_count === 1 ? 'enquiry' : 'enquiries'}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden sm:table-cell">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isSuspended ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                {isSuspended ? 'Suspended' : 'Active'}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden sm:table-cell">
                              <span className="text-xs text-gray-400">{timeAgo(t.created_at)}</span>
                            </td>
                            <td className="px-3 py-4" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                <ActionMenu tenant={t} onAction={setConfirm} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedTenant && (
        <TenantDrawer tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
      )}

      {confirm && (
        <ConfirmModal
          action={confirm}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
    </AuthGuard>
  )
}

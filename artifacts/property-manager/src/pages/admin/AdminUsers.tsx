import { useState, useEffect, useRef } from 'react'
import {
  Search, Users, MessageSquare, Clock, UserX,
  ShieldOff, Trash2, ShieldCheck, X, Home, Calendar,
  TrendingUp, UserCheck,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient, isSupabaseConfigured } from '../../lib/supabase'

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
  id: string; user_id: string; full_name: string
  phone?: string | null; email?: string | null
  avatar_url?: string | null; provider?: string | null
  created_at: string; enquiry_count: number
  status: 'active' | 'suspended'
}
type ConfirmAction = { type: 'suspend' | 'unsuspend' | 'delete'; tenant: Tenant }
type TenantEnquiry = {
  id: string; message: string; status: 'open' | 'replied' | 'closed'
  created_at: string; property_title: string | null; property_city: string | null
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
            id: e.id, message: e.message, status: e.status,
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
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 shrink-0">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-gray-900 text-base truncate">{tenant.full_name}</p>
              {tenant.provider === 'google' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 text-[10px] font-bold border border-red-100 shrink-0">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{tenant.email ?? tenant.phone ?? 'No contact info'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

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
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {enquiries.map(enq => {
                const s = ENQ_STATUS[enq.status] ?? ENQ_STATUS.open
                return (
                  <div key={enq.id} className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
                    {enq.property_title && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Home className="w-3 h-3 text-gray-400 shrink-0" />
                        <p className="text-xs font-semibold text-gray-700 truncate">{enq.property_title}</p>
                        {enq.property_city && <span className="text-xs text-gray-400 shrink-0">· {enq.property_city}</span>}
                      </div>
                    )}
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{enq.message}</p>
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

function ConfirmModal({ action, onConfirm, onCancel, loading }: {
  action: ConfirmAction; onConfirm: () => void; onCancel: () => void; loading: boolean
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
    : isSuspend ? 'bg-amber-500 hover:bg-amber-600 text-white'
    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
  const btnLabel = isDelete ? 'Delete permanently' : isSuspend ? 'Suspend' : 'Unsuspend'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
          isDelete ? 'bg-red-50' : isSuspend ? 'bg-amber-50' : 'bg-emerald-50'
        }`}>
          {isDelete ? <Trash2 className="w-5 h-5 text-red-600" />
            : isSuspend ? <ShieldOff className="w-5 h-5 text-amber-600" />
            : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
        </div>
        <h3 className="text-base font-extrabold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50 ${btnClass}`}>
            {loading ? 'Please wait…' : btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [user, setUser]                     = useState<{ email?: string } | null>(null)
  const [tenants, setTenants]               = useState<Tenant[]>([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [statusFilter, setStatusFilter]     = useState<'all' | 'active' | 'suspended'>('all')
  const [confirm, setConfirm]               = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading]   = useState(false)
  const [toast, setToast]                   = useState<string | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    ;(async () => {
      const [{ data: tenantData, error: tenantError }, { data: landlordData }] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('landlords').select('user_id'),
      ])
      if (tenantError) { setLoading(false); return }
      const landlordUserIds = new Set((landlordData ?? []).map((l: any) => l.user_id))
      const tenantsOnly = (tenantData ?? []).filter((t: any) => !landlordUserIds.has(t.user_id))
      const tenantIds = tenantsOnly.map(t => t.id)
      let enquiryCounts: Record<string, number> = {}
      if (tenantIds.length > 0) {
        const { data: enquiries } = await supabase.from('enquiries').select('tenant_id').in('tenant_id', tenantIds)
        enquiryCounts = (enquiries ?? []).reduce((acc: Record<string, number>, e: any) => {
          acc[e.tenant_id] = (acc[e.tenant_id] || 0) + 1; return acc
        }, {})
      }
      setTenants(tenantsOnly.map((t: any) => ({
        id: t.id, user_id: t.user_id,
        full_name: t.full_name ?? 'Unknown Tenant',
        phone: t.phone ?? null, email: t.email ?? null,
        avatar_url: t.avatar_url ?? null, provider: t.provider ?? 'email',
        created_at: t.created_at,
        enquiry_count: enquiryCounts[t.id] || 0,
        status: t.status ?? 'active',
      })))
      setLoading(false)
    })()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleConfirm() {
    if (!confirm) return
    setActionLoading(true)
    const supabase = createClient()
    const { tenant, type } = confirm

    if (type === 'delete') {
      if (!tenant.user_id) {
        showToast('Unable to delete: missing user ID.')
      } else {
        const deleteEnquiries = await supabase.from('enquiries').delete().eq('tenant_id', tenant.id)
        if (deleteEnquiries.error) {
          showToast(`Failed to delete enquiries: ${deleteEnquiries.error.message}`)
          setActionLoading(false)
          return
        }

        const deleteSaved = await supabase.from('saved_properties').delete().eq('tenant_id', tenant.id)
        if (deleteSaved.error) {
          showToast(`Failed to delete saved properties: ${deleteSaved.error.message}`)
          setActionLoading(false)
          return
        }

        const deleteTenant = await supabase.from('tenants').delete().eq('id', tenant.id)
        if (deleteTenant.error) {
          showToast(`Failed to delete tenant: ${deleteTenant.error.message}`)
        } else {
          setTenants(prev => prev.filter(t => t.id !== tenant.id))
          showToast(`${tenant.full_name} has been deleted.`)
        }
      }
    } else {
      const newStatus = type === 'suspend' ? 'suspended' : 'active'
      const { error } = await supabase.from('tenants').update({ status: newStatus }).eq('id', tenant.id)
      if (error) {
        showToast(`Failed to update: ${error.message}`)
      } else {
        setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: newStatus } : t))
        showToast(`${tenant.full_name} ${newStatus === 'suspended' ? 'suspended' : 'reinstated'}.`)
      }
    }
    setActionLoading(false)
    setConfirm(null)
  }

  const rawName = user?.email ? user.email.split('@')[0] : 'Admin'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const query = search.toLowerCase()
  const filtered = tenants.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    return !query || t.full_name.toLowerCase().includes(query) ||
      (t.phone ?? '').toLowerCase().includes(query) ||
      (t.email ?? '').toLowerCase().includes(query)
  })
  const totalEnquiries  = tenants.reduce((s, t) => s + t.enquiry_count, 0)
  const suspendedCount  = tenants.filter(t => t.status === 'suspended').length
  const activeCount     = tenants.filter(t => t.status === 'active').length
  const monthlyCount    = tenants.filter(t => new Date(t.created_at) > new Date(Date.now() - 30 * 86400000)).length

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader title="Users" subtitle={`${tenants.length} registered tenants`} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Users',       value: tenants.length,  icon: Users,       color: 'text-slate-900',   bg: 'bg-slate-100' },
                { label: 'Active',            value: activeCount,     icon: UserCheck,   color: 'text-emerald-700', bg: 'bg-emerald-100' },
                { label: 'Suspended',         value: suspendedCount,  icon: UserX,       color: 'text-amber-700',   bg: 'bg-amber-100' },
                { label: 'Joined This Month', value: monthlyCount,    icon: TrendingUp,  color: 'text-blue-700',    bg: 'bg-blue-100' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">{s.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Filter + Search */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-3 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { key: 'all',       label: 'All',       count: tenants.length },
                  { key: 'active',    label: 'Active',    count: activeCount },
                  { key: 'suspended', label: 'Suspended', count: suspendedCount },
                ] as const).map(tab => (
                  <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.key)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      statusFilter === tab.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                    }`}>
                    {tab.label}
                    <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>{tab.count}</span>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-within:border-slate-400 focus-within:bg-white transition-all shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="w-52 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </label>
            </div>

            {/* Count row */}
            <div className="flex items-center justify-between px-1 mb-3">
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-900">{filtered.length}</span> {filtered.length === 1 ? 'user' : 'users'}
                {statusFilter !== 'all' && <span className="ml-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{statusFilter}</span>}
              </p>
              {totalEnquiries > 0 && (
                <p className="text-xs text-slate-400 hidden sm:block">
                  <span className="font-semibold text-slate-600">{totalEnquiries}</span> total enquiries
                </p>
              )}
            </div>

            {/* List */}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-[3px] border-slate-200 border-t-slate-900 rounded-full" />
              </div>
            ) : tenants.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
                  <UserX className="w-7 h-7 text-slate-300" />
                </div>
                <p className="font-bold text-slate-700 mb-1">No users yet</p>
                <p className="text-sm text-slate-400">Tenants who register will appear here.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                <p className="font-semibold text-slate-600">No users match your search.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(t => {
                  const grad = avatarGrad(t.full_name)
                  const initials = getInitials(t.full_name)
                  const isSuspended = t.status === 'suspended'
                  return (
                    <article
                      key={t.id}
                      onClick={() => setSelectedTenant(t)}
                      className={`group relative bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 transition-all duration-200
                        hover:border-slate-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] cursor-pointer ${isSuspended ? 'opacity-75' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white ring-0`}>
                          <span className="text-[13px] font-semibold">{initials}</span>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${isSuspended ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-semibold text-slate-900 leading-tight">{t.full_name}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                              isSuspended ? 'bg-amber-50 text-amber-700 ring-amber-200/60' : 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
                            }`}>
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />{t.enquiry_count} {t.enquiry_count === 1 ? 'enquiry' : 'enquiries'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />Joined {timeAgo(t.created_at)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-500 truncate max-w-sm">{t.email ?? t.phone ?? 'No contact details'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-slate-50 pt-3 mt-3"
                        onClick={e => e.stopPropagation()}>
                        {isSuspended ? (
                          <button type="button" onClick={() => setConfirm({ type: 'unsuspend', tenant: t })}
                            className="h-8 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                            Reinstate
                          </button>
                        ) : (
                          <button type="button" onClick={() => setConfirm({ type: 'suspend', tenant: t })}
                            className="h-8 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                            Suspend
                          </button>
                        )}
                        <div className="flex-1" />
                        <button type="button" onClick={() => setConfirm({ type: 'delete', tenant: t })}
                          className="h-8 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedTenant && <TenantDrawer tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />}
      {confirm && <ConfirmModal action={confirm} onConfirm={handleConfirm} onCancel={() => setConfirm(null)} loading={actionLoading} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl animate-fade-in whitespace-nowrap">
          {toast}
        </div>
      )}
    </AuthGuard>
  )
}

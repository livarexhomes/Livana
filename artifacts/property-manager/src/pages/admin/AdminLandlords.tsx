import { useState, useEffect, useRef } from 'react'
import {
  Users, Search, MapPin, Phone,
  CheckCircle, Clock, XCircle, Ban, ShieldCheck,
  ArrowUpRight, UserCheck, ChevronDown,
  Trash2, ShieldOff, MoreVertical, Building2,
  X, RefreshCw, RotateCcw,
} from 'lucide-react'
import { Link } from '@/lib/navigation'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient, isSupabaseConfigured } from '../../lib/supabase'
import { ResponsiveFilters } from '@/components/ui/responsive-filters'
import { StatusBadge } from '@/components/ui/status-badge'
import { SmartSelect } from '@/components/ui/smart-select'
import { MobileSidebarProvider, MobileSearch, MobileFilterBar } from '@/components/ui/mobile-admin'

// ── Status metadata ────────────────────────────────────────────────────────────

const STATUS_META: Record<string, {
  label: string
  pill: string
  dot: string
  border: string
}> = {
  approved: { label: 'Approved', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80', dot: 'bg-emerald-400', border: 'border-l-emerald-400' },
  pending: { label: 'KYC Pending', pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80', dot: 'bg-amber-400', border: 'border-l-amber-400' },
  rejected: { label: 'Rejected', pill: 'bg-red-50 text-red-600 ring-1 ring-red-200/80', dot: 'bg-red-400', border: 'border-l-red-400' },
  suspended: { label: 'Suspended', pill: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/80', dot: 'bg-orange-400', border: 'border-l-orange-400' },
  not_submitted: { label: 'Not Submitted', pill: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/60', dot: 'bg-slate-300', border: 'border-l-slate-200' },
}

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-slate-100', text: 'text-slate-700' },
]
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Types ─────────────────────────────────────────────────────────────────────

type DeleteConfirm = { userId: string; landlordId: string; name: string }
type ResetConfirm = { userId: string; landlordId: string; name: string }

// ── Reset confirmation modal ──────────────────────────────────────────────────

function ConfirmResetModal({ target, onConfirm, onCancel, loading }: {
  target: ResetConfirm; onConfirm: (reason: string) => void; onCancel: () => void; loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200">
        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
          <RotateCcw className="w-5 h-5 text-amber-600" />
        </div>
        <h3 className="text-[15px] font-extrabold text-slate-900 mb-1">Reset KYC account</h3>
        <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
          This will clear <strong className="text-slate-700">{target.name}</strong>'s KYC documents and set their status back to <em>Not Submitted</em>. They will receive an email asking them to resubmit.
        </p>
        <div className="mb-4">
          <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
            Reason for reset <span className="font-normal text-slate-400">(sent to landlord — optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            disabled={loading}
            placeholder="e.g. Your passport photo was too blurry. Please resubmit a clear, well-lit image."
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-300 focus:bg-white transition-colors resize-none disabled:opacity-50"
          />
        </div>
        <div className="flex gap-2.5">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(reason)} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Resetting…' : 'Reset account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function ConfirmDeleteModal({ target, onConfirm, onCancel, loading }: {
  target: DeleteConfirm; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200">
        <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-[15px] font-extrabold text-slate-900 mb-1">Delete landlord</h3>
        <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">
          This will permanently delete <strong className="text-slate-700">{target.name}</strong> and all their listings. This cannot be undone.
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Per-row action menu ───────────────────────────────────────────────────────

function ActionMenu({ l, processing, onStatus, onDelete, onReset, onClose }: {
  l: any
  processing: string | null
  onStatus: (id: string, status: string) => Promise<void>
  onDelete: (userId: string, landlordId: string) => void
  onReset: (userId: string, landlordId: string, name: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const busy = processing === l.id

  function handleStatus(status: string) {
    onStatus(l.id, status).then(() => onClose())
  }

  return (
    <div ref={ref}
      className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl border border-slate-200 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.12)] overflow-hidden py-1"
      onMouseDown={(e) => e.stopPropagation()}>
      {l.status === 'pending' && (
        <Link href="/admin/kyc">
          <button type="button"
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Review KYC
          </button>
        </Link>
      )}
      {(l.status === 'pending' || l.status === 'not_submitted') && (
        <button type="button" disabled={busy} onClick={() => handleStatus('approved')}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-medium text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40">
          <CheckCircle className="w-3.5 h-3.5" />
          Approve
        </button>
      )}
      {l.status === 'suspended' && (
        <button type="button" disabled={busy} onClick={() => handleStatus('approved')}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-medium text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40">
          <CheckCircle className="w-3.5 h-3.5" />
          Reinstate
        </button>
      )}
      {(l.status === 'approved' || l.status === 'pending') && (
        <button type="button" disabled={busy} onClick={() => handleStatus('suspended')}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-medium text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-40">
          <ShieldOff className="w-3.5 h-3.5" />
          Suspend
        </button>
      )}
      {l.status === 'rejected' && (
        <button type="button" disabled={busy} onClick={() => onReset(l.user_id, l.id, l.full_name)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-medium text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-40">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset KYC
        </button>
      )}
      <div className="h-px bg-slate-100 mx-2 my-1" />
      <button type="button" disabled={busy} onClick={() => onDelete(l.user_id, l.id)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
        <Trash2 className="w-3.5 h-3.5" />
        Delete landlord
      </button>
    </div>
  )
}

// ── Landlord row ──────────────────────────────────────────────────────────────

function LandlordRow({ l, processing, menuOpen, onMenuToggle, onStatus, onDelete, onReset }: {
  l: any
  processing: string | null
  menuOpen: boolean
  onMenuToggle: () => void
  onStatus: (id: string, status: string) => Promise<void>
  onDelete: (userId: string, landlordId: string) => void
  onReset: (userId: string, landlordId: string, name: string) => void
}) {
  const meta = STATUS_META[l.status] ?? STATUS_META.not_submitted
  const palette = avatarColor(l.full_name)
  const busy = processing === l.id

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 border-b border-slate-100 border-l-[3px] ${meta.border} hover:bg-slate-50/70 transition-colors`}>

      {/* Avatar */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${palette.bg} ${palette.text}`}>
        {getInitials(l.full_name)}
      </div>

      {/* Name */}
      <div className="min-w-0 w-40 shrink-0">
        <p className="truncate text-[13px] font-semibold text-slate-900">{l.full_name}</p>
        <p className="text-[11px] text-slate-400 tabular-nums">Joined {formatDate(l.created_at)}</p>
      </div>

      {/* Location */}
      <div className="hidden md:flex min-w-0 w-28 shrink-0 items-center gap-1 text-[12px] text-slate-500">
        <MapPin className="h-3 w-3 shrink-0 text-slate-300" />
        <span className="truncate">{l.city ?? '—'}</span>
      </div>

      {/* Contact */}
      <div className="hidden lg:flex min-w-0 w-36 shrink-0 items-center gap-1 text-[12px] text-slate-500">
        <Phone className="h-3 w-3 shrink-0 text-slate-300" />
        <span className="truncate">{l.whatsapp ?? '—'}</span>
      </div>

      {/* Properties */}
      <div className="hidden sm:flex shrink-0 w-24 items-center gap-1 text-[12px] text-slate-500">
        <Building2 className="h-3 w-3 shrink-0 text-slate-300" />
        <span className="tabular-nums">{l.property_count}</span>
        <span>{l.property_count === 1 ? 'listing' : 'listings'}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status badge */}
      <StatusBadge status={l.status} label={meta.label} className="sm:ml-auto" />

      {/* ⋮ action menu */}
      <div className="relative shrink-0 sm:ml-2">
        <button type="button" disabled={busy} onClick={onMenuToggle}
          className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${menuOpen
              ? 'border-slate-300 bg-slate-100 text-slate-700'
              : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700'
            } disabled:opacity-30`}>
          {busy
            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            : <MoreVertical className="h-3.5 w-3.5" />}
        </button>
        {menuOpen && (
          <ActionMenu l={l} processing={processing} onStatus={onStatus} onDelete={onDelete} onReset={onReset} onClose={onMenuToggle} />
        )}
      </div>
    </div>
  )
}

// ── Mobile card ────────────────────────────────────────────────────────────────

function LandlordMobileCard({ l, processing, menuOpen, onMenuToggle, onStatus, onDelete, onReset }: {
  l: any
  processing: string | null
  menuOpen: boolean
  onMenuToggle: () => void
  onStatus: (id: string, status: string) => Promise<void>
  onDelete: (userId: string, landlordId: string) => void
  onReset: (userId: string, landlordId: string, name: string) => void
}) {
  const meta = STATUS_META[l.status] ?? STATUS_META.not_submitted
  const palette = avatarColor(l.full_name)
  const busy = processing === l.id

  return (
    <div className="rounded-[11px] border border-slate-200 bg-white p-3 mb-2 last:mb-0">
      <div className="flex items-start gap-2.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${palette.bg} ${palette.text}`}>
          {getInitials(l.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-slate-900 truncate">{l.full_name}</p>
            <StatusBadge status={l.status} label={meta.label} size="sm" />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Joined {formatDate(l.created_at)}</p>
          {l.city && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="h-3 w-3 shrink-0 text-slate-300" />
              <span className="truncate">{l.city}</span>
            </div>
          )}
          {l.whatsapp && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
              <Phone className="h-3 w-3 shrink-0 text-slate-300" />
              <span className="truncate">{l.whatsapp}</span>
            </div>
          )}
          {l.property_count > 0 && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
              <Building2 className="h-3 w-3 shrink-0 text-slate-300" />
              <span>{l.property_count} listing{l.property_count !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
      {/* Primary action + overflow */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/admin/kyc" className="flex-1">
          <button type="button"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-colors">
            View client
          </button>
        </Link>
        <div className="relative shrink-0">
          <button type="button" disabled={busy} onClick={onMenuToggle}
            className={`h-9 w-9 grid place-items-center rounded-lg border transition-colors ${menuOpen
                ? 'border-slate-300 bg-slate-100 text-slate-700'
                : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700'
              } disabled:opacity-30`}>
            {busy
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <MoreVertical className="h-3.5 w-3.5" />}
          </button>
          {menuOpen && (
            <ActionMenu l={l} processing={processing} onStatus={onStatus} onDelete={onDelete} onReset={onReset} onClose={onMenuToggle} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminLandlords() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteConfirm | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [resetTarget, setResetTarget] = useState<ResetConfirm | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email })
      if (user?.id) window.__livarexUserId = user.id
    })
    supabase
      .from('landlords').select('*').order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) { setLoading(false); return }
        const landlordIds = (data ?? []).map(l => l.id)
        let propertyCounts: Record<string, number> = {}
        if (landlordIds.length > 0) {
          const { data: props } = await supabase.from('properties').select('landlord_id').in('landlord_id', landlordIds)
          propertyCounts = (props ?? []).reduce((acc: Record<string, number>, p: any) => {
            acc[p.landlord_id] = (acc[p.landlord_id] || 0) + 1; return acc
          }, {})
        }
        const list = (data ?? []).map((l: any) => ({ ...l, property_count: propertyCounts[l.id] || 0 }))
        setClients(list); setFiltered(list); setLoading(false)
      })
  }, [])

  useEffect(() => {
    let list = [...clients]
    if (statusFilter !== 'all') list = list.filter(l => l.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        l.full_name?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.whatsapp?.includes(q)
      )
    }
    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sort === 'name') list.sort((a, b) => a.full_name.localeCompare(b.full_name))
    setFiltered(list)
  }, [search, sort, statusFilter, clients])

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 3500)
  }

  async function updateStatus(id: string, status: string) {
    console.log('[updateStatus] Starting - id:', id, 'status:', status)
    setProcessing(id)
    const supabase = createClient()
    const patch: any = { status }
    if (status === 'approved') patch.is_verified = true

    try {
      console.log('[updateStatus] Sending update to Supabase...')
      const { data, error } = await supabase
        .from('landlords')
        .update(patch)
        .eq('id', id)

      console.log('[updateStatus] Response - data:', data, 'error:', error)

      if (error) {
        console.error('[updateStatus] Supabase error:', JSON.stringify(error))
        showToast(`Failed: ${error.message}`)
      } else {
        console.log('[updateStatus] Update successful, updating state...')
        setClients(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)))
        showToast(`Status updated to ${status}`)
      }
    } catch (err) {
      console.error('[updateStatus] Unexpected error:', err)
      showToast('An unexpected error occurred')
    }
    setProcessing(null)
    console.log('[updateStatus] Done')
  }

  function handleDelete(userId: string, landlordId: string) {
    const landlord = clients.find(c => c.id === landlordId)
    setDeleteTarget({ userId, landlordId, name: landlord?.full_name ?? 'this landlord' })
  }

  function handleReset(userId: string, landlordId: string, name: string) {
    setResetTarget({ userId, landlordId, name })
  }

  async function confirmReset(reason: string) {
    if (!resetTarget) return
    setResetLoading(true)
    const supabase = createClient()

    // 1. Reset landlord status and clear KYC submission timestamp
    const { error: statusErr } = await supabase
      .from('landlords')
      .update({ status: 'not_submitted', is_verified: false, kyc_submitted_at: null })
      .eq('id', resetTarget.landlordId)
    if (statusErr) {
      showToast(`Failed to reset: ${statusErr.message}`)
      setResetLoading(false)
      return
    }

    // 2. Delete uploaded KYC documents so they start fresh
    await supabase.from('kyc_documents').delete().eq('landlord_id', resetTarget.landlordId)

    // 3. Notify the landlord by email (best-effort — non-fatal if email fails)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    await fetch('/api/notify-kyc-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: resetTarget.userId, landlordName: resetTarget.name, reason: reason.trim() || undefined }),
    }).catch(() => null)

    // 4. Update local state
    setClients(cs => cs.map(c =>
      c.id === resetTarget.landlordId
        ? { ...c, status: 'not_submitted', is_verified: false, kyc_submitted_at: null }
        : c
    ))
    showToast(`${resetTarget.name}'s account has been reset. They have been notified to refill their information.`)
    setResetLoading(false)
    setResetTarget(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const supabase = createClient()
    // Delete from auth.users via the server-side endpoint (uses service-role key).
    // ON DELETE CASCADE propagates to landlords, properties, landlord_settings, etc.
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    const resp = await fetch('/api/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: deleteTarget.userId }),
    })
    const result = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      showToast(`Failed to delete: ${result.error ?? (await resp.text())}`)
    } else {
      setClients(cs => cs.filter(c => c.id !== deleteTarget.landlordId))
      showToast(`${deleteTarget.name} permanently deleted.`)
    }
    setDeleteLoading(false); setDeleteTarget(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const pending = clients.filter(c => c.status === 'pending').length
  const approved = clients.filter(c => c.status === 'approved').length
  const suspended = clients.filter(c => c.status === 'suspended').length
  const notSub = clients.filter(c => c.status === 'not_submitted').length
  const topPending = clients.filter(c => c.status === 'pending').slice(0, 5)

  const STATUS_TABS = [
    { key: 'all', label: 'All', count: clients.length },
    { key: 'approved', label: 'Approved', count: approved },
    { key: 'pending', label: 'KYC Pending', count: pending },
    { key: 'suspended', label: 'Suspended', count: suspended },
    { key: 'not_submitted', label: 'Not Submitted', count: notSub },
  ]

  return (
    <AuthGuard require="admin">
      <MobileSidebarProvider>
        <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
          <AdminSidebar userEmail={user?.email} userName={displayName} />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            <AdminHeader title="Landlords"
              subtitle={`${clients.length} landlords · ${approved} approved`}
              pendingCount={approved} />

            {/* ── Mobile: search + filters ── */}
            <div className="sm:hidden -mx-4">
              <MobileSearch
                placeholder="Search name, city, phone…"
                value={search}
                onChange={setSearch}
              />
              <MobileFilterBar>
                <ResponsiveFilters
                  tabs={STATUS_TABS.map(t => ({ key: t.key, label: t.label, count: t.count }))}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  label="Status"
                />
                <div className="relative flex-1 min-w-[120px]">
                  <select value={sort} onChange={e => setSort(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-2.5 pr-7 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer min-h-[44px]">
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="name">Name A–Z</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                </div>
              </MobileFilterBar>
            </div>

            {/* ── Hero card (desktop only) ── */}
            <div className="hidden sm:block shrink-0 px-4 md:px-6 pt-3 pb-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Property owners</p>
                    <h2 className="mt-0.5 text-xl md:text-2xl font-extrabold text-slate-950">Landlords</h2>
                  </div>
                </div>

                {/* Filter + search row */}
                <div className="mt-2.5 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
                  <div className="w-full sm:w-auto">
                    <ResponsiveFilters
                      tabs={STATUS_TABS.map(t => ({ key: t.key, label: t.label, count: t.count }))}
                      value={statusFilter}
                      onChange={setStatusFilter}
                      label="Status"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <label className="flex h-9 md:h-8 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-300 focus-within:bg-white transition-all flex-1 md:flex-none md:w-36">
                      <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Name, city, phone…"
                        className="flex-1 md:flex-none md:w-36 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none" />
                      {search && (
                        <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </label>
                    <div className="relative shrink-0">
                      <select value={sort} onChange={e => setSort(e.target.value)}
                        className="h-9 md:h-8 appearance-none rounded-2xl border border-slate-200 bg-white pl-2.5 pr-7 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer hover:border-slate-300 transition-colors">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="name">Name A–Z</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Content ─────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

              {/* Left — client list */}
              <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

                {/* Column headers — desktop only */}
                {!loading && clients.length > 0 && (
                  <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100 shrink-0">
                    <div className="w-9 shrink-0" /> {/* avatar spacer */}
                    <div className="w-40 shrink-0 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Client</div>
                    <div className="hidden md:block w-28 shrink-0 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Location</div>
                    <div className="hidden lg:block w-36 shrink-0 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Contact</div>
                    <div className="hidden sm:block w-24 shrink-0 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Listings</div>
                    <div className="flex-1" />
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 pr-8">Status</div>
                  </div>
                )}

                {/* Rows — desktop table / mobile cards */}
                <div className="flex-1 overflow-y-auto bg-white">
                  {loading ? (
                    <div className="flex h-48 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-center px-6">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200">
                        <Users className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="text-[14px] font-semibold text-slate-700">No landlords yet</p>
                      <p className="mt-1 text-[12.5px] text-slate-400">They'll appear here once they register.</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center text-center px-6">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200">
                        <Search className="h-5 w-5 text-slate-300" />
                      </div>
                      <p className="text-[13px] font-semibold text-slate-600">No results</p>
                      <p className="mt-1 text-[12px] text-slate-400">Try adjusting the filter or search term.</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile: cards */}
                      <div className="sm:hidden">
                        {filtered.map(l => (
                          <LandlordMobileCard
                            key={l.id}
                            l={l}
                            processing={processing}
                            menuOpen={menuOpen === l.id}
                            onMenuToggle={() => setMenuOpen(menuOpen === l.id ? null : l.id)}
                            onStatus={updateStatus}
                            onDelete={handleDelete}
                            onReset={handleReset}
                          />
                        ))}
                      </div>
                      {/* Desktop: table rows */}
                      <div className="hidden sm:block">
                        {filtered.map(l => (
                          <LandlordRow
                            key={l.id}
                            l={l}
                            processing={processing}
                            menuOpen={menuOpen === l.id}
                            onMenuToggle={() => setMenuOpen(menuOpen === l.id ? null : l.id)}
                            onStatus={updateStatus}
                            onDelete={handleDelete}
                            onReset={handleReset}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right sidebar */}
              <aside className="hidden xl:flex flex-col w-72 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">

                {/* Pending queue */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">KYC Queue</p>
                    {pending > 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                        {pending} waiting
                      </span>
                    )}
                  </div>
                  {topPending.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <UserCheck className="mb-2 h-8 w-8 text-emerald-200" />
                      <p className="text-[12.5px] font-medium text-slate-500">Queue is clear</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">No pending KYC reviews</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {topPending.map(item => {
                        const pal = avatarColor(item.full_name)
                        return (
                          <div key={item.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 hover:bg-slate-100/70 transition-colors">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${pal.bg} ${pal.text}`}>
                              {getInitials(item.full_name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12.5px] font-semibold text-slate-800">{item.full_name}</p>
                              <p className="truncate text-[11px] text-slate-400">{item.city ?? 'No city listed'}</p>
                            </div>
                            <Link href="/admin/kyc" className="shrink-0">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200 hover:text-slate-700 hover:ring-slate-300 transition-colors">
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </span>
                            </Link>
                          </div>
                        )
                      })}
                      {pending > 5 && (
                        <Link href="/admin/kyc">
                          <button type="button" className="mt-1 w-full rounded-xl border border-amber-200 bg-amber-50 py-2 text-[12px] font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                            View all {pending} pending →
                          </button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Distribution breakdown */}
                <div className="p-4 border-b border-slate-100">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Breakdown</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Approved', value: approved, color: 'bg-emerald-400', text: 'text-emerald-700' },
                      { label: 'KYC Pending', value: pending, color: 'bg-amber-400', text: 'text-amber-700' },
                      { label: 'Suspended', value: suspended, color: 'bg-orange-400', text: 'text-orange-700' },
                      { label: 'Not submitted', value: notSub, color: 'bg-slate-300', text: 'text-slate-500' },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] text-slate-600">{row.label}</span>
                          <span className={`text-[12px] font-semibold tabular-nums ${row.text}`}>{row.value}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${row.color} transition-all duration-700`}
                            style={{ width: clients.length ? `${(row.value / clients.length) * 100}%` : '0%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick link */}
                <div className="p-4">
                  <Link href="/admin/kyc">
                    <button type="button"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                      <ShieldCheck className="h-4 w-4" />
                      Open KYC Review
                      {pending > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-900">
                          {pending}
                        </span>
                      )}
                    </button>
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </div>

        {deleteTarget && (
          <ConfirmDeleteModal
            target={deleteTarget}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}

        {resetTarget && (
          <ConfirmResetModal
            target={resetTarget}
            onConfirm={confirmReset}
            onCancel={() => setResetTarget(null)}
            loading={resetLoading}
          />
        )}

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-medium px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            {toast}
          </div>
        )}
      </MobileSidebarProvider>
    </AuthGuard>
  )
}

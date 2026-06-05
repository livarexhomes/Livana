import { useState, useEffect } from 'react'
import {
  Users, Search, MapPin, Phone,
  CheckCircle, Clock, XCircle, Ban, ShieldCheck,
  ChevronRight, ArrowUpDown, Filter,
} from 'lucide-react'
import { Link } from 'wouter'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; dot: string; ring: string; text: string; bg: string }> = {
  approved:      { label: 'Approved',      dot: '#22d3a5', ring: 'rgba(34,211,165,0.18)',  text: '#22d3a5', bg: 'rgba(34,211,165,0.08)'  },
  pending:       { label: 'KYC Pending',   dot: '#f59e0b', ring: 'rgba(245,158,11,0.18)',  text: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
  rejected:      { label: 'Rejected',      dot: '#f87171', ring: 'rgba(248,113,113,0.18)', text: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  suspended:     { label: 'Suspended',     dot: '#fb923c', ring: 'rgba(251,146,60,0.18)',  text: '#fb923c', bg: 'rgba(251,146,60,0.08)'  },
  not_submitted: { label: 'Not Submitted', dot: '#6b7280', ring: 'rgba(107,114,128,0.18)', text: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
}

// ─── Avatar colour palette ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#3b2fc9', text: '#c4bfff' },
  { bg: '#0f5a8c', text: '#7dd3fc' },
  { bg: '#0d6e56', text: '#6ee7c7' },
  { bg: '#7c2d85', text: '#e879f9' },
  { bg: '#9a3412', text: '#fdba74' },
  { bg: '#065f46', text: '#6ee7b7' },
  { bg: '#1e3a5f', text: '#93c5fd' },
]

function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
    }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: accent ?? '#f1f5f9', fontFamily: '"DM Mono", "Fira Mono", monospace', letterSpacing: '-0.5px' }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748b' }}>{label}</span>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.not_submitted
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      background: m.bg, border: `1px solid ${m.ring}`,
      fontSize: 11, fontWeight: 600, color: m.text,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

// ─── Action button ────────────────────────────────────────────────────────────
function ActionBtn({ children, variant = 'ghost', disabled, onClick }: {
  children: React.ReactNode
  variant?: 'ghost' | 'danger' | 'success' | 'warn' | 'indigo'
  disabled?: boolean
  onClick?: () => void
}) {
  const variants = {
    ghost:  { bg: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'rgba(255,255,255,0.08)' },
    danger: { bg: 'rgba(248,113,113,0.09)', color: '#f87171', border: 'rgba(248,113,113,0.2)' },
    success:{ bg: 'rgba(34,211,165,0.09)',  color: '#22d3a5', border: 'rgba(34,211,165,0.2)'  },
    warn:   { bg: 'rgba(251,146,60,0.09)',  color: '#fb923c', border: 'rgba(251,146,60,0.2)'  },
    indigo: { bg: 'rgba(129,140,248,0.09)', color: '#818cf8', border: 'rgba(129,140,248,0.2)' },
  }
  const v = variants[variant]
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        background: v.bg, color: v.color, border: `1px solid ${v.border}`,
        transition: 'opacity 0.15s', letterSpacing: '0.02em',
      }}
    >{children}</button>
  )
}

// ─── Landlord row card ────────────────────────────────────────────────────────
function LandlordCard({ l, processing, onStatus, onDelete }: {
  l: any
  processing: string | null
  onStatus: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const av = avatarColor(l.full_name)
  const initials = getInitials(l.full_name)
  const busy = processing === l.id

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: '14px 16px',
      transition: 'border-color 0.15s, background 0.15s',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.13)'
        ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'
        ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: av.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: av.text, letterSpacing: '0.04em',
          fontFamily: '"DM Mono", "Fira Mono", monospace',
        }}>{initials}</div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.full_name}
            </span>
            <StatusBadge status={l.status} />
          </div>
          <div style={{ marginTop: 5, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
              <MapPin size={12} />
              {l.city ?? '—'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
              <Phone size={12} />
              {l.whatsapp ?? '—'}
            </span>
          </div>
        </div>

        {/* Right meta */}
        <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '-0.01em',
            fontFamily: '"DM Mono", "Fira Mono", monospace',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6, padding: '2px 8px',
          }}>
            {l.property_count} {l.property_count === 1 ? 'property' : 'properties'}
          </span>
          <span style={{ fontSize: 11, color: '#475569' }}>
            {new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 52 }}>
        {l.status === 'pending' && (
          <>
            <Link href="/admin/kyc">
              <ActionBtn variant="indigo">Review KYC</ActionBtn>
            </Link>
            <ActionBtn variant="success" disabled={busy} onClick={() => onStatus(l.id, 'approved')}>Approve</ActionBtn>
            <ActionBtn variant="warn" disabled={busy} onClick={() => onStatus(l.id, 'suspended')}>Suspend</ActionBtn>
          </>
        )}
        {l.status === 'approved' && (
          <ActionBtn variant="warn" disabled={busy} onClick={() => onStatus(l.id, 'suspended')}>Suspend</ActionBtn>
        )}
        {l.status === 'suspended' && (
          <ActionBtn variant="success" disabled={busy} onClick={() => onStatus(l.id, 'approved')}>Reinstate</ActionBtn>
        )}
        <ActionBtn variant="danger" disabled={busy} onClick={() => onDelete(l.id)}>Delete</ActionBtn>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminLandlords() {
  const [user, setUser]         = useState<{ email?: string } | null>(null)
  const [clients, setClients]   = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [processing, setProcessing] = useState<string | null>(null)

  // ── Data fetch (unchanged) ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    supabase
      .from('landlords')
      .select('*, properties(count)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []).map((l: any) => ({
          ...l,
          property_count: l.properties?.[0]?.count ?? 0,
        }))
        setClients(list)
        setFiltered(list)
        setLoading(false)
      })
  }, [])

  // ── Filter/sort (unchanged) ───────────────────────────────────────────────
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
    if (sort === 'name')   list.sort((a, b) => a.full_name.localeCompare(b.full_name))
    setFiltered(list)
  }, [search, sort, statusFilter, clients])

  // ── Mutations (unchanged) ─────────────────────────────────────────────────
  async function updateStatus(id: string, status: string) {
    setProcessing(id)
    const supabase = createClient()
    const patch: any = { status }
    if (status === 'approved') patch.is_verified = true
    await supabase.from('landlords').update(patch).eq('id', id)
    setClients(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c))
    setProcessing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this landlord record? This cannot be undone.')) return
    setProcessing(id)
    const supabase = createClient()
    await supabase.from('landlords').delete().eq('id', id)
    setClients(cs => cs.filter(c => c.id !== id))
    setProcessing(null)
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const pending  = clients.filter(c => c.status === 'pending').length
  const approved = clients.filter(c => c.status === 'approved').length

  const STATUS_TABS = [
    { key: 'all',           label: 'All',           count: clients.length },
    { key: 'approved',      label: 'Approved',      count: approved },
    { key: 'pending',       label: 'Pending',       count: pending },
    { key: 'suspended',     label: 'Suspended',     count: clients.filter(c => c.status === 'suspended').length },
    { key: 'not_submitted', label: 'Not Submitted', count: clients.filter(c => c.status === 'not_submitted').length },
  ]

  return (
    <AuthGuard require="admin">
      {/* Page shell */}
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0a0e1a' }}>
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <AdminHeader
            title="Clients"
            subtitle={`${clients.length.toLocaleString()} landlords${pending > 0 ? ` · ${pending} pending KYC` : ''}`}
            pendingCount={pending}
            action={
              <Link href="/admin/kyc">
                <button type="button" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: 10, color: '#818cf8',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                  <ShieldCheck size={14} />
                  KYC Review
                </button>
              </Link>
            }
          />

          {/* Scrollable body */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 80px' }}>
            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 280px', maxWidth: 1200 }}>

              {/* ── Left column ─────────────────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Header card */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20, padding: '20px 24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#334155', margin: 0 }}>
                        Landlord management
                      </p>
                      <h2 style={{
                        margin: '10px 0 0', fontSize: 26, fontWeight: 800, color: '#f1f5f9',
                        letterSpacing: '-0.03em', lineHeight: 1.2,
                        fontFamily: '"DM Serif Display", Georgia, serif',
                      }}>
                        A fresh view of landlord health
                      </h2>
                      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                        Search, filter, and act on landlord accounts.
                      </p>
                    </div>
                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <StatChip label="Total"     value={clients.length} />
                      <StatChip label="Approved"  value={approved}   accent="#22d3a5" />
                      <StatChip label="Pending"   value={pending}    accent="#f59e0b" />
                      <StatChip label="Suspended" value={clients.filter(c => c.status === 'suspended').length} accent="#fb923c" />
                    </div>
                  </div>
                </div>

                {/* Filters bar */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16, padding: '12px 16px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  {/* Status tabs */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {STATUS_TABS.map(tab => {
                      const active = statusFilter === tab.key
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setStatusFilter(tab.key)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                            background: active ? '#e2e8f0' : 'rgba(255,255,255,0.05)',
                            color: active ? '#0f172a' : '#64748b',
                            border: active ? 'none' : '1px solid rgba(255,255,255,0.07)',
                          }}
                        >
                          {tab.label}
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            background: active ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)',
                            color: active ? '#0f172a' : '#475569',
                            borderRadius: 99, padding: '1px 6px',
                            fontFamily: '"DM Mono", monospace',
                          }}>{tab.count}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Search + sort */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{
                      flex: 1, minWidth: 200,
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10, padding: '7px 12px',
                    }}>
                      <Search size={14} color="#475569" />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, city, or phone"
                        style={{
                          flex: 1, background: 'transparent', border: 'none', outline: 'none',
                          fontSize: 13, color: '#e2e8f0',
                        }}
                      />
                    </div>

                    {/* Sort */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10, padding: '7px 12px',
                    }}>
                      <ArrowUpDown size={13} color="#475569" />
                      <select
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                        style={{
                          background: 'transparent', border: 'none', outline: 'none',
                          fontSize: 12, fontWeight: 600, color: '#94a3b8', cursor: 'pointer',
                        }}
                      >
                        <option value="newest" style={{ background: '#0f172a' }}>Newest first</option>
                        <option value="oldest" style={{ background: '#0f172a' }}>Oldest first</option>
                        <option value="name"   style={{ background: '#0f172a' }}>Name A–Z</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* List */}
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      border: '3px solid rgba(99,102,241,0.2)',
                      borderTopColor: '#6366f1',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '60px 0', gap: 12,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 16,
                  }}>
                    <Users size={36} color="rgba(255,255,255,0.1)" />
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#475569' }}>No landlords match this filter</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>Try changing the status or search terms.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map(l => (
                      <LandlordCard
                        key={l.id}
                        l={l}
                        processing={processing}
                        onStatus={updateStatus}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Right sidebar ────────────────────────────────────────── */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Pending queue */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20, padding: '16px 16px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#334155' }}>
                      Pending queue
                    </p>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#f59e0b',
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                      borderRadius: 99, padding: '2px 7px',
                      fontFamily: '"DM Mono", monospace',
                    }}>
                      {filtered.filter(i => i.status === 'pending').length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filtered.filter(i => i.status === 'pending').slice(0, 4).map(item => {
                      const av = avatarColor(item.full_name)
                      return (
                        <div key={item.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 12,
                        }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: av.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: av.text,
                            fontFamily: '"DM Mono", monospace',
                          }}>
                            {getInitials(item.full_name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.full_name}
                            </p>
                            <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{item.city ?? 'No city'}</p>
                          </div>
                          <Link href="/admin/kyc">
                            <ChevronRight size={14} color="#334155" />
                          </Link>
                        </div>
                      )
                    })}
                    {filtered.filter(i => i.status === 'pending').length === 0 && (
                      <p style={{ margin: 0, fontSize: 12, color: '#334155', padding: '4px 0' }}>Queue is clear.</p>
                    )}
                  </div>
                </div>

                {/* Quick breakdown */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20, padding: '16px',
                }}>
                  <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#334155' }}>
                    Status breakdown
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(STATUS_META).map(([key, m]) => {
                      const count = clients.filter(c => c.status === key).length
                      const pct = clients.length > 0 ? (count / clients.length) * 100 : 0
                      return (
                        <div key={key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{m.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: m.text, fontFamily: '"DM Mono", monospace' }}>{count}</span>
                          </div>
                          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 99,
                              background: m.dot,
                              width: `${pct}%`,
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </aside>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
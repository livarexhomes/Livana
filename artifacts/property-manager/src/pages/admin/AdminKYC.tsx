import { useState, useEffect } from 'react'
import {
  ShieldCheck, Search, CheckCircle, Clock, XCircle, Ban,
  ChevronRight, X, User, FileText, MapPin,
  ExternalLink, ImageIcon,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient, getKycDocUrl } from '../../lib/supabase'

const DOC_LABELS: Record<string, string> = {
  id_front:     'ID Card — Front',
  id_back:      'ID Card — Back',
  utility_bill: 'Utility Bill',
  selfie:       'Selfie with ID',
}

const STATUS_META: Record<string, { label: string; icon: any; bg: string; text: string; dot: string }> = {
  approved:      { label: 'Approved',  icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending:       { label: 'Pending KYC', icon: Clock,    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  rejected:      { label: 'Rejected',  icon: XCircle,    bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500'     },
  suspended:     { label: 'Suspended', icon: Ban,         bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
  not_submitted: { label: 'Not Submitted', icon: Clock,  bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-400'    },
}

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600', 'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',  'from-indigo-400 to-indigo-600',
]

function avatarGrad(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminKYC() {
  const [user, setUser]           = useState<{ email?: string } | null>(null)
  const [landlords, setLandlords] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selected, setSelected]     = useState<any | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [kycDocs, setKycDocs]       = useState<{ doc_type: string; url: string; file_name: string }[]>([])
  const [imgErrors, setImgErrors]   = useState<Record<string, boolean>>({})
  const [docsLoading, setDocsLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    supabase
      .from('landlords')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLandlords(data ?? [])
        setFiltered((data ?? []).filter((l: any) => l.status === 'pending'))
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let list = [...landlords]
    if (statusFilter !== 'all') list = list.filter(l => l.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(l => l.full_name?.toLowerCase().includes(q) || l.whatsapp?.includes(q))
    }
    setFiltered(list)
  }, [search, statusFilter, landlords])

  async function loadKycDocs(landlordId: string) {
    setDocsLoading(true)
    setKycDocs([])
    setImgErrors({})
    const supabase = createClient()
    const { data, error } = await supabase
      .from('kyc_documents')
      .select('doc_type, storage_path, file_name')
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: true })
    if (error) console.error('[KYC] fetch docs error:', error)
    if (data && data.length > 0) {
      const withUrls = await Promise.all(
        data.map(async (d: any) => {
          const url = await getKycDocUrl(d.storage_path)
          if (!url) console.warn('[KYC] signed URL failed for path:', d.storage_path)
          return {
            doc_type:  d.doc_type,
            file_name: d.file_name ?? d.doc_type,
            url:       url ?? '',
          }
        })
      )
      setKycDocs(withUrls)
    }
    setDocsLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    setProcessing(id)
    const supabase = createClient()
    const patch: any = { status }
    if (status === 'approved') patch.is_verified = true
    await supabase.from('landlords').update(patch).eq('id', id)
    setLandlords(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
    if (selected?.id === id) setSelected((s: any) => s ? { ...s, ...patch } : s)
    setProcessing(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const pending = landlords.filter(l => l.status === 'pending').length

  const STATUS_TABS = [
    { key: 'pending',       label: 'Pending KYC',  count: landlords.filter(l => l.status === 'pending').length },
    { key: 'approved',      label: 'Approved',      count: landlords.filter(l => l.status === 'approved').length },
    { key: 'suspended',     label: 'Suspended',     count: landlords.filter(l => l.status === 'suspended').length },
    { key: 'not_submitted', label: 'Not Submitted', count: landlords.filter(l => l.status === 'not_submitted').length },
    { key: 'all',           label: 'All',           count: landlords.length },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="KYC Review"
            subtitle={`${pending} pending review${pending !== 1 ? 's' : ''}`}
            pendingCount={pending}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <div className="grid gap-5 xl:grid-cols-[1.3fr_0.95fr]">
              <div className="space-y-5">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.14)]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">KYC dashboard</p>
                      <h2 className="mt-3 text-3xl font-extrabold text-slate-950">Review identity checks quickly</h2>
                      <p className="mt-3 text-sm leading-6 text-slate-500">Manage landlord KYC submissions, track statuses, and approve verified accounts.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {STATUS_TABS.filter(tab => tab.key !== 'all').map(tab => (
                        <div key={tab.key} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{tab.label}</p>
                          <p className="mt-2 text-2xl font-extrabold text-slate-950">{tab.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      {STATUS_TABS.map(tab => (
                        <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.key)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${statusFilter === tab.key ? 'bg-slate-950 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 shadow-sm">
                        <Search className="w-4 h-4 text-slate-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                          placeholder="Search by name or WhatsApp"
                          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" />
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                        {filtered.length} result{filtered.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-32">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-[32px] border border-slate-200 bg-white p-16 text-center shadow-sm">
                    <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-slate-200" />
                    <p className="text-lg font-semibold text-slate-700">No submissions match this view</p>
                    <p className="mt-2 text-sm text-slate-500">Try another filter or search query.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filtered.map(l => {
                      const meta = STATUS_META[l.status] ?? STATUS_META.pending
                      const isSelected = selected?.id === l.id
                      return (
                        <button key={l.id} type="button" onClick={() => {
                          if (isSelected) { setSelected(null); setKycDocs([]); setImgErrors({}) }
                          else { setSelected(l); loadKycDocs(l.id) }
                        }}
                          className={`w-full rounded-[28px] border p-4 text-left transition ${isSelected ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                          <div className="flex items-start gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${avatarGrad(l.full_name)}`}>
                              <span className="text-sm font-semibold text-white">{getInitials(l.full_name)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-base font-semibold text-slate-950">{l.full_name}</p>
                                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${meta.bg} ${meta.text}`}>
                                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />{meta.label}
                                </span>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                <span>{l.whatsapp || 'No WhatsApp'}</span>
                                {l.kyc_submitted_at && <span>{fmtDate(l.kyc_submitted_at)}</span>}
                              </div>
                            </div>
                            <ChevronRight className={`mt-1 h-5 w-5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-300'}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <aside className="space-y-5">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Top pending</p>
                  <div className="mt-4 space-y-3">
                    {filtered.filter(item => item.status === 'pending').slice(0, 3).map(item => (
                      <div key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-950 truncate">{item.full_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.whatsapp || 'No WhatsApp'}</p>
                      </div>
                    ))}
                    {filtered.filter(item => item.status === 'pending').length === 0 && (
                      <p className="text-sm text-slate-500">No pending submissions in current filter.</p>
                    )}
                  </div>
                </div>
              </aside>
            </div>

            {selected && (
              <div className="mt-5 xl:hidden rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${avatarGrad(selected.full_name)}`}>
                      <span className="text-sm font-semibold text-white">{getInitials(selected.full_name)}</span>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-950">{selected.full_name}</p>
                      <p className="text-sm text-slate-500">{selected.whatsapp || 'No WhatsApp'}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setKycDocs([]); setImgErrors({}) }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Status</p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[selected.status]?.dot ?? STATUS_META.pending.dot}`} />
                    {STATUS_META[selected.status]?.label ?? 'Pending'}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Joined', fmtDate(selected.created_at)],
                    ['NIN', selected.nin],
                    ['ID type', selected.id_type],
                    ['ID number', selected.id_number],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

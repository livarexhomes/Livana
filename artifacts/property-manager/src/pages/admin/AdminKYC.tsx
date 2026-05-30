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

          <div className="flex flex-1 overflow-hidden">
            {/* List panel */}
            <div className={`flex flex-col transition-all duration-300 ${selected ? 'w-full md:w-[45%] lg:w-[40%]' : 'w-full'}`}>
              <div className="px-4 md:px-5 py-4 space-y-3 border-b border-gray-100 bg-white shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {STATUS_TABS.map(tab => (
                    <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.key)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        statusFilter === tab.key
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}>
                      {tab.label}
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or WhatsApp…"
                    className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-32">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                    <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium text-sm">No submissions in this category</p>
                  </div>
                ) : filtered.map(l => {
                  const meta = STATUS_META[l.status] ?? STATUS_META.pending
                  const isSelected = selected?.id === l.id
                  return (
                    <button key={l.id} type="button" onClick={() => {
                      if (isSelected) { setSelected(null); setKycDocs([]); setImgErrors({}) }
                      else { setSelected(l); loadKycDocs(l.id) }
                    }}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
                      }`}>
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(l.full_name)} flex items-center justify-center shrink-0`}>
                        <span className="text-xs font-bold text-white">{getInitials(l.full_name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-gray-900 text-sm truncate">{l.full_name}</p>
                          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${meta.bg} ${meta.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{l.whatsapp || '—'}</span>
                          {l.kyc_submitted_at && <><span>·</span><span>{fmtDate(l.kyc_submitted_at)}</span></>}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-blue-500' : 'text-gray-300'}`} />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="hidden md:flex flex-col flex-1 border-l border-gray-100 bg-white overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-white">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(selected.full_name)} flex items-center justify-center`}>
                      <span className="text-xs font-bold text-white">{getInitials(selected.full_name)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{selected.full_name}</p>
                      <p className="text-xs text-gray-400">{selected.whatsapp || 'No WhatsApp'}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setKycDocs([]); setImgErrors({}) }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Status badge */}
                  {(() => {
                    const meta = STATUS_META[selected.status] ?? STATUS_META.pending
                    const Icon = meta.icon
                    return (
                      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl ${meta.bg}`}>
                        <Icon className={`w-4 h-4 ${meta.text} shrink-0`} />
                        <span className={`text-sm font-semibold ${meta.text}`}>{meta.label}</span>
                        {selected.kyc_submitted_at && <span className="ml-auto text-xs text-gray-400">{fmtDate(selected.kyc_submitted_at)}</span>}
                      </div>
                    )
                  })()}

                  {/* Info grid */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5 flex items-center gap-1.5"><User className="w-3 h-3" />Personal Info</p>
                    <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-x-4 gap-y-3">
                      {[
                        ['Full Name', selected.full_name],
                        ['NIN', selected.nin],
                        ['State', selected.state || selected.city],
                        ['WhatsApp', selected.whatsapp],
                        ['Joined', fmtDate(selected.created_at)],
                        ['ID Type', selected.id_type],
                        ['ID Number', selected.id_number],
                      ].map(([label, val]) => (
                        <div key={label as string}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-gray-900">{val || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selected.kyc_notes && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Note</p>
                      <div className="bg-gray-50 rounded-xl p-3.5 text-sm text-gray-700 leading-relaxed">{selected.kyc_notes}</div>
                    </div>
                  )}

                  {/* KYC Documents */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5 flex items-center gap-1.5"><FileText className="w-3 h-3" />Documents</p>
                    {docsLoading ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />Loading…
                      </div>
                    ) : kycDocs.length === 0 ? (
                      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 text-center">No documents uploaded yet.</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {kycDocs.map((doc, i) => {
                          const isPdf = doc.file_name?.toLowerCase().endsWith('.pdf')
                          const hasUrl = Boolean(doc.url)
                          const imgError = imgErrors[doc.doc_type]
                          const showImg = hasUrl && !isPdf && !imgError
                          const Wrapper = hasUrl ? 'a' : 'div'
                          const wrapperProps = hasUrl ? { href: doc.url, target: '_blank', rel: 'noopener noreferrer' } : {}
                          return (
                            <Wrapper key={i} {...(wrapperProps as any)}
                              className="group relative rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 transition-all bg-gray-50">
                              {showImg ? (
                                <img src={doc.url} alt={DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                                  className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={() => setImgErrors(prev => ({ ...prev, [doc.doc_type]: true }))} />
                              ) : isPdf && hasUrl ? (
                                <div className="w-full h-24 flex flex-col items-center justify-center gap-1.5 text-blue-500">
                                  <FileText className="w-7 h-7" /><span className="text-[10px] font-semibold">PDF</span>
                                </div>
                              ) : (
                                <div className="w-full h-24 flex flex-col items-center justify-center gap-1.5 text-gray-300">
                                  <ImageIcon className="w-7 h-7" /><span className="text-[10px] text-gray-400">{!hasUrl ? 'Not uploaded' : 'Failed'}</span>
                                </div>
                              )}
                              {hasUrl && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                  <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                              <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                                <p className="text-[10px] font-semibold text-gray-600 truncate">{DOC_LABELS[doc.doc_type] ?? doc.doc_type}</p>
                              </div>
                            </Wrapper>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action footer */}
                <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-2">
                  {selected.status !== 'approved' && selected.status !== 'rejected' && (
                    <>
                      <button type="button" disabled={processing === selected.id} onClick={() => updateStatus(selected.id, 'approved')}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                        Approve
                      </button>
                      <button type="button" disabled={processing === selected.id} onClick={() => updateStatus(selected.id, 'suspended')}
                        className="flex-1 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold rounded-xl border border-orange-200 transition-colors">
                        Suspend
                      </button>
                      <button type="button" disabled={processing === selected.id} onClick={() => updateStatus(selected.id, 'rejected')}
                        className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-xl border border-red-200 transition-colors">
                        Reject
                      </button>
                    </>
                  )}
                  {selected.status === 'approved' && (
                    <>
                      <button type="button" disabled={processing === selected.id} onClick={() => updateStatus(selected.id, 'suspended')}
                        className="flex-1 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold rounded-xl border border-orange-200 transition-colors">
                        Suspend
                      </button>
                      <button type="button" disabled={processing === selected.id} onClick={() => updateStatus(selected.id, 'rejected')}
                        className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-xl border border-red-200 transition-colors">
                        Revoke
                      </button>
                    </>
                  )}
                  {selected.status === 'suspended' && (
                    <button type="button" disabled={processing === selected.id} onClick={() => updateStatus(selected.id, 'approved')}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                      Reinstate Account
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

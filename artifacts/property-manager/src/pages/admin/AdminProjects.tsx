import { useState, useEffect, useRef } from 'react'
import {
  Search, MapPin, Calendar, Plus, TrendingUp, Building2,
  Pencil, Trash2, X, CheckCircle, AlertCircle, MoreVertical,
  Upload, ImageIcon, Loader2,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient, getSupabaseProjectImageUrl } from '../../lib/supabase'

type ProjectStatus = 'active' | 'coming_soon' | 'completed' | 'on_hold'

type Project = {
  id: string
  name: string
  developer: string
  location: string
  description: string
  image: string
  price: number
  down: number
  completion: string
  progress: number
  units: number
  sold: number
  category: string
  status: ProjectStatus
  type: string
}

const CATEGORY_COLORS: Record<string, string> = {
  Residential:  'bg-blue-50 text-blue-700',
  'Mixed Use':  'bg-violet-50 text-violet-700',
  Luxury:       'bg-amber-50 text-amber-700',
  Commercial:   'bg-emerald-50 text-emerald-700',
}

const STATUS_META: Record<ProjectStatus, { label: string; bg: string; text: string; dot: string }> = {
  active:      { label: 'Active',       bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  coming_soon: { label: 'Coming Soon',  bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  completed:   { label: 'Completed',    bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400'    },
  on_hold:     { label: 'On Hold',      bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
}

const EMPTY_FORM = {
  name: '', developer: '', location: '', description: '',
  image: '', price: 0, down: 20, completion: '', progress: 0,
  units: 0, sold: 0, category: 'Residential', status: 'active' as ProjectStatus,
  type: 'sale',
}

function progressColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-blue-600'
  if (pct >= 30) return 'bg-amber-500'
  return 'bg-rose-500'
}
function progressText(pct: number) {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 50) return 'text-blue-600'
  if (pct >= 30) return 'text-amber-600'
  return 'text-rose-500'
}



export default function AdminProjects() {
  const [user, setUser]         = useState<{ email?: string } | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // modal
  const [modalOpen, setModalOpen]         = useState(false)
  const [editing, setEditing]             = useState<Project | null>(null)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [deleteId, setDeleteId]           = useState<string | null>(null)
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null)
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [uploading, setUploading]         = useState(false)
  const fileInputRef                      = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    supabase.from('projects').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProjects((data as Project[]) ?? []); setLoading(false) })
  }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setEditing(null); setForm(EMPTY_FORM); setModalOpen(true)
  }
  function openEdit(p: Project) {
    setEditing(p)
    setForm({ name: p.name, developer: p.developer, location: p.location, description: p.description,
      image: p.image, price: p.price, down: p.down, completion: p.completion, progress: p.progress,
      units: p.units, sold: p.sold, category: p.category, status: p.status, type: p.type ?? 'sale' })
    setModalOpen(true)
    setMenuOpen(null)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.developer.trim() || !form.location.trim()) {
      showToast('Name, developer, and location are required.', false)
      return
    }
    setSaving(true)
    const supabase = createClient()
    if (editing) {
      const { error } = await supabase.from('projects').update(form).eq('id', editing.id)
      if (error) { showToast(`Save failed: ${error.message}`, false); setSaving(false); return }
      setProjects(ps => ps.map(p => p.id === editing.id ? { ...editing, ...form } : p))
    } else {
      const { data, error } = await supabase.from('projects').insert(form).select().single()
      if (error) { showToast(`Create failed: ${error.message}`, false); setSaving(false); return }
      setProjects(ps => [data as Project, ...ps])
    }
    setSaving(false)
    setModalOpen(false)
    showToast(editing ? 'Project updated.' : 'Project created.')
  }

  async function handleDelete() {
    if (!deleteId) return
    const supabase = createClient()
    const { error } = await supabase.from('projects').delete().eq('id', deleteId)
    if (error) { showToast(`Delete failed: ${error.message}`, false); return }
    setProjects(ps => ps.filter(p => p.id !== deleteId))
    setDeleteId(null)
    showToast('Project deleted.')
  }

  async function changeStatus(id: string, status: ProjectStatus) {
    const supabase = createClient()
    const { error } = await supabase.from('projects').update({ status }).eq('id', id)
    if (error) { showToast(`Status update failed: ${error.message}`, false); return }
    setProjects(ps => ps.map(p => p.id === id ? { ...p, status } : p))
    setMenuOpen(null)
  }

  const categories = ['all', ...Array.from(new Set(projects.map(p => p.category)))]
  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.developer.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
    const matchCat = catFilter === 'all' || p.category === catFilter
    return matchSearch && matchCat
  })

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const totalUnits = projects.reduce((s, p) => s + (p.units || 0), 0)
  const totalSold  = projects.reduce((s, p) => s + (p.sold  || 0), 0)

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `covers/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('project-images')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) {
        showToast(`Upload failed: ${error.message}. Run SUPABASE_MIGRATION_5.sql first.`, false)
      } else {
        setForm(f => ({ ...f, image: getSupabaseProjectImageUrl(path) }))
        showToast('Cover photo uploaded.')
      }
    } catch (err: any) {
      showToast(`Upload error: ${err.message}`, false)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Projects"
            subtitle="Manage off-plan developments"
            action={
              <button type="button" onClick={openAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Project</span>
              </button>
            }
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-5" onClick={() => setMenuOpen(null)}>
            {loading ? (
              <div className="flex items-center justify-center py-40">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (<>
            {/* Toast */}
            {toast && (
              <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
                {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {toast.msg}
              </div>
            )}

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Projects', value: projects.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Units Sold', value: `${totalSold} / ${totalUnits}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Avg Progress', value: projects.length > 0 ? `${Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)}%` : '—', color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
                  <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search projects, developers…"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
              </div>
              {categories.map(cat => (
                <button key={cat} type="button" onClick={() => setCatFilter(cat)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    catFilter === cat
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}>
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-800 font-bold text-base mb-1">{projects.length === 0 ? 'No projects yet' : 'No projects match your filter'}</p>
                <p className="text-sm text-gray-400 mb-5">
                  {projects.length === 0
                    ? 'Add your first development project and it will appear on the user dashboard.'
                    : 'Try adjusting your search or filter.'}
                </p>
                {projects.length === 0 && (
                  <button type="button" onClick={openAdd}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
                    <Plus className="w-4 h-4" /> Add First Project
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map(p => {
                  const soldPct  = p.units > 0 ? Math.round((p.sold / p.units) * 100) : 0
                  const catColor = CATEGORY_COLORS[p.category] ?? 'bg-gray-100 text-gray-600'
                  const sm       = STATUS_META[p.status] ?? STATUS_META.active
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group">
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        {p.image ? (
                          <img src={p.image} alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e: any) => { e.currentTarget.style.display = 'none' }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-14 h-14 text-gray-200" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <h3 className="text-base font-extrabold text-white leading-tight">{p.name}</h3>
                          <div className="flex items-center gap-1 text-white/70 text-xs mt-0.5">
                            <MapPin className="w-3 h-3" />{p.location}
                          </div>
                        </div>
                        <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[11px] font-bold ${catColor}`}>{p.category}</span>
                        <span className={`absolute top-3 right-12 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white/90 backdrop-blur ${progressText(p.progress)}`}>{p.progress}%</span>

                        {/* Action menu */}
                        <div className="absolute top-2.5 right-2.5" onClick={e => e.stopPropagation()}>
                          <button type="button" onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur hover:bg-white text-gray-700 shadow-sm transition-all">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpen === p.id && (
                            <div className="absolute top-9 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[160px] z-10">
                              <button type="button" onClick={() => openEdit(p)}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Pencil className="w-3.5 h-3.5 text-gray-400" /> Edit
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">Status</p>
                              {(Object.keys(STATUS_META) as ProjectStatus[]).map(st => (
                                <button key={st} type="button" onClick={() => changeStatus(p.id, st)}
                                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${p.status === st ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                                  <span className={`w-2 h-2 rounded-full ${STATUS_META[st].dot}`} />{STATUS_META[st].label}
                                </button>
                              ))}
                              <div className="border-t border-gray-100 my-1" />
                              <button type="button" onClick={() => { setDeleteId(p.id); setMenuOpen(null) }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${sm.bg} ${sm.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{sm.label}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">{p.developer}</span>
                        </div>

                        {p.description && <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{p.description}</p>}

                        <div className="space-y-2.5 mb-3">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">Construction</span>
                              <span className={`font-bold ${progressText(p.progress)}`}>{p.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${progressColor(p.progress)}`} style={{ width: `${p.progress}%` }} />
                            </div>
                          </div>
                          {p.units > 0 && (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-500">Units Sold</span>
                                <span className="font-bold text-gray-700">{p.sold}/{p.units}</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-violet-500" style={{ width: `${soldPct}%` }} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">From</p>
                            <p className="text-sm font-bold text-gray-900">{p.price > 0 ? `₦${(p.price / 1_000_000).toFixed(0)}M` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Down</p>
                            <p className="text-sm font-bold text-gray-900">{p.down}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Completion</p>
                            <p className="text-sm font-bold text-gray-900">{p.completion || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>)} {/* end loading conditional */}
          </main>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Project' : 'Add New Project'}</h2>
              <button type="button" onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Project Name *</label>
                  <input value={form.name} onChange={F('name')} placeholder="e.g. Skyline Residences"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Developer *</label>
                  <input value={form.developer} onChange={F('developer')} placeholder="e.g. Mixta Africa"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Location *</label>
                  <input value={form.location} onChange={F('location')} placeholder="e.g. Victoria Island, Lagos"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
                  <textarea value={form.description} onChange={F('description')} rows={3} placeholder="Brief description..."
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Cover Picture</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  {form.image ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 group h-40">
                      <img src={form.image} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-800 text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors">
                          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Replace
                        </button>
                        <button type="button" onClick={() => setForm(f => ({ ...f, image: '' }))}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">
                          <X className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="w-full h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/40 transition-all group">
                      {uploading ? (
                        <>
                          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                          <span className="text-xs font-semibold text-blue-500">Uploading…</span>
                        </>
                      ) : (
                        <>
                          <div className="w-11 h-11 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-semibold">Click to upload cover picture</span>
                          <span className="text-[11px]">JPG, PNG, WebP — recommended 1200×800</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Starting Price (₦)</label>
                  <input type="number" min={0} value={form.price} onChange={F('price')} placeholder="85000000"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Down Payment %</label>
                  <input type="number" min={0} max={100} value={form.down} onChange={F('down')}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Total Units</label>
                  <input type="number" min={0} value={form.units} onChange={F('units')}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Units Sold</label>
                  <input type="number" min={0} value={form.sold} onChange={F('sold')}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Construction % (0–100)</label>
                  <input type="number" min={0} max={100} value={form.progress} onChange={F('progress')}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Completion Date</label>
                  <input value={form.completion} onChange={F('completion')} placeholder="e.g. Q3 2026"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Category</label>
                  <select value={form.category} onChange={F('category')}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                    <option>Residential</option><option>Mixed Use</option><option>Luxury</option><option>Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Listing Type</label>
                  <select value={form.type} onChange={F('type')}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                    <option value="sale">Buy / Sale</option>
                    <option value="rent">Rent</option>
                    <option value="lease">Lease</option>
                    <option value="commercial">Commercial</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Determines which tab this project appears under on the homepage.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Status</label>
                  <select value={form.status} onChange={F('status')}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                    <option value="active">Active</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button type="button" onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Delete this project?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  )
}

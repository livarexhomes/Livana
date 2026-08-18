import { useState, useEffect, useRef } from 'react'
import {
  Search, MapPin, Calendar, Plus, Building2,
  Pencil, Trash2, X, CheckCircle, AlertCircle, MoreVertical,
  Upload, ImageIcon, Loader2, TrendingUp, Filter,
  LayoutGrid, List, ChevronRight,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { MobileSidebarProvider, MobileStatGrid, MobileStatCard, MobileEmptyState, MobileSearch, MobileFilterBar } from '@/components/ui/mobile-admin'
import { createClient, getSupabaseProjectImageUrl } from '../../lib/supabase'
import { MoneyInput } from '../../components/ui/money-input'
import { ResponsiveFilters } from '../../components/ui/responsive-filters'
import { digitsToNumber } from '../../lib/currency'

type ProjectStatus = 'active' | 'coming_soon' | 'completed' | 'on_hold'

type Project = {
  id: string
  name: string
  developer: string
  location: string
  map_link: string
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

const STATUS_META: Record<ProjectStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  active:      { label: 'Active',       bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-l-emerald-500' },
  coming_soon: { label: 'Coming Soon',  bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-l-blue-500'    },
  completed:   { label: 'Completed',    bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400',   border: 'border-l-slate-400'   },
  on_hold:     { label: 'On Hold',      bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-l-amber-500'   },
}

const STATUS_FILTERS: { key: 'all' | ProjectStatus; label: string }[] = [
  { key: 'all',        label: 'All'         },
  { key: 'active',     label: 'Active'      },
  { key: 'coming_soon',label: 'Coming Soon' },
  { key: 'completed',  label: 'Completed'   },
  { key: 'on_hold',    label: 'On Hold'     },
]

const EMPTY_FORM = {
  name: '', developer: '', location: '', map_link: '', description: '',
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

function mapEmbedSrc(link: string): string | null {
  const l = link.trim()
  if (!l) return null
  if (!/^https?:\/\/www\.google\.com\/maps/i.test(l)) return null
  const u = new URL(l)
  if (u.hostname !== 'www.google.com' || !u.pathname.startsWith('/maps')) return null
  const loc = u.searchParams.get('q')
  if (loc) return `https://www.google.com/maps?q=${encodeURIComponent(loc)}&output=embed`
  const m = u.pathname.match(/\/maps\/place\/[^/]+/)
  if (m) return `https://www.google.com/maps${m[0]}?output=embed`
  const c = u.searchParams.get('ll') ?? u.searchParams.get('center')
  if (c) return `https://www.google.com/maps?q=${encodeURIComponent(c)}&output=embed`
  return null
}

export default function AdminProjects() {
  const [user, setUser]           = useState<{ email?: string } | null>(null)
  const [projects, setProjects]   = useState<Project[]>([])
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [catFilter, setCatFilter] = useState('all')
  const [view, setView]           = useState<'grid' | 'list'>('grid')
  const [menuOpen, setMenuOpen]   = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Project | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef              = useRef<HTMLInputElement>(null)

  function syncLocalCache(ps: Project[]) {
    try { localStorage.setItem('livana_admin_projects', JSON.stringify(ps)) } catch { }
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email })
      if (user?.id) window.__livarexUserId = user.id
    })
    supabase.from('projects').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data as Project[] | null) ?? []
        setProjects(rows)
        syncLocalCache(rows)
        setLoading(false)
      })
  }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  function openEdit(p: Project) {
    setEditing(p)
    setForm({ name: p.name, developer: p.developer, location: p.location, map_link: p.map_link ?? '',
      description: p.description, image: p.image, price: p.price, down: p.down,
      completion: p.completion, progress: p.progress, units: p.units, sold: p.sold,
      category: p.category, status: p.status, type: p.type ?? 'sale' })
    setModalOpen(true)
    setMenuOpen(null)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.developer.trim() || !form.location.trim()) {
      showToast('Name, developer, and location are required.', false); return
    }
    setSaving(true)
    const supabase = createClient()
    const trySave = async (payload: Partial<typeof form>) => {
      if (editing) return supabase.from('projects').update(payload).eq('id', editing.id)
      return supabase.from('projects').insert(payload).select().single()
    }
    let result = await trySave({ ...form })
    if (result.error && result.error.message?.toLowerCase().includes('map_link')) {
      const { map_link: _map_link, ...rest } = form
      result = await trySave(rest)
    }
    const { data, error } = result
    if (error) { showToast(`Save failed: ${error.message}`, false); setSaving(false); return }
    if (editing) {
      const next = projects.map(p => p.id === editing.id ? { ...editing, ...form } : p)
      setProjects(next); syncLocalCache(next)
    } else {
      const next = [data as Project, ...projects]
      setProjects(next); syncLocalCache(next)
    }
    setSaving(false); setModalOpen(false)
    showToast(editing ? 'Project updated.' : 'Project created.')
  }

  async function handleDelete() {
    if (!deleteId) return
    const supabase = createClient()
    const { error } = await supabase.from('projects').delete().eq('id', deleteId)
    if (error) { showToast(`Delete failed: ${error.message}`, false); return }
    const next = projects.filter(p => p.id !== deleteId)
    setProjects(next); syncLocalCache(next); setDeleteId(null)
    showToast('Project deleted.')
  }

  async function changeStatus(id: string, status: ProjectStatus) {
    const supabase = createClient()
    const { error } = await supabase.from('projects').update({ status }).eq('id', id)
    if (error) { showToast(`Status update failed: ${error.message}`, false); return }
    const next = projects.map(p => p.id === id ? { ...p, status } : p)
    setProjects(next); syncLocalCache(next); setMenuOpen(null)
  }

  // Derived stats
  const totalUnits      = projects.reduce((s, p) => s + (p.units || 0), 0)
  const totalSold       = projects.reduce((s, p) => s + (p.sold  || 0), 0)
  const avgProgress     = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0
  const statusTotals    = projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc }, {} as Record<ProjectStatus, number>)
  const sellThrough     = totalUnits > 0 ? Math.round((totalSold / totalUnits) * 100) : 0
  const categories      = ['all', ...Array.from(new Set(projects.map(p => p.category)))]
  const displayName     = user?.email ? user.email.split('@')[0] : 'Admin'

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.developer.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchCat    = catFilter === 'all' || p.category === catFilter
    return matchSearch && matchStatus && matchCat
  })

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))

  const N = (k: keyof typeof form) => ({
    value: form[k] === 0 ? '' : (form[k] as number),
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value === '' ? 0 : Number(e.target.value) })),
  })

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `covers/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('project-images').upload(path, file, { upsert: true, contentType: file.type })
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
      <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Projects"
            subtitle="Off-plan developments &amp; launches"
            action={
              <button type="button" onClick={openAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm min-h-[44px] sm:min-h-[auto]">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Project</span>
              </button>
            }
          />

          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4">

              {/* ── Mobile: compact stats + filters ── */}
          <div className="sm:hidden -mx-4">
             <MobileStatGrid>
               <MobileStatCard label="Projects" value={projects.length} color="text-slate-700" icon={Building2} />
               <MobileStatCard label="Units Sold" value={`${totalSold}/${totalUnits}`} color="text-emerald-700" icon={CheckCircle} />
               <MobileStatCard label="Avg Progress" value={`${avgProgress}%`} color="text-violet-700" icon={TrendingUp} />
               <MobileStatCard label="Coming Soon" value={statusTotals.coming_soon ?? 0} color="text-amber-700" icon={Calendar} />
             </MobileStatGrid>
             <MobileSearch
               placeholder="Search projects, developers, locations…"
               value={search}
               onChange={setSearch}
             />
             <MobileFilterBar>
               <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | ProjectStatus)}
                 className="flex-1 appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer min-h-[44px]">
                 {STATUS_FILTERS.map(f => (
                   <option key={f.key} value={f.key}>{f.label} ({f.key === 'all' ? projects.length : (statusTotals[f.key] ?? 0)})</option>
                 ))}
               </select>
               {categories.length > 1 && (
                 <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                   className="flex-1 appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer min-h-[44px]">
                   {categories.map(c => (
                     <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
                   ))}
                 </select>
               )}
               <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
                 <button type="button" onClick={() => setView('grid')}
                   className={`p-1.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition ${view === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}>
                   <LayoutGrid className="w-4 h-4" />
                 </button>
                 <button type="button" onClick={() => setView('list')}
                   className={`p-1.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition ${view === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}>
                   <List className="w-4 h-4" />
                 </button>
               </div>
             </MobileFilterBar>
           </div>

          {/* ── Hero card: KPI + filters (desktop only) ── */}
              <div className="hidden sm:block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Development projects</p>
                    <h2 className="mt-0.5 text-base font-extrabold text-slate-950">Off-plan &amp; Launches</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:flex-wrap sm:gap-2 sm:shrink-0">
                    {[
                      { label: 'Projects',     value: String(projects.length),            color: 'text-slate-700'   },
                      { label: 'Units Sold',   value: `${totalSold}/${totalUnits}`,       color: 'text-emerald-700' },
                      { label: 'Avg Progress', value: `${avgProgress}%`,                  color: 'text-violet-700'  },
                      { label: 'Coming Soon',  value: String(statusTotals.coming_soon ?? 0), color: 'text-amber-700' },
                    ].map(k => (
                      <div key={k.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-2 sm:px-3 py-1.5 text-center sm:min-w-[56px]">
                        <p className={`text-base font-extrabold tabular-nums ${k.color}`}>{k.value}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{k.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status filter — compact pills, dropdown on mobile */}
                <ResponsiveFilters
                  tabs={STATUS_FILTERS.map(f => ({
                    key: f.key,
                    label: f.label,
                    count: f.key === 'all' ? projects.length : (statusTotals[f.key] ?? 0),
                  }))}
                  value={statusFilter}
                  onChange={v => setStatusFilter(v as typeof statusFilter)}
                  label="Project status"
                  className="mb-3"
                />

                {/* Search + category + view */}
                {!loading && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Search */}
                      <div className="flex-1 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                          placeholder="Search projects, developers, locations…"
                          className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none" />
                        {search && (
                          <button type="button" onClick={() => setSearch('')}>
                            <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                          </button>
                        )}
                      </div>

                      {/* Category filter — compact select */}
                      {categories.length > 1 && (
                        <div className="sm:flex items-center gap-1.5 shrink-0 hidden">
                          <Filter className="w-3.5 h-3.5 text-slate-400" />
                          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                            className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                            {categories.map(c => (
                              <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* View toggle */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
                        <button type="button" onClick={() => setView('grid')}
                          className={`p-1.5 rounded-lg transition ${view === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}>
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setView('list')}
                          className={`p-1.5 rounded-lg transition ${view === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}>
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                )}
              </div>

              {loading && (
                <div className="flex items-center justify-center py-20 sm:py-40">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
                </div>
              )}

              {!loading && (
                <>
                  {/* ── Results count ───────────────────────────────────────── */}
                  {filtered.length > 0 && (
                    <p className="text-xs text-slate-400 font-medium px-0.5">
                      {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                      {(search || statusFilter !== 'all' || catFilter !== 'all') ? ' matching filters' : ''}
                    </p>
                  )}

                  {/* ── Empty state ─────────────────────────────────────────── */}
                  {filtered.length === 0 && (
                    <div className="py-8">
                      <MobileEmptyState
                        title={projects.length === 0 ? 'No projects yet' : 'No projects match'}
                        description={projects.length === 0
                          ? 'Add your first development project and it will appear on the user dashboard.'
                          : 'Try clearing the search or changing the filter.'}
                        icon={Building2}
                        action={projects.length === 0 && (
                          <button type="button" onClick={openAdd}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm min-h-[44px]">
                            <Plus className="w-4 h-4" /> Add Project
                          </button>
                        )}
                      />
                    </div>
                  )}

                  {/* ── Grid view ───────────────────────────────────────────── */}
                  {filtered.length > 0 && (
                    <div className={view === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4" : "grid grid-cols-1 gap-4 sm:hidden"}>
                      {filtered.map(p => {
                        const soldPct  = p.units > 0 ? Math.round((p.sold / p.units) * 100) : 0
                        const catColor = CATEGORY_COLORS[p.category] ?? 'bg-slate-100 text-slate-600'
                        const sm       = STATUS_META[p.status] ?? STATUS_META.active
                        return (
                          <div key={p.id}
                            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all">
                            {/* Cover image */}
                            <div className="relative h-32 sm:h-44 overflow-hidden bg-slate-100">
                              {p.image ? (
                                <img src={p.image} alt={p.name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  onError={(e: any) => { e.currentTarget.style.display = 'none' }} />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Building2 className="w-12 h-12 text-slate-200" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                              {/* Bottom-left: name + location */}
                              <div className="absolute bottom-3 left-3 right-12">
                                <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">{p.name}</h3>
                                <p className="text-[11px] text-slate-300 mt-0.5 truncate flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />{p.location}
                                </p>
                              </div>
                              {/* Progress badge */}
                              <div className="absolute top-3 right-3 rounded-lg bg-white/95 px-2 py-0.5 text-xs font-bold text-slate-700 shadow-sm">
                                {p.progress}%
                              </div>
                              {/* Category badge */}
                              <div className={`absolute top-3 left-3 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${catColor}`}>
                                {p.category}
                              </div>
                              {/* ⋮ menu */}
                              <div className="absolute bottom-3 right-3" onClick={e => e.stopPropagation()}>
                                <button type="button" onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                                  className="min-w-[44px] h-9 w-9 sm:w-8 sm:h-8 rounded-lg bg-white/90 text-slate-700 shadow-sm hover:bg-white transition flex items-center justify-center">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {menuOpen === p.id && (
                                  <div className="absolute right-0 bottom-10 z-10 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                    <button type="button" onClick={() => openEdit(p)}
                                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                      <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit project
                                    </button>
                                    <div className="border-t border-slate-100" />
                                    <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Change status</div>
                                    {(Object.keys(STATUS_META) as ProjectStatus[]).map(st => (
                                      <button key={st} type="button" onClick={() => changeStatus(p.id, st)}
                                        className={`w-full px-4 py-2.5 text-left text-sm transition ${p.status === st ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>
                                        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_META[st].dot} mr-2`} />
                                        {STATUS_META[st].label}
                                      </button>
                                    ))}
                                    <div className="border-t border-slate-100" />
                                    <button type="button" onClick={() => { setDeleteId(p.id); setMenuOpen(null) }}
                                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                      <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="p-3 sm:p-4 space-y-3">
                              {/* Status + developer */}
                              <div className="flex items-center justify-between">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sm.bg} ${sm.text}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />{sm.label}
                                </span>
                                <span className="text-xs text-slate-500 truncate max-w-[120px]">{p.developer}</span>
                              </div>

                              {/* Progress bars */}
                              <div className="space-y-2.5">
                                <div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                    <span>Construction</span>
                                    <span className={`font-bold ${progressText(p.progress)}`}>{p.progress}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div className={`h-full rounded-full ${progressColor(p.progress)} transition-all`} style={{ width: `${p.progress}%` }} />
                                  </div>
                                </div>
                                {p.units > 0 && (
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                      <span>Units sold</span>
                                      <span className="font-bold text-slate-900">{p.sold}/{p.units}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                      <div className="h-full rounded-full bg-violet-500 transition-all"
                                        style={{ width: `${p.units > 0 ? Math.round((p.sold / p.units) * 100) : 0}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Metrics row */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                                <div>
                                  <p className="text-slate-400 uppercase tracking-wide text-[10px]">Price</p>
                                  <p className="font-bold text-slate-900 mt-0.5">{p.price > 0 ? `₦${(p.price / 1_000_000).toFixed(0)}M` : '—'}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-slate-400 uppercase tracking-wide text-[10px]">Down</p>
                                  <p className="font-bold text-slate-900 mt-0.5">{p.down}%</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-slate-400 uppercase tracking-wide text-[10px]">Delivery</p>
                                  <p className="font-bold text-slate-900 mt-0.5">{p.completion || '—'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── List view ───────────────────────────────────────────── */}
                  {filtered.length > 0 && view === 'list' && (
                    <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      {/* Table header */}
                      <div className="hidden md:grid grid-cols-[auto_1fr_120px_120px_100px_80px_40px] items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <div className="w-12" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Project</p>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Progress</p>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Units</p>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Price</p>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                        <div />
                      </div>
                      <div className="divide-y divide-slate-50">
                        {filtered.map(p => {
                          const sm      = STATUS_META[p.status] ?? STATUS_META.active
                          const soldPct = p.units > 0 ? Math.round((p.sold / p.units) * 100) : 0
                          return (
                            <div key={p.id}
                              className="grid grid-cols-1 md:grid-cols-[auto_1fr_120px_120px_100px_80px_40px] items-center gap-3 md:gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                              {/* Thumbnail */}
                              <div className="hidden md:flex w-12 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover"
                                    onError={(e: any) => { e.currentTarget.style.display = 'none' }} />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <Building2 className="w-4 h-4 text-slate-300" />
                                  </div>
                                )}
                              </div>

                              {/* Name + location */}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                                <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 shrink-0" />{p.location}
                                  <span className="text-slate-300">·</span>{p.developer}
                                </p>
                              </div>

                              {/* Construction progress */}
                              <div className="hidden md:block">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs font-bold ${progressText(p.progress)}`}>{p.progress}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${progressColor(p.progress)}`} style={{ width: `${p.progress}%` }} />
                                </div>
                              </div>

                              {/* Units */}
                              <div className="hidden md:block">
                                <p className="text-sm font-semibold text-slate-900">{p.sold}/{p.units}</p>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${soldPct}%` }} />
                                </div>
                              </div>

                              {/* Price */}
                              <div className="hidden md:block">
                                <p className="text-sm font-semibold text-slate-900">
                                  {p.price > 0 ? `₦${(p.price / 1_000_000).toFixed(0)}M` : '—'}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{p.down}% down</p>
                              </div>

                              {/* Status */}
                              <div>
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sm.bg} ${sm.text}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                                  <span className="hidden sm:inline">{sm.label}</span>
                                </span>
                              </div>

                              {/* Actions */}
                              <div className="relative" onClick={e => e.stopPropagation()}>
                                <button type="button" onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {menuOpen === p.id && (
                                  <div className="absolute right-0 top-9 z-10 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                    <button type="button" onClick={() => openEdit(p)}
                                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                      <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit project
                                    </button>
                                    <div className="border-t border-slate-100" />
                                    <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Change status</div>
                                    {(Object.keys(STATUS_META) as ProjectStatus[]).map(st => (
                                      <button key={st} type="button" onClick={() => changeStatus(p.id, st)}
                                        className={`w-full px-4 py-2.5 text-left text-sm transition ${p.status === st ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>
                                        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_META[st].dot} mr-2`} />
                                        {STATUS_META[st].label}
                                      </button>
                                    ))}
                                    <div className="border-t border-slate-100" />
                                    <button type="button" onClick={() => { setDeleteId(p.id); setMenuOpen(null) }}
                                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                      <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60">
          <div className="bg-white rounded-none md:rounded-3xl shadow-2xl w-full h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-5 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Project' : 'Add New Project'}</h2>
              <button type="button" onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-6">
              {/* ── Basic Info ── */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">Basic Info</p>
                  <p className="text-xs text-gray-400 mt-0.5">What buyers see first — name, developer and where it is.</p>
                </div>
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
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Location Name *</label>
                    <input value={form.location} onChange={F('location')} placeholder="e.g. Victoria Island, Lagos"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-[11px] text-gray-400 mt-1">The display text shown on the project card.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Google Maps Link</label>
                    <input value={form.map_link} onChange={F('map_link')} placeholder="Paste the Share link from Google Maps"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-[11px] text-gray-400 mt-1">
                      On Google Maps, tap <span className="font-semibold">Share → Copy link</span>, then paste it here.
                    </p>
                    {(() => {
                      const src = mapEmbedSrc(form.map_link)
                      if (src) {
                        return (
                          <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
                            <iframe src={src} title="Project location preview" className="w-full h-44"
                              loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                          </div>
                        )
                      }
                      if (form.map_link.trim() && !/^https?:\/\/maps\.app\.goo\.gl\//i.test(form.map_link.trim())) {
                        return (
                          <p className="text-[11px] text-amber-600 mt-1.5">
                            Couldn't preview this link. Use a full <span className="font-semibold">google.com/maps</span> link to see the live preview.
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
                    <textarea value={form.description} onChange={F('description')} rows={3} placeholder="Brief description…"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>
              </div>

              {/* ── Cover Picture ── */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">Cover Picture</p>
                  <p className="text-xs text-gray-400 mt-0.5">The hero image on the project card — recommended 1200×800.</p>
                </div>
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

              {/* ── Pricing & Units ── */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">Pricing &amp; Units</p>
                  <p className="text-xs text-gray-400 mt-0.5">The price buyers start from and how many units are available.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Starting Price (₦)</label>
                    <MoneyInput
                      value={form.price === 0 ? '' : String(form.price)}
                      onChange={v => setForm(f => ({ ...f, price: digitsToNumber(v) }))}
                      placeholder="85000000"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Lowest price a buyer can enter at.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Down Payment (%)</label>
                    <input type="number" min={0} max={100} {...N('down')}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-[11px] text-gray-400 mt-1">Minimum deposit as % of price.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Total Units</label>
                    <input type="number" min={0} {...N('units')}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Units Sold</label>
                    <input type="number" min={0} {...N('sold')}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-[11px] text-gray-400 mt-1">Shouldn't exceed total units.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Construction Progress (%)</label>
                    <input type="number" min={0} max={100} {...N('progress')}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-[11px] text-gray-400 mt-1">0 = not started · 100 = finished.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Completion Date</label>
                    <input value={form.completion} onChange={F('completion')} placeholder="e.g. Q3 2026"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* ── Classification & Status ── */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">Classification &amp; Status</p>
                  <p className="text-xs text-gray-400 mt-0.5">How this project is categorised and its current state.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="col-span-2">
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
            </div>

            <div className="flex flex-col sm:flex-row gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 shrink-0">
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

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-xl md:rounded-3xl shadow-2xl p-7 w-full max-w-sm text-center">
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

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold border ${
            toast.ok ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-red-600 text-white border-red-500'
          }`}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </MobileSidebarProvider>
    </AuthGuard>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Link } from 'wouter'
import {
  Building2, Search, LayoutGrid, List,
  MapPin, BedDouble, Bath, Pencil, Trash2, ArrowRight, Plus, Eye,
  SlidersHorizontal, CheckCircle, Clock, XCircle, X, Save, Loader2, ImagePlus, Star
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'

const FALLBACK_IMAGES: Record<string, string> = {
  apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=70',
  villa: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=70',
  duplex: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=70',
  bungalow: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=70',
  studio: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=70',
  office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=70',
  shop: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=70',
  land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=70',
  default: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=70',
}

function getCoverImage(p: any): string {
  const images = p.property_images ?? []
  const cover = images.find((img: any) => img.is_cover) ?? images[0]
  if (cover?.storage_path) return getSupabaseImageUrl(cover.storage_path)
  return FALLBACK_IMAGES[p.property_type?.toLowerCase()] ?? FALLBACK_IMAGES.default
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  sale: { label: 'For Sale', cls: 'bg-blue-600 text-white' },
  rent: { label: 'For Rent', cls: 'bg-emerald-500 text-white' },
}

const STATUS_META: Record<string, { label: string; icon: any; cls: string }> = {
  available: { label: 'Available', icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50' },
  taken: { label: 'Taken', icon: XCircle, cls: 'text-red-500 bg-red-50' },
  coming_soon: { label: 'Coming Soon', icon: Clock, cls: 'text-blue-600 bg-blue-50' },
  under_negotiation: { label: 'Negotiating', icon: Clock, cls: 'text-amber-600 bg-amber-50' },
}

type EditForm = { title: string; city: string; price: string; type: string; status: string; bedrooms: string; bathrooms: string }
const emptyEdit: EditForm = { title: '', city: '', price: '', type: 'rent', status: 'available', bedrooms: '', bathrooms: '' }

type AddForm = {
  landlord_id: string; title: string; city: string; state: string
  assigned_to: string
  property_type: string; type: string; status: string
  price: string; bedrooms: string; bathrooms: string; description: string
}
const emptyAdd: AddForm = {
  landlord_id: '', title: '', city: '', state: '', assigned_to: '',
  property_type: 'Apartment', type: 'rent', status: 'available',
  price: '', bedrooms: '', bathrooms: '', description: '',
}

export default function AdminProperties() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingProp, setEditingProp] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit)
  const [saving, setSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(emptyAdd)
  const [addSaving, setAddSaving] = useState(false)
  const [landlords, setLandlords] = useState<{ id: string; full_name: string }[]>([])
  const [admins, setAdmins] = useState<{ id: string; email: string }[]>([])
  // Image Upload State and Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [coverIdx, setCoverIdx] = useState(0)
  const [deletingImg, setDeletingImg] = useState<string | null>(null)

  // existingImages only matters in edit mode — for the Add modal it's always empty
  const existingImages: any[] = []


  function addFiles(files: FileList | null) {
    if (!files) return
    const valid = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024) // 10 MB cap
    setImageFiles(prev => [...prev, ...valid])
    valid.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setImagePreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removeNewImage(idx: number) {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
    if (coverIdx >= idx && coverIdx > 0) setCoverIdx(c => c - 1)
  }

  // stubs — only used in edit mode
  function setCoverExisting(_id: string) { }
  async function deleteExistingImage(_img: any) { }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    supabase
      .from('properties')
      .select('*, landlords(full_name, is_verified), property_images(id, storage_path, is_cover, sort_order)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProperties(data ?? [])
        setFiltered(data ?? [])
        setLoading(false)
      })
    supabase
      .from('landlords')
      .select('id, full_name')
      .order('full_name')
      .then(({ data }) => setLandlords(data ?? []))
    
    supabase
    .from('admins')
    .select('id, email')
    .order('email')
    .then(({ data }) => setAdmins(data ?? []))
  }, [])
  

  useEffect(() => {
    let list = [...properties]
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.property_type?.toLowerCase().includes(q)
      )
    }
    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sort === 'price_asc') list.sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price_desc') list.sort((a, b) => Number(b.price) - Number(a.price))
    setFiltered(list)
  }, [search, sort, statusFilter, properties])

  async function handleDelete(id: string) {
    if (!confirm('Delete this property? This cannot be undone.')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('properties').delete().eq('id', id)
    setProperties(ps => ps.filter(p => p.id !== id))
    setDeleting(null)
  }

  function openEdit(p: any) {
    setEditingProp(p)
    setEditForm({
      title: p.title ?? '',
      city: p.city ?? '',
      price: p.price != null ? String(p.price) : '',
      type: p.type ?? 'rent',
      status: p.status ?? 'available',
      bedrooms: p.bedrooms != null ? String(p.bedrooms) : '',
      bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
    })
  }

  async function handleAddSave() {
    if (!addForm.title.trim() || !addForm.city.trim() || !addForm.price) {
      alert('Title, city and price are required.')
      return
    }
    setAddSaving(true)
    const supabase = createClient()

    // 1. Insert property row
    const { data, error } = await supabase
      .from('properties')
      .insert({
        landlord_id: addForm.landlord_id || null,
        assigned_to:  addForm.assigned_to || null,
        title: addForm.title.trim(),
        city: addForm.city.trim(),
        state: addForm.state.trim() || null,
        property_type: addForm.property_type,
        type: addForm.type,
        status: addForm.status,
        price: Number(addForm.price),
        bedrooms: addForm.bedrooms ? Number(addForm.bedrooms) : null,
        bathrooms: addForm.bathrooms ? Number(addForm.bathrooms) : null,
        description: addForm.description.trim() || null,
      })
      .select('*, landlords(full_name, is_verified), property_images(id, storage_path, is_cover, sort_order)')
      .single()

    if (error || !data) {
      alert(error?.message ?? 'Failed to create listing.')
      setAddSaving(false)
      return
    }

    // 2. Upload images (if any)
    if (imageFiles.length > 0) {
      await Promise.all(
        imageFiles.map(async (file, i) => {
          const ext = file.name.split('.').pop()
          const path = `properties/${data.id}/${Date.now()}-${i}.${ext}`

          const { error: upErr } = await supabase.storage
            .from('property-images')          // ← your bucket name here
            .upload(path, file, { upsert: false })

          if (upErr) { console.error('Upload error', upErr); return }

          await supabase.from('property_images').insert({
            property_id: data.id,
            storage_path: path,
            is_cover: i === coverIdx,
            sort_order: i,
          })
        })
      )
    }

    // 3. Reset & close
    setProperties(ps => [data, ...ps])
    setAddForm(emptyAdd)
    setImageFiles([])
    setImagePreviews([])
    setCoverIdx(0)
    setAddSaving(false)
    setAddOpen(false)
  }

  async function handleEditSave() {
    if (!editingProp) return
    setSaving(true)
    const supabase = createClient()
    const patch = {
      title: editForm.title,
      city: editForm.city,
      price: editForm.price ? Number(editForm.price) : null,
      type: editForm.type,
      status: editForm.status,
      bedrooms: editForm.bedrooms ? Number(editForm.bedrooms) : null,
      bathrooms: editForm.bathrooms ? Number(editForm.bathrooms) : null,
    }
    await supabase.from('properties').update(patch).eq('id', editingProp.id)
    setProperties(ps => ps.map(p => p.id === editingProp.id ? { ...p, ...patch } : p))
    setSaving(false)
    setEditingProp(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const available = properties.filter(p => p.status === 'available').length
  const taken = properties.filter(p => p.status === 'taken').length

  const STATUS_TABS = [
    { key: 'all', label: 'All', count: properties.length },
    { key: 'available', label: 'Available', count: available },
    { key: 'taken', label: 'Taken', count: taken },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Listings"
            subtitle={`${properties.length.toLocaleString()} total listings`}
            action={
              <button type="button" onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Listing</span>
              </button>
            }
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
            {/* Summary chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STATUS_TABS.map(tab => (
                <button key={tab.key} type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${statusFilter === tab.key
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}>
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search + controls */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by title, city, type…"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
              </div>
              <button className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <button type="button" onClick={() => setViewMode('grid')}
                  className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setViewMode('list')}
                  className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="hidden sm:block px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-40">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">{search ? 'No properties match your search.' : 'No properties found.'}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {filtered.map(p => {
                  const badge = TYPE_BADGE[p.type] ?? TYPE_BADGE.sale
                  const status = STATUS_META[p.status] ?? STATUS_META.available
                  const StatusIcon = status.icon
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
                      <div className="relative h-48 overflow-hidden">
                        <img src={getCoverImage(p)} alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={(e: any) => { e.currentTarget.src = FALLBACK_IMAGES.default }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm ${badge.cls}`}>{badge.label}</span>
                          {p.featured && (
                            <span className="px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded-lg uppercase tracking-wide shadow-sm">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <p className="text-xs font-bold text-white/90 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg">
                            ₦{Number(p.price).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 flex-1">{p.title}</h3>
                          <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${status.cls}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {p.city}
                          {p.landlords?.full_name && (
                            <span className="text-gray-300 mx-1">·</span>
                          )}
                          {p.landlords?.full_name && (
                            <span className="truncate">{p.landlords.full_name}</span>
                          )}
                        </div>

                        {(p.bedrooms != null || p.bathrooms != null) && (
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                            {p.bedrooms != null && (
                              <span className="flex items-center gap-1">
                                <BedDouble className="w-3.5 h-3.5 text-gray-400" />
                                {p.bedrooms} Beds
                              </span>
                            )}
                            {p.bathrooms != null && (
                              <span className="flex items-center gap-1">
                                <Bath className="w-3.5 h-3.5 text-gray-400" />
                                {p.bathrooms} Baths
                              </span>
                            )}
                            <span className="ml-auto text-[10px] font-semibold text-gray-400 uppercase">{p.property_type ?? p.type}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button title="Edit" onClick={() => openEdit(p)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} title="Delete"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <Link href={`/listings/${p.id}`}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead className="bg-slate-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Landlord</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Price</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(p => {
                        const badge = TYPE_BADGE[p.type] ?? TYPE_BADGE.sale
                        const status = STATUS_META[p.status] ?? STATUS_META.available
                        const StatusIcon = status.icon
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                                  <img src={getCoverImage(p)} alt={p.title} className="w-full h-full object-cover"
                                    onError={(e: any) => { e.currentTarget.src = FALLBACK_IMAGES.default }} />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">{p.title}</p>
                                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                                    <MapPin className="w-3 h-3" />{p.city}
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">
                              {p.landlords?.full_name ?? '—'}
                            </td>
                            <td className="px-5 py-3.5 text-sm font-bold text-gray-900 hidden sm:table-cell">
                              ₦{Number(p.price).toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${status.cls}`}>
                                <StatusIcon className="w-3 h-3" />{status.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(p)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <Link href={`/listings/${p.id}`}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
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

        {/* Edit modal */}
        {editingProp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Edit Property</h2>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{editingProp.title}</p>
                </div>
                <button onClick={() => setEditingProp(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Title</label>
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">City</label>
                    <input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Price (₦)</label>
                    <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Type</label>
                    <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all">
                      <option value="rent">Rent</option>
                      <option value="sale">Buy / Sale</option>
                      <option value="lease">Lease</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Status</label>
                    <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all">
                      <option value="available">Available</option>
                      <option value="taken">Taken</option>
                      <option value="under_negotiation">Under Negotiation</option>
                      <option value="coming_soon">Coming Soon</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Bedrooms</label>
                    <input type="number" min="0" value={editForm.bedrooms} onChange={e => setEditForm(f => ({ ...f, bedrooms: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Bathrooms</label>
                    <input type="number" min="0" value={editForm.bathrooms} onChange={e => setEditForm(f => ({ ...f, bathrooms: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button onClick={() => setEditingProp(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleEditSave} disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Listing Modal ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Add New Listing</h2>
                <p className="text-xs text-gray-400 mt-0.5">Create a property listing on behalf of a landlord</p>
              </div>
              <button type="button" onClick={() => { setAddOpen(false); setAddForm(emptyAdd) }}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Landlord */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Landlord <span className="font-normal normal-case">(optional)</span>
                </label>
                <select value={addForm.landlord_id}
                  onChange={e => setAddForm(f => ({ ...f, landlord_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select landlord…</option>
                  {landlords.map(l => (
                    <option key={l.id} value={l.id}>{l.full_name}</option>
                  ))}
                </select>
                {landlords.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No landlords found.</p>
                )}
              </div>

              {/* Admin */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Assign Admin <span className="font-normal normal-case">(optional)</span>
                </label>
                <select value={addForm.assigned_to}
                  onChange={e => setAddForm(f => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select admin…</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>{a.email}</option>
                  ))}
                </select>
                {admins.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No admins found.</p>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Listing Title *</label>
              <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Luxury 3-Bedroom Apartment in Lekki"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* City + State */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">City *</label>
                <input value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Lagos"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">State</label>
                <input value={addForm.state} onChange={e => setAddForm(f => ({ ...f, state: e.target.value }))}
                  placeholder="e.g. Lagos State"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Type + Property Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Listing Type</label>
                <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="rent">For Rent</option>
                  <option value="sale">For Sale</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Property Type</label>
                <select value={addForm.property_type} onChange={e => setAddForm(f => ({ ...f, property_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {['Apartment', 'Villa', 'Duplex', 'Bungalow', 'Studio', 'Office', 'Shop', 'Land', 'Townhouse'].map(t =>
                    <option key={t} value={t}>{t}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Price + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Price (₦) *</label>
                <input type="number" min="0" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. 2500000"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Status</label>
                <select value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="available">Available</option>
                  <option value="taken">Taken</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="under_negotiation">Under Negotiation</option>
                </select>
              </div>
            </div>

            {/* Bedrooms + Bathrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Bedrooms</label>
                <input type="number" min="0" value={addForm.bedrooms} onChange={e => setAddForm(f => ({ ...f, bedrooms: e.target.value }))}
                  placeholder="e.g. 3"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Bathrooms</label>
                <input type="number" min="0" value={addForm.bathrooms} onChange={e => setAddForm(f => ({ ...f, bathrooms: e.target.value }))}
                  placeholder="e.g. 2"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
              <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Brief description of the property…"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* ── Photos ── */}
            <div className="border border-gray-100 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                <ImagePlus className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Photos</h2>
                <span className="ml-auto text-xs text-gray-400">First photo will be the cover</span>
              </div>

              {imagePreviews.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    New photos to upload ({imagePreviews.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i}
                        onClick={() => setCoverIdx(i)}
                        className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${i === coverIdx ? 'border-blue-600' : 'border-gray-200'
                          }`}>
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {i === coverIdx && (
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-blue-600 rounded-md text-[9px] font-black text-white uppercase tracking-wide">Cover</div>
                        )}
                        <button type="button"
                          onClick={e => { e.stopPropagation(); removeNewImage(i) }}
                          className="absolute top-1 right-1 w-6 h-6 bg-white/90 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center text-gray-700 transition-colors opacity-0 group-hover:opacity-100">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {imagePreviews.length > 1 && (
                    <p className="text-xs text-gray-400 mt-2 text-center">Click a photo to set it as the cover</p>
                  )}
                </div>
              )}

              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:text-blue-600 transition-all">
                <ImagePlus className="w-7 h-7" />
                <div className="text-center">
                  <p className="text-sm font-semibold">Click to add photos</p>
                  <p className="text-xs mt-0.5">JPG, PNG or WEBP · Max 10MB each</p>
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => addFiles(e.target.files)} />
            </div>
          </div>


          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl shrink-0">
            <button type="button" onClick={() => { setAddOpen(false); setAddForm(emptyAdd) }}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleAddSave} disabled={addSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
              {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {addSaving ? 'Creating…' : 'Create Listing'}
            </button>
          </div>
        </div>
  )
}
    </AuthGuard >
  )
}

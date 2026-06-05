import { useState, useEffect, useRef } from 'react'
import { Link } from 'wouter'
import {
  Building2, Search, LayoutGrid, List,
  MapPin, BedDouble, Bath, Pencil, Trash2, ArrowRight, Plus, Eye,
  CheckCircle, Clock, XCircle, X, Save, Loader2, ImagePlus, Star,
  Wifi, Car, Dumbbell, Waves, Wind, Shield, Zap,
  Droplets, TreePine, UtensilsCrossed, Tv, Lock, Sun, Package,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'

function getCoverImage(p: any): string | null {
  const images = p.property_images ?? []
  const cover = images.find((img: any) => img.is_cover) ?? images[0]
  if (cover?.storage_path) return getSupabaseImageUrl(cover.storage_path)
  return null
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  sale: { label: 'For Sale', cls: 'bg-blue-600 text-white' },
  rent: { label: 'For Rent', cls: 'bg-emerald-500 text-white' },
}

const STATUS_META: Record<string, { label: string; icon: any; cls: string; dot: string }> = {
  available:         { label: 'Available',  icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  taken:             { label: 'Taken',       icon: XCircle,     cls: 'text-red-500 bg-red-50',         dot: 'bg-red-500'     },
  coming_soon:       { label: 'Coming Soon', icon: Clock,       cls: 'text-blue-600 bg-blue-50',       dot: 'bg-blue-500'    },
  under_negotiation: { label: 'Negotiating', icon: Clock,       cls: 'text-amber-600 bg-amber-50',     dot: 'bg-amber-500'   },
}

const AMENITIES = [
  { icon: Wifi, label: 'High-Speed WiFi' },
  { icon: Car, label: 'Parking Space' },
  { icon: Dumbbell, label: 'Gym / Fitness' },
  { icon: Waves, label: 'Swimming Pool' },
  { icon: Wind, label: 'Air Conditioning' },
  { icon: Shield, label: '24/7 Security' },
  { icon: Zap, label: 'Backup Power' },
  { icon: Droplets, label: 'Running Water' },
  { icon: TreePine, label: 'Garden / Lawn' },
  { icon: UtensilsCrossed, label: 'Modern Kitchen' },
  { icon: Tv, label: 'Smart TV' },
  { icon: Lock, label: 'Smart Lock' },
  { icon: Sun, label: 'Solar Panels' },
  { icon: Package, label: 'Storage Room' },
]

type EditForm = { title: string; city: string; price: string; type: string; status: string; bedrooms: string; bathrooms: string; amenities: string[]; latitude: string; longitude: string }
const emptyEdit: EditForm = { title: '', city: '', price: '', type: 'rent', status: 'available', bedrooms: '', bathrooms: '', amenities: [], latitude: '', longitude: '' }

type AddForm = {
  landlord_id: string; title: string; address: string; city: string; state: string
  assigned_to: string
  property_type: string; type: string; status: string
  price: string; bedrooms: string; bathrooms: string; description: string
  amenities: string[]; latitude: string; longitude: string
}
const emptyAdd: AddForm = {
  landlord_id: '', title: '', address: '', city: '', state: '', assigned_to: '',
  property_type: 'Apartment', type: 'rent', status: 'available',
  price: '', bedrooms: '', bathrooms: '', description: '',
  amenities: [], latitude: '', longitude: '',
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
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [authUid, setAuthUid] = useState<string | null>(null)
  // Add modal image state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [coverIdx, setCoverIdx] = useState(0)

  // Edit modal image state
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [editImageFiles, setEditImageFiles] = useState<File[]>([])
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([])
  const [editCoverIdx, setEditCoverIdx] = useState(0)
  const [existingImages, setExistingImages] = useState<any[]>([])
  const [deletingImg, setDeletingImg] = useState<string | null>(null)

  function addFiles(files: FileList | null) {
    if (!files) return
    const valid = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024)
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

  function addEditFiles(files: FileList | null) {
    if (!files) return
    const valid = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024)
    setEditImageFiles(prev => [...prev, ...valid])
    valid.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setEditImagePreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removeEditNewImage(idx: number) {
    setEditImageFiles(prev => prev.filter((_, i) => i !== idx))
    setEditImagePreviews(prev => prev.filter((_, i) => i !== idx))
    if (editCoverIdx >= idx && editCoverIdx > 0) setEditCoverIdx(c => c - 1)
  }

  async function setCoverExisting(id: string) {
    if (!editingProp) return
    const supabase = createClient()
    // clear all covers then set the chosen one
    await supabase.from('property_images').update({ is_cover: false }).eq('property_id', editingProp.id)
    await supabase.from('property_images').update({ is_cover: true }).eq('id', id)
    setExistingImages(imgs => imgs.map(img => ({ ...img, is_cover: img.id === id })))
  }

  async function deleteExistingImage(img: any) {
    setDeletingImg(img.id)
    const supabase = createClient()
    await supabase.storage.from('property-images').remove([img.storage_path])
    await supabase.from('property_images').delete().eq('id', img.id)
    setExistingImages(imgs => imgs.filter(i => i.id !== img.id))
    setDeletingImg(null)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser({ email: user?.email })
      if (user?.id) setAuthUid(user.id)
      if (user?.email) {
        const { data: adminRow } = await supabase
          .from('admins')
          .select('id')
          .eq('email', user.email)
          .single()
        if (adminRow?.id) setCurrentAdminId(adminRow.id)
      }
    })
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
      amenities: p.amenities ?? [],
      latitude: p.latitude ? String(p.latitude) : '',
      longitude: p.longitude ? String(p.longitude) : '',
    })
    setExistingImages(p.property_images ?? [])
    setEditImageFiles([])
    setEditImagePreviews([])
    setEditCoverIdx(0)
  }

  async function handleAddSave() {
    if (!addForm.title.trim() || !addForm.address.trim() || !addForm.city.trim() || !addForm.price) {
      alert('Title, area/neighbourhood, city and price are required.')
      return
    }
    setAddSaving(true)
    const supabase = createClient()

    // 1. Insert property row
    const { data, error } = await supabase
      .from('properties')
      .insert({
        landlord_id: addForm.landlord_id || null,
        assigned_to: addForm.assigned_to || null,
        title: addForm.title.trim(),
        address: addForm.address.trim(),
        city: addForm.city.trim(),
        state: addForm.state.trim() || null,
        property_type: addForm.property_type,
        type: addForm.type,
        status: addForm.status,
        price: Number(addForm.price),
        bedrooms: addForm.bedrooms ? Number(addForm.bedrooms) : null,
        bathrooms: addForm.bathrooms ? Number(addForm.bathrooms) : null,
        description: addForm.description.trim() || null,
        amenities: addForm.amenities,
        latitude: addForm.latitude ? Number(addForm.latitude) : null,
        longitude: addForm.longitude ? Number(addForm.longitude) : null,
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
      const { data: { user: cu } } = await supabase.auth.getUser()
      await Promise.all(
        imageFiles.map(async (file, i) => {
          const ext = file.name.split('.').pop()
          const path = `${cu?.id}/properties/${data.id}/${Date.now()}-${i}.${ext}`

          const { error: upErr } = await supabase.storage
            .from('property-images')
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

    // 3. Fetch fresh property row with images, then update state
    const { data: freshProp } = await supabase
      .from('properties')
      .select('*, landlords(full_name, is_verified), property_images(id, storage_path, is_cover, sort_order)')
      .eq('id', data.id)
      .single()

    setProperties(ps => [freshProp ?? data, ...ps])
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
      amenities: editForm.amenities,
      latitude: editForm.latitude ? Number(editForm.latitude) : null,
      longitude: editForm.longitude ? Number(editForm.longitude) : null,
    }
    await supabase.from('properties').update(patch).eq('id', editingProp.id)

    // Upload any new images
    if (editImageFiles.length > 0) {
      const { data: { user: cu } } = await supabase.auth.getUser()
      const startOrder = existingImages.length
      const noCoverYet = existingImages.every(img => !img.is_cover)
      await Promise.all(
        editImageFiles.map(async (file, i) => {
          const ext = file.name.split('.').pop()
          const path = `${cu?.id}/properties/${editingProp.id}/${Date.now()}-${i}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('property-images')
            .upload(path, file, { upsert: true })
          if (upErr) { console.error('Upload error', upErr); return }
          await supabase.from('property_images').insert({
            property_id: editingProp.id,
            storage_path: path,
            is_cover: noCoverYet && i === editCoverIdx,
            sort_order: startOrder + i,
          })
        })
      )
    }

    // Refresh full property row with images
    const { data: freshProp } = await supabase
      .from('properties')
      .select('*, landlords(full_name, is_verified), property_images(id, storage_path, is_cover, sort_order)')
      .eq('id', editingProp.id)
      .single()

    setProperties(ps => ps.map(p =>
      p.id === editingProp.id ? (freshProp ?? { ...p, ...patch }) : p
    ))
    setEditImageFiles([])
    setEditImagePreviews([])
    setExistingImages([])
    setEditCoverIdx(0)
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
              <button type="button" onClick={() => { setAddForm({ ...emptyAdd, assigned_to: currentAdminId ?? '' }); setAddOpen(true) }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Listing</span>
              </button>
            }
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <div className="grid gap-5 xl:grid-cols-[1.75fr_0.9fr]">
              <div className="space-y-5">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_80px_-40px_rgba(15,23,42,0.18)]">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Property management</p>
                      <h2 className="mt-3 text-3xl font-extrabold text-slate-950">Control listings with clarity</h2>
                      <p className="mt-3 text-sm leading-6 text-slate-500">Find, filter, and manage your portfolio from a polished admin workspace.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Total listings', value: properties.length, accent: 'text-blue-700 bg-blue-500/10' },
                        { label: 'Available', value: available, accent: 'text-emerald-700 bg-emerald-500/10' },
                        { label: 'Taken', value: taken, accent: 'text-rose-700 bg-rose-500/10' },
                      ].map(item => (
                        <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                          <p className={`text-3xl font-extrabold ${item.accent}`}>{item.value}</p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    {STATUS_TABS.map(tab => (
                      <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.key)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${statusFilter === tab.key
                          ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {tab.label}
                        <span className="ml-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">{tab.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 shadow-sm">
                        <Search className="w-4 h-4 text-slate-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                          placeholder="Search properties, neighborhoods, or landlords"
                          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <button type="button" onClick={() => setViewMode('grid')}
                          className={`px-4 py-3 transition ${viewMode === 'grid' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setViewMode('list')}
                          className={`px-4 py-3 transition ${viewMode === 'list' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                      <select value={sort} onChange={e => setSort(e.target.value)}
                        className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="price_asc">Price ↑</option>
                        <option value="price_desc">Price ↓</option>
                      </select>
                    </div>
                  </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(p => {
                  const badge = TYPE_BADGE[p.type] ?? TYPE_BADGE.sale
                  const status = STATUS_META[p.status] ?? STATUS_META.available
                  const StatusIcon = status.icon
                  const cover = getCoverImage(p)
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col">
                      {/* Image */}
                      <div className="relative h-44 overflow-hidden bg-gray-100 shrink-0">
                        {cover ? (
                          <img src={cover} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
                            <Building2 className="w-8 h-8" />
                            <span className="text-xs">No photo</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[11px] font-bold ${badge.cls}`}>{badge.label}</span>
                        {p.featured && <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded-lg">★ Featured</span>}
                        <p className="absolute bottom-3 left-3 text-sm font-extrabold text-white drop-shadow">₦{Number(p.price).toLocaleString()}</p>
                      </div>

                      {/* Body */}
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-semibold text-slate-950 text-sm leading-snug line-clamp-1 flex-1">{p.title}</h3>
                          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${status.cls}`}>
                            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{p.city}{p.landlords?.full_name ? ` · ${p.landlords.full_name}` : ''}</span>
                        </div>

                        {(p.bedrooms != null || p.bathrooms != null) && (
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                            {p.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-gray-400" />{p.bedrooms} Beds</span>}
                            {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-gray-400" />{p.bathrooms} Baths</span>}
                            <span className="ml-auto text-[10px] font-semibold text-gray-400 uppercase">{p.property_type ?? p.type}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-1">
                          <div className="flex items-center gap-0.5">
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
                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
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
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70">
                        <th className="text-left px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property</th>
                        <th className="text-left px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Landlord</th>
                        <th className="text-left px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Price</th>
                        <th className="text-left px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="text-right px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(p => {
                        const badge = TYPE_BADGE[p.type] ?? TYPE_BADGE.sale
                        const status = STATUS_META[p.status] ?? STATUS_META.available
                        const cover = getCoverImage(p)
                        return (
                          <tr key={p.id} className="hover:bg-gray-50/60 transition-colors group">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                                  {cover
                                    ? <img src={cover} alt={p.title} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-gray-300"><Building2 className="w-4 h-4" /></div>
                                  }
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate max-w-[180px]">{p.title}</p>
                                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                                    <MapPin className="w-3 h-3 shrink-0" />{p.city}
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">{p.landlords?.full_name ?? <span className="text-gray-300">—</span>}</td>
                            <td className="px-5 py-3.5 text-sm font-bold text-gray-900 hidden sm:table-cell">₦{Number(p.price).toLocaleString()}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${status.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(p)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <Link href={`/listings/${p.id}`}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
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
          </div>

          <aside className="space-y-5">
            <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/20">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Quick snapshot</p>
              <h3 className="mt-4 text-2xl font-extrabold">Portfolio health</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">See listing trends and recent activity at a glance.</p>
              <div className="mt-6 grid gap-3">
                {[
                  { label: 'Total listings', value: properties.length },
                  { label: 'Available now', value: available },
                  { label: 'Taken off market', value: taken },
                ].map(item => (
                  <div key={item.label} className="rounded-3xl bg-white/5 p-4">
                    <p className="text-sm text-slate-300">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
                  </div>
                ))}
            </div>
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Recent listings</p>
              <div className="mt-4 space-y-3">
                {filtered.slice(0, 3).map(p => (
                  <div key={p.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950 truncate">{p.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{p.city} · ₦{Number(p.price).toLocaleString()}</p>
                    <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_META[p.status]?.cls ?? STATUS_META.available.cls}`}>{STATUS_META[p.status]?.label ?? 'Available'}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>

    {/* Edit modal */}
        {editingProp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Edit Property</h2>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{editingProp.title}</p>
                </div>
                <button onClick={() => { setEditingProp(null); setEditImageFiles([]); setEditImagePreviews([]); setExistingImages([]); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
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

                {/* Amenities */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Amenities</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AMENITIES.map((amenity) => {
                      const Icon = amenity.icon
                      const isSelected = editForm.amenities.includes(amenity.label)
                      return (
                        <button
                          key={amenity.label}
                          type="button"
                          onClick={() => {
                            setEditForm(f => ({
                              ...f,
                              amenities: isSelected
                                ? f.amenities.filter(a => a !== amenity.label)
                                : [...f.amenities, amenity.label]
                            }))
                          }}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="text-xs font-medium">{amenity.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Latitude</label>
                    <input type="number" step="any" value={editForm.latitude}
                      onChange={e => setEditForm(f => ({ ...f, latitude: e.target.value }))}
                      placeholder="e.g. 6.5244"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Longitude</label>
                    <input type="number" step="any" value={editForm.longitude}
                      onChange={e => setEditForm(f => ({ ...f, longitude: e.target.value }))}
                      placeholder="e.g. 3.3792"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all" />
                  </div>
                </div>
              </div>
              {/* Photos */}
              <div className="px-6 pb-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <ImagePlus className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-gray-900">Photos</h3>
                </div>

                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Current photos ({existingImages.length})
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {existingImages.map(img => (
                        <div key={img.id}
                          onClick={() => setCoverExisting(img.id)}
                          className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${img.is_cover ? 'border-blue-600' : 'border-gray-200'}`}>
                          <img src={getSupabaseImageUrl(img.storage_path)} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                          {img.is_cover && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-blue-600 rounded-md text-[9px] font-black text-white uppercase tracking-wide">Cover</div>
                          )}
                          <button type="button"
                            onClick={e => { e.stopPropagation(); deleteExistingImage(img) }}
                            disabled={deletingImg === img.id}
                            className="absolute top-1 right-1 w-6 h-6 bg-white/90 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center text-gray-700 transition-colors opacity-0 group-hover:opacity-100">
                            {deletingImg === img.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Click a photo to set it as cover · hover to delete</p>
                  </div>
                )}

                {/* New images to upload */}
                {editImagePreviews.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      New photos to upload ({editImagePreviews.length})
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {editImagePreviews.map((src, i) => (
                        <div key={i} onClick={() => setEditCoverIdx(i)}
                          className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${i === editCoverIdx && existingImages.every(img => !img.is_cover) ? 'border-blue-600' : 'border-gray-200'}`}>
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                          {i === editCoverIdx && existingImages.every(img => !img.is_cover) && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-blue-600 rounded-md text-[9px] font-black text-white uppercase tracking-wide">Cover</div>
                          )}
                          <button type="button"
                            onClick={e => { e.stopPropagation(); removeEditNewImage(i) }}
                            className="absolute top-1 right-1 w-6 h-6 bg-white/90 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center text-gray-700 transition-colors opacity-0 group-hover:opacity-100">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button type="button" onClick={() => editFileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:text-blue-600 transition-all">
                  <ImagePlus className="w-6 h-6" />
                  <p className="text-sm font-semibold">Add more photos</p>
                  <p className="text-xs">JPG, PNG or WEBP · Max 10MB each</p>
                </button>
                <input ref={editFileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => addEditFiles(e.target.files)} />
              </div>
              </div> {/* end scrollable */}

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
                <button onClick={() => { setEditingProp(null); setEditImageFiles([]); setEditImagePreviews([]); setExistingImages([]); }}
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

            {/* ── Header ── */}
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

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Landlord */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Landlord <span className="font-normal normal-case">(optional)</span>
                </label>
                <select value={addForm.landlord_id}
                  onChange={e => setAddForm(f => ({ ...f, landlord_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select landlord…</option>
                  {landlords.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </select>
                {landlords.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No landlords found.</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Listing Title *</label>
                <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Luxury 3-Bedroom Apartment in Lekki"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Area / Neighbourhood */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Area / Neighbourhood *</label>
                <input value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. Lekki Phase 1, Maitama, GRA"
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

              {/* Listing Type + Property Type */}
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

              {/* Amenities */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Amenities</label>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITIES.map((amenity) => {
                    const Icon = amenity.icon
                    const isSelected = addForm.amenities.includes(amenity.label)
                    return (
                      <button
                        key={amenity.label}
                        type="button"
                        onClick={() => {
                          setAddForm(f => ({
                            ...f,
                            amenities: isSelected
                              ? f.amenities.filter(a => a !== amenity.label)
                              : [...f.amenities, amenity.label]
                          }))
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-xs font-medium">{amenity.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Latitude</label>
                  <input type="number" step="any" value={addForm.latitude}
                    onChange={e => setAddForm(f => ({ ...f, latitude: e.target.value }))}
                    placeholder="e.g. 6.5244"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Longitude</label>
                  <input type="number" step="any" value={addForm.longitude}
                    onChange={e => setAddForm(f => ({ ...f, longitude: e.target.value }))}
                    placeholder="e.g. 3.3792"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-3">Optional: Add coordinates for map location. Find on <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Maps</a>.</p>

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
                        <div key={i} onClick={() => setCoverIdx(i)}
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

                <button type="button" onClick={() => fileInputRef.current?.click()}
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

            </div> {/* ← end scrollable body */}

            {/* ── Footer ── */}
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

          </div> {/* ← end modal card */}
        </div>
      )}
    </AuthGuard >
  )
}

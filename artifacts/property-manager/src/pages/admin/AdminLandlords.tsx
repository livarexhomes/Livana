import { useState, useEffect } from 'react'
import {
  Users, Search, SlidersHorizontal, Mail, Phone, MapPin,
  Building2, Pencil, Trash2, UserPlus,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  approved: { label: 'Verified',  bg: 'bg-green-100',  text: 'text-green-700' },
  pending:  { label: 'Pending',   bg: 'bg-amber-100',  text: 'text-amber-700' },
  rejected: { label: 'Rejected',  bg: 'bg-red-100',    text: 'text-red-600'   },
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500',
]
function avatarColor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export default function AdminLandlords() {
  const [user, setUser]         = useState<{ email?: string } | null>(null)
  const [clients, setClients]   = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState('newest')
  const [processing, setProcessing] = useState<string | null>(null)

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

  useEffect(() => {
    let list = [...clients]
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
  }, [search, sort, clients])

  async function handleDelete(id: string) {
    if (!confirm('Remove this client? This cannot be undone.')) return
    setProcessing(id)
    const supabase = createClient()
    await supabase.from('landlords').delete().eq('id', id)
    setClients(cs => cs.filter(c => c.id !== id))
    setProcessing(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  return (
    <AuthGuard require="admin">
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Top bar ── */}
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-5 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Clients</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage your client relationships</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              <UserPlus className="w-4 h-4" />
              Add Client
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
            {/* ── Search & Filters ── */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {/* ── Content ── */}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  {search ? 'No clients match your search.' : 'No clients found.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {filtered.map(l => {
                  const badge = STATUS_BADGE[l.status] ?? STATUS_BADGE.pending
                  const initials = getInitials(l.full_name)
                  const bgColor = avatarColor(l.full_name)
                  const since = new Date(l.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                  })
                  return (
                    <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                      {/* ── Card Header ── */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center shrink-0 shadow-sm`}>
                          <span className="text-sm font-bold text-white">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-base leading-tight truncate">{l.full_name}</p>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            title="Edit"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(l.id)}
                            disabled={processing === l.id}
                            title="Delete"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* ── Contact Info ── */}
                      <div className="space-y-2 mb-4">
                        {l.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{l.email}</span>
                          </div>
                        )}
                        {l.whatsapp && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{l.whatsapp}</span>
                          </div>
                        )}
                        {l.city && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{l.city}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{l.property_count} {l.property_count === 1 ? 'Property' : 'Properties'}</span>
                        </div>
                      </div>

                      {/* ── Footer ── */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">Client since {since}</p>
                        <button
                          onClick={async () => {
                            if (l.status === 'pending') {
                              setProcessing(l.id)
                              const supabase = createClient()
                              await supabase.from('landlords').update({ status: 'approved' }).eq('id', l.id)
                              setClients(cs => cs.map(c => c.id === l.id ? { ...c, status: 'approved' } : c))
                              setProcessing(null)
                            }
                          }}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-40"
                          disabled={processing === l.id}
                        >
                          {l.status === 'pending' ? 'Approve →' : 'View Profile'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

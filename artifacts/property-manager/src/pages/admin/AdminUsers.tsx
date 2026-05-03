import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, Mail, Phone, Eye, Pencil, Trash2, Plus, Shield } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const ROLE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  admin:  { label: 'Admin',  bg: 'bg-violet-100', text: 'text-violet-700' },
  agent:  { label: 'Agent',  bg: 'bg-cyan-100',   text: 'text-cyan-700'  },
  editor: { label: 'Editor', bg: 'bg-amber-100',  text: 'text-amber-700' },
}

const ALL_PERMISSIONS = ['Manage Users', 'Manage Properties', 'Manage Clients', 'Manage Payments', 'View Reports', 'Manage Settings']

const SAMPLE_USERS = [
  {
    id: '1',
    name: 'Tunde Adeyemi',
    role: 'admin',
    status: 'active',
    email: 'tunde@livana.com',
    phone: '+234 801 234 5678',
    permissions: ['Manage Users', 'Manage Properties', 'Manage Clients', 'Manage Payments'],
    last_active: '03/05/2026, 09:15:00',
    initials: 'TA',
    color: 'bg-violet-500',
  },
  {
    id: '2',
    name: 'Ngozi Okafor',
    role: 'agent',
    status: 'active',
    email: 'ngozi@livana.com',
    phone: '+234 802 345 6789',
    permissions: ['Manage Properties', 'Manage Clients'],
    last_active: '02/05/2026, 14:30:00',
    initials: 'NO',
    color: 'bg-cyan-500',
  },
  {
    id: '3',
    name: 'Emeka Eze',
    role: 'agent',
    status: 'active',
    email: 'emeka@livana.com',
    phone: '+234 803 456 7890',
    permissions: ['Manage Properties', 'View Reports'],
    last_active: '01/05/2026, 11:00:00',
    initials: 'EE',
    color: 'bg-emerald-500',
  },
  {
    id: '4',
    name: 'Amaka Obi',
    role: 'editor',
    status: 'inactive',
    email: 'amaka@livana.com',
    phone: '+234 804 567 8901',
    permissions: ['Manage Properties'],
    last_active: '15/04/2026, 16:45:00',
    initials: 'AO',
    color: 'bg-rose-500',
  },
  {
    id: '5',
    name: 'Seun Balogun',
    role: 'agent',
    status: 'active',
    email: 'seun@livana.com',
    phone: '+234 805 678 9012',
    permissions: ['Manage Clients', 'View Reports'],
    last_active: '03/05/2026, 08:00:00',
    initials: 'SB',
    color: 'bg-blue-500',
  },
]

export default function AdminUsers() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const [users, setUsers] = useState(SAMPLE_USERS)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
  }, [])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.name.toLowerCase().includes(q) || u.email.includes(q) || u.role.includes(q)
  })

  function handleDelete(id: string) {
    if (!confirm('Remove this user?')) return
    setUsers(us => us.filter(u => u.id !== id))
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
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Users</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage system users and their permissions</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              <Plus className="w-4 h-4" />
              Add User
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
                  placeholder="Search users..."
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
                <option value="recent">Most Recent</option>
                <option value="name">Name A–Z</option>
                <option value="role">By Role</option>
              </select>
            </div>

            {/* ── User List ── */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <p className="text-gray-500 font-medium">No users match your search.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(u => {
                  const role = ROLE_BADGE[u.role] ?? ROLE_BADGE.agent
                  return (
                    <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                      {/* ── Row 1: Avatar + Name + Badges + Actions ── */}
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full ${u.color} flex items-center justify-center shrink-0 shadow-sm`}>
                          <span className="text-sm font-bold text-white">{u.initials}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-base font-bold text-gray-900 leading-tight">{u.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${role.bg} ${role.text}`}>
                                  {role.label}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  u.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                                </span>
                              </div>
                            </div>

                            {/* Action icons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button title="View" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button title="Edit" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(u.id)} title="Delete"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Contact */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            <span className="flex items-center gap-1.5 text-sm text-gray-500">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              {u.email}
                            </span>
                            <span className="flex items-center gap-1.5 text-sm text-gray-500">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              {u.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Row 2: Permissions ── */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Permissions</p>
                        <div className="flex flex-wrap gap-2">
                          {u.permissions.map(perm => (
                            <span key={perm}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-gray-200 rounded-lg text-xs text-gray-600 font-medium">
                              <Shield className="w-3 h-3 text-gray-400" />
                              {perm}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-3">Last active: {u.last_active}</p>
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

import { useState, useEffect } from 'react'
import { Search, Mail, Phone, Shield, Plus, UserCog, Users, Activity } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const ROLE_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  admin:  { label: 'Admin',  bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  agent:  { label: 'Agent',  bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  editor: { label: 'Editor', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
}

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600', 'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',  'from-indigo-400 to-indigo-600',
]

const SAMPLE_USERS = [
  {
    id: '1', name: 'Tunde Adeyemi', role: 'admin', status: 'active',
    email: 'tunde@livana.com', phone: '+234 801 234 5678',
    permissions: ['Manage Users', 'Manage Properties', 'Manage Clients', 'Manage Payments'],
    last_active: '3 May 2026, 09:15',
  },
  {
    id: '2', name: 'Ngozi Okafor', role: 'agent', status: 'active',
    email: 'ngozi@livana.com', phone: '+234 802 345 6789',
    permissions: ['Manage Properties', 'Manage Clients'],
    last_active: '2 May 2026, 14:30',
  },
  {
    id: '3', name: 'Emeka Eze', role: 'agent', status: 'active',
    email: 'emeka@livana.com', phone: '+234 803 456 7890',
    permissions: ['Manage Properties', 'View Reports'],
    last_active: '1 May 2026, 11:00',
  },
  {
    id: '4', name: 'Amaka Obi', role: 'editor', status: 'inactive',
    email: 'amaka@livana.com', phone: '+234 804 567 8901',
    permissions: ['Manage Properties'],
    last_active: '15 Apr 2026, 16:45',
  },
  {
    id: '5', name: 'Seun Balogun', role: 'agent', status: 'active',
    email: 'seun@livana.com', phone: '+234 805 678 9012',
    permissions: ['Manage Clients', 'View Reports'],
    last_active: '3 May 2026, 08:00',
  },
]

function avatarGrad(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

export default function AdminUsers() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [users, setUsers] = useState(SAMPLE_USERS)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
  }, [])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.includes(q) || u.role.includes(q)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const activeCount = users.filter(u => u.status === 'active').length

  const ROLE_TABS = [
    { key: 'all',    label: 'All Users', count: users.length },
    { key: 'admin',  label: 'Admins',    count: users.filter(u => u.role === 'admin').length },
    { key: 'agent',  label: 'Agents',    count: users.filter(u => u.role === 'agent').length },
    { key: 'editor', label: 'Editors',   count: users.filter(u => u.role === 'editor').length },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex min-h-screen bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Team Members</h1>
              <p className="text-sm text-gray-400 mt-0.5">{users.length} users · {activeCount} active</p>
            </div>
            <button type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Invite User</span>
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Members', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Active Now',    value: activeCount, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Permissions',  value: '6 types', icon: Shield, color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${s.color}`} strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-xl font-extrabold text-gray-900 leading-tight">{s.value}</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Role tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {ROLE_TABS.map(tab => (
                <button key={tab.key} type="button" onClick={() => setRoleFilter(tab.key)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    roleFilter === tab.key
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}>
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                    roleFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, role…"
                className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <UserCog className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No users match your search.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Member</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Contact</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden lg:table-cell">Last Active</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Permissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(u => {
                      const role = ROLE_META[u.role] ?? ROLE_META.agent
                      const grad = avatarGrad(u.name)
                      const initials = u.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                      const isExpanded = expanded === u.id
                      return (
                        <>
                          <tr key={u.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                            onClick={() => setExpanded(isExpanded ? null : u.id)}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
                                  <span className="text-xs font-bold text-white">{initials}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm leading-tight">{u.name}</p>
                                  <p className="text-[11px] text-gray-400 mt-0.5 md:hidden">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Mail className="w-3 h-3 text-gray-400" />{u.email}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Phone className="w-3 h-3 text-gray-400" />{u.phone}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${role.bg} ${role.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${role.dot}`} />
                                {role.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden sm:table-cell">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                {u.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-400 hidden lg:table-cell">{u.last_active}</td>
                            <td className="px-5 py-4 text-right">
                              <button type="button"
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                {isExpanded ? 'Hide ↑' : `${u.permissions.length} perms ↓`}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${u.id}-expand`}>
                              <td colSpan={6} className="px-5 py-4 bg-slate-50/60 border-b border-gray-100">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Permissions</p>
                                  <div className="flex flex-wrap gap-2">
                                    {u.permissions.map(perm => (
                                      <span key={perm} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-medium shadow-sm">
                                        <Shield className="w-3 h-3 text-blue-500" />
                                        {perm}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

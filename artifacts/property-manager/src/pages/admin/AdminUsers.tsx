import { useState, useEffect, Fragment } from 'react'
import {
  Search, Mail, Phone, Shield, Plus, UserCog, Users, Activity,
  X, Trash2, CheckCircle, AlertCircle, Pencil, ToggleLeft, ToggleRight,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

type Role = 'admin' | 'agent' | 'editor'

type TeamUser = {
  id: string
  name: string
  role: Role
  status: 'active' | 'inactive'
  email: string
  phone: string
  permissions: string[]
  created_at: string
}

const ALL_PERMISSIONS = [
  'Manage Users',
  'Manage Properties',
  'Manage Clients',
  'Manage Projects',
  'View Reports',
  'Manage Payments',
  'Manage Settings',
]

const ROLE_META: Record<Role, { label: string; bg: string; text: string; dot: string }> = {
  admin:  { label: 'Admin',  bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  agent:  { label: 'Agent',  bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  editor: { label: 'Editor', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
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

const STORAGE_KEY = 'livana_team_users'

function loadUsers(): TeamUser[] {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) } catch {}
  return []
}
function saveUsers(users: TeamUser[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)) } catch {}
}

const EMPTY_FORM = { name: '', email: '', phone: '', role: 'agent' as Role, permissions: [] as string[] }

export default function AdminUsers() {
  const [user, setUser]     = useState<{ email?: string } | null>(null)
  const [users, setUsers]   = useState<TeamUser[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<TeamUser | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    setUsers(loadUsers())
  }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  function openInvite() {
    setEditing(null); setForm(EMPTY_FORM); setModalOpen(true)
  }
  function openEdit(u: TeamUser) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, phone: u.phone, role: u.role, permissions: [...u.permissions] })
    setModalOpen(true)
  }

  function togglePerm(perm: string) {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }))
  }

  function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      showToast('Name and email are required.', false); return
    }
    setSaving(true)
    let updated: TeamUser[]
    if (editing) {
      updated = users.map(u => u.id === editing.id
        ? { ...u, name: form.name, email: form.email, phone: form.phone, role: form.role, permissions: form.permissions }
        : u)
    } else {
      const newUser: TeamUser = {
        id: crypto.randomUUID(),
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        permissions: form.permissions,
        status: 'active',
        created_at: new Date().toISOString(),
      }
      updated = [newUser, ...users]
    }
    setUsers(updated)
    saveUsers(updated)
    setSaving(false)
    setModalOpen(false)
    showToast(editing ? 'Team member updated.' : 'Team member invited.')
  }

  function handleDelete() {
    if (!deleteId) return
    const updated = users.filter(u => u.id !== deleteId)
    setUsers(updated); saveUsers(updated)
    setDeleteId(null); showToast('Team member removed.')
  }

  function toggleStatus(id: string) {
    const updated = users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' as const : 'active' as const } : u)
    setUsers(updated); saveUsers(updated)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (!q || u.name.toLowerCase().includes(q) || u.email.includes(q) || u.role.includes(q))
      && (roleFilter === 'all' || u.role === roleFilter)
  })

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const activeCount = users.filter(u => u.status === 'active').length

  const ROLE_TABS = [
    { key: 'all',    label: 'All',     count: users.length },
    { key: 'admin',  label: 'Admins',  count: users.filter(u => u.role === 'admin').length },
    { key: 'agent',  label: 'Agents',  count: users.filter(u => u.role === 'agent').length },
    { key: 'editor', label: 'Editors', count: users.filter(u => u.role === 'editor').length },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Team Members"
            subtitle={`${users.length} members · ${activeCount} active`}
            action={
              <button type="button" onClick={openInvite}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Invite Member</span>
              </button>
            }
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
            {toast && (
              <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
                {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {toast.msg}
              </div>
            )}

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Members', value: users.length, icon: Users,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
                { label: 'Active Now',    value: activeCount,  icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Permissions',  value: `${ALL_PERMISSIONS.length} types`, icon: Shield, color: 'text-violet-600', bg: 'bg-violet-50' },
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
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
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

            {/* Empty state */}
            {users.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
                <UserCog className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-800 font-bold text-base mb-1">No team members yet</p>
                <p className="text-sm text-gray-400 mb-5">Invite team members and assign their roles and permissions.</p>
                <button type="button" onClick={openInvite}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
                  <Plus className="w-4 h-4" /> Invite First Member
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <UserCog className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No members match your search.</p>
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
                      <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(u => {
                      const role = ROLE_META[u.role] ?? ROLE_META.agent
                      const grad = avatarGrad(u.name)
                      const initials = u.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                      const isExpanded = expanded === u.id
                      return (
                        <Fragment key={u.id}>
                          <tr className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
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
                                {u.phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Phone className="w-3 h-3 text-gray-400" />{u.phone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${role.bg} ${role.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${role.dot}`} />
                                {role.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden sm:table-cell">
                              <button type="button" onClick={() => toggleStatus(u.id)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                  u.status === 'active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}>
                                {u.status === 'active'
                                  ? <ToggleRight className="w-3.5 h-3.5" />
                                  : <ToggleLeft className="w-3.5 h-3.5" />}
                                {u.status === 'active' ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={() => setExpanded(isExpanded ? null : u.id)}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                                  {isExpanded ? 'Hide' : `${u.permissions.length} perms`}
                                </button>
                                <button type="button" onClick={() => openEdit(u)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => setDeleteId(u.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="px-5 py-4 bg-slate-50/60 border-b border-gray-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Permissions</p>
                                <div className="flex flex-wrap gap-2">
                                  {ALL_PERMISSIONS.map(perm => {
                                    const has = u.permissions.includes(perm)
                                    return (
                                      <span key={perm} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                        has ? 'bg-white border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-400'
                                      }`}>
                                        <Shield className={`w-3 h-3 ${has ? 'text-blue-500' : 'text-gray-300'}`} />
                                        {perm}
                                      </span>
                                    )
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Invite / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Team Member' : 'Invite Team Member'}</h2>
              <button type="button" onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Tunde Adeyemi"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Email Address *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="name@livana.com"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+234 800 000 0000"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                    <option value="admin">Admin</option>
                    <option value="agent">Agent</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Permissions</p>
                <div className="grid grid-cols-1 gap-2">
                  {ALL_PERMISSIONS.map(perm => {
                    const has = form.permissions.includes(perm)
                    return (
                      <label key={perm}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          has ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${
                          has ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {has && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${has ? 'text-blue-800' : 'text-gray-700'}`}>{perm}</p>
                        </div>
                        <input type="checkbox" checked={has} onChange={() => togglePerm(perm)} className="sr-only" />
                      </label>
                    )
                  })}
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
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Remove this member?</h3>
            <p className="text-sm text-gray-500 mb-6">They will lose access to all admin features.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  )
}

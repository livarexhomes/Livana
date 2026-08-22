import { useState, useEffect, useCallback, useRef, type ElementType, type ReactNode } from 'react'
import {
  Building2, Bell, Shield, Globe, Save, CreditCard,
  CheckCircle, Mail, Phone, MapPin, User, Wifi,
  Lock, Timer, BellRing, Zap, Image,
  FileText, DollarSign, Hash, Users, BarChart3,
  ArrowUpRight, AlertCircle, ShieldCheck, UserPlus,
  Eye, EyeOff, Send, TestTube, Trash2, Plus,
  Key, Smartphone, Webhook, Loader2, Check, ChevronRight, X, FileDown, Clock,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { MobileSidebarProvider } from '@/components/ui/mobile-admin'
import { createClient } from '../../lib/supabase'
import { invalidateFeeConfig } from '../../lib/fees'
import { notifyListingRulesChange } from '../../lib/settings-store'
import { invalidatePlatformSettings } from '../../lib/platform-settings'
import {
  getSupportHours, invalidateSupportHours, DEFAULT_SUPPORT_HOURS, WEEKDAY_LABELS,
  type SupportHours, type DayHours,
} from '../../lib/support-hours'

const SECTIONS = [
  { id: 'platform',      label: 'Platform',       icon: Building2  },
  { id: 'notifications', label: 'Notifications',   icon: Bell       },
  { id: 'email',         label: 'Email (Resend)',  icon: Mail       },
  { id: 'security',      label: 'Security & PIN',  icon: Shield     },
  { id: 'history',       label: 'Audit History',   icon: FileText   },
  { id: 'agents',        label: 'Agents',           icon: Users      },
  { id: 'support_hours', label: 'Support Hours',    icon: Clock      },
  { id: 'listing',       label: 'Listing Rules',    icon: Globe      },
]

interface PlatformSettings {
  name: string
  tagline: string
  email: string
  phone: string
  address: string
  currency: string
  country: string
  website: string
}

interface NotificationSettings {
  newLandlord: boolean
  newEnquiry: boolean
  newProperty: boolean
  smsAlerts: boolean
  adminEmail: string
}

interface SecuritySettings {
  twoFactorAuth: boolean
  sessionTimeout: number
  loginNotifications: boolean
  ipAllowlist: boolean
  allowedIps: string[]
}

interface ListingSettings {
  autoApprove: boolean
  maxPerLandlord: number
  requireImages: boolean
  requireDescription: boolean
  allowNegotiation: boolean
  agencyFeePercent: number
}

interface EmailConfig {
  fromEmail: string
  fromName: string
  enabled: boolean
  resendApiKey: string
}

// ── UI Components ────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange, loading = false, disabled = false }: { enabled: boolean; onChange: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={loading || disabled}
      onClick={e => { e.stopPropagation(); onChange() }}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      {loading ? (
        <Loader2 className="absolute top-1 left-1 w-4 h-4 text-white animate-spin" />
      ) : (
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      )}
    </button>
  )
}

function FieldInput({
  label, value, onChange, icon: Icon, type = 'text', placeholder = '',
  mono = false, disabled = false, error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  icon: ElementType
  type?: string
  placeholder?: string
  mono?: boolean
  disabled?: boolean
  error?: string
}) {
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.14em] text-gray-400 uppercase mb-1.5">{label}</label>
      <div className={`flex items-center gap-2.5 border rounded-lg px-3 py-2.5 bg-white transition-all ${
        error ? 'border-red-300 ring-2 ring-red-100' :
        focused ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-gray-200 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${error ? 'text-red-400' : focused ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={1.8} />
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          className={`flex-1 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none bg-transparent ${mono ? 'font-mono' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function ToggleRow({
  label, desc, enabled, onChange, icon: Icon, tag, loading = false, disabled = false,
}: {
  label: string
  desc: string
  enabled: boolean
  onChange: () => void
  icon?: ElementType
  tag?: string
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
        disabled ? 'bg-gray-50/60 border-gray-200 opacity-70 cursor-not-allowed'
        : enabled
          ? 'bg-blue-50/40 border-blue-100'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={!loading && !disabled ? onChange : undefined}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
          }`}>
            <Icon className="w-4 h-4" strokeWidth={1.8} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${enabled ? 'text-gray-900' : 'text-gray-700'}`}>{label}</span>
            {tag && (
              <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${
                tag === 'live' ? 'bg-green-100 text-green-700' :
                tag === 'test' ? 'bg-amber-100 text-amber-700' :
                tag === 'soon' ? 'bg-blue-100 text-blue-700' :
                tag === 'on' ? 'bg-blue-100 text-blue-700' :
                tag === 'off' ? 'bg-gray-100 text-gray-500' :
                'bg-gray-100 text-gray-400'
              }`}>{tag}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Toggle enabled={enabled} onChange={onChange} loading={loading} disabled={disabled} />
        {!disabled && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
      </div>
    </div>
  )
}

function SectionTitle({ title, sub, action, icon: Icon }: { title: string; sub: string; action?: ReactNode; icon?: ElementType }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-slate-500" strokeWidth={1.8} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-extrabold text-gray-900 tracking-tight">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-gray-100 my-6" />
}

function StatusBadge({ status, text }: { status: 'success' | 'error' | 'warning' | 'neutral'; text: string }) {
  const styles = {
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    neutral: 'bg-gray-50 text-gray-600 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
      {status === 'success' && <Check className="w-3 h-3" />}
      {status === 'error' && <X className="w-3 h-3" />}
      {status === 'warning' && <AlertCircle className="w-3 h-3" />}
      {text}
    </span>
  )
}

// ── Agents (support roster) ───────────────────────────────────────────────────

interface AgentSettingsRow {
  id: string
  user_id: string
  name: string
  email: string
  role: 'agent' | 'support' | 'admin'
  active: boolean
  created_at: string
}

/**
 * Add / invite support agents. This is the "Add a support agent" section that
 * used to live on the Support page — it now lives in Settings → Agents.
 */
function AgentSettingsSection({ currentUserId }: { currentUserId?: string }) {
  const [agents, setAgents] = useState<AgentSettingsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [mode, setMode] = useState<'create' | 'invite'>('create')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let mounted = true
    const supabase = createClient()
    supabase.from('agents').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!mounted) return
        setAgents((data as AgentSettingsRow[]) ?? [])
        setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  async function reloadAgents() {
    const supabase = createClient()
    const { data } = await supabase.from('agents').select('*').order('created_at', { ascending: false })
    setAgents((data as AgentSettingsRow[]) ?? [])
  }

  /** Attach the caller's session token so the API can verify they're an admin. */
  async function authedFetch(url: string, body: unknown) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  async function addAgent() {
    if (adding) return
    if (!newEmail.trim() || (mode === 'create' && !newPassword.trim())) {
      setMsg({ ok: false, text: mode === 'create' ? 'Email and password are required' : 'Email is required' })
      return
    }
    setAdding(true)
    setMsg(null)
    try {
      const res = await authedFetch('/api/manage-support-agent',
        mode === 'create'
          ? { action: 'create', email: newEmail.trim(), password: newPassword, name: newName.trim() || undefined }
          : { action: 'invite', email: newEmail.trim(), name: newName.trim() || undefined },
      )
      const data = await res.json()
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || 'Failed to add agent' })
        return
      }
      await reloadAgents()
      setNewEmail('')
      setNewName('')
      setNewPassword('')
      setMsg({ ok: true, text: mode === 'create' ? 'Agent account created. They can now log in to /admin.' : 'Invitation sent to their email.' })
    } catch (err) {
      setMsg({ ok: false, text: String(err) })
    } finally {
      setAdding(false)
    }
  }

  async function toggleActive(agent: AgentSettingsRow) {
    const supabase = createClient()
    await supabase.from('agents').update({ active: !agent.active }).eq('id', agent.id)
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, active: !agent.active } : a))
  }

  async function removeAgent(agent: AgentSettingsRow) {
    const res = await authedFetch('/api/manage-support-agent', { action: 'remove', userId: agent.user_id })
    const data = await res.json()
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || 'Could not remove agent' })
      return
    }
    setAgents(prev => prev.filter(a => a.id !== agent.id))
    setMsg({ ok: true, text: 'Agent removed.' })
  }

  return (
    <div>
      <SectionTitle
        title="Support Agents"
        sub="Create brand-new agent accounts, or invite existing Livarex accounts as agents."
        icon={Users}
      />

      {/* Add / invite form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            <UserPlus className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Add a support agent</p>
            <p className="text-xs text-gray-400">Create a new account or invite an existing user</p>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100">
          <button onClick={() => setMode('create')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'create' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Create account
          </button>
          <button onClick={() => setMode('invite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'invite' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Invite existing user
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldInput label="Display name" value={newName} onChange={setNewName} icon={User} placeholder="e.g. Adaeze Obi" />
          <FieldInput label="Email" value={newEmail} onChange={setNewEmail} icon={Mail} placeholder="agent@livarex.com.ng" type="email" />
          {mode === 'create' && (
            <div className="sm:col-span-2">
              <FieldInput label="Temporary password" value={newPassword} onChange={setNewPassword} icon={Key} placeholder="They can change this after first login" type="password" />
            </div>
          )}
        </div>

        {msg && (
          <p className={`mt-3 text-xs font-medium ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button onClick={addAgent} disabled={adding || !newEmail.trim() || (mode === 'create' && !newPassword.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} {mode === 'create' ? 'Create account' : 'Send invite'}
          </button>
          <p className="text-xs text-gray-400">Agents can log in at /admin and handle support chats.</p>
        </div>
      </div>

      {/* Roster */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Agent roster</p>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{agents.length} total</span>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-center text-xs text-gray-400">Loading agents…</div>
        ) : agents.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShieldCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No agents yet. Create one above, or the admin auto-registers on login.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {agents.map(agent => {
              const isAdminRow = agent.role === 'admin' || agent.user_id === currentUserId
              return (
                <div key={agent.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isAdminRow ? 'bg-gradient-to-br from-indigo-600 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                    <span className="text-xs font-bold text-white">{agent.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{agent.name}</p>
                      {isAdminRow ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-purple-50 text-purple-700">
                          Admin
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${agent.active ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {agent.role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{agent.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isAdminRow ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600">
                        <Lock className="w-3 h-3" /> Protected
                      </span>
                    ) : (
                      <>
                        <button onClick={() => toggleActive(agent)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors ${
                            agent.active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}>
                          {agent.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => removeAgent(agent)} title="Remove agent"
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors">
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

// Sections that only the true admin can access
const ADMIN_ONLY_SECTIONS = new Set(['email', 'security', 'history', 'agents'])

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`livarex-admin-pin:${pin}`)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function AdminSettings() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [isAgent, setIsAgent] = useState(false)
  const [active, setActive] = useState('platform')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [testEmailResult, setTestEmailResult] = useState<{success?: boolean; message?: string} | null>(null)

  // ── Admin PIN state ──────────────────────────────────────────────────────────
  const [adminPinHash, setAdminPinHash]     = useState<string | null>(null)
  const [pinVerified, setPinVerified]       = useState(false)      // cleared on tab nav away
  const [showPinGate, setShowPinGate]       = useState(false)
  const [pendingTab, setPendingTab]         = useState<string | null>(null)
  const [pinInput, setPinInput]             = useState('')
  const [pinError, setPinError]             = useState('')
  // PIN setup (inside Security section)
  const [showPinSetup, setShowPinSetup]     = useState(false)
  const [newPin, setNewPin]                 = useState('')
  const [confirmPin, setConfirmPin]         = useState('')
  const [pinSetupMsg, setPinSetupMsg]       = useState<{ ok: boolean; text: string } | null>(null)
  const [savingPin, setSavingPin]           = useState(false)

  const [platform, setPlatform] = useState<PlatformSettings>({
    name: 'Livana Property Manager',
    tagline: "Nigeria's most trusted property platform",
    email: 'support@livarex.com.ng',
    phone: '+234 800 548 2621',
    address: '14 Bourdillon Road, Ikoyi, Lagos',
    currency: 'NGN',
    country: 'Nigeria',
    website: 'https://livarex.com.ng',
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    newLandlord: true,
    newEnquiry: true,
    newProperty: false,
    smsAlerts: false,
    adminEmail: 'admin@livarex.com.ng',
  })

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorAuth: true,
    sessionTimeout: 30,
    loginNotifications: false,
    ipAllowlist: false,
    allowedIps: [],
  })

  const [listing, setListing] = useState<ListingSettings>({
    autoApprove: false,
    maxPerLandlord: 20,
    requireImages: true,
    requireDescription: true,
    allowNegotiation: true,
    agencyFeePercent: 10,
  })

  const [supportHours, setSupportHours] = useState<SupportHours>(DEFAULT_SUPPORT_HOURS)

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    fromEmail: 'noreply@livarex.com.ng',
    fromName: 'Livarex Homes',
    enabled: false,
    resendApiKey: '',
  })

  // Load settings from database
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser({ email: user?.email, id: user?.id })
      if (user?.id) {
        window.__livarexUserId = user.id

        // Super-admin check: if Supabase app_metadata says role='admin' this is
        // the platform owner — skip the agents table entirely so they always see
        // all tabs, even if they happen to have an agents row.
        const meta = user.app_metadata ?? {}
        const isSuperAdmin =
          meta.role === 'admin' ||
          (Array.isArray(meta.roles) && meta.roles.includes('admin'))

        if (!isSuperAdmin) {
          // Only look up the agents table for users who aren't the super-admin.
          const { data: agentRow } = await supabase
            .from('agents')
            .select('id, role')
            .eq('user_id', user.id)
            .maybeSingle()
          const agentRole = agentRow?.role
          const isActualAgent = !!agentRow && agentRole !== 'admin'
          setIsAgent(isActualAgent)
          if (isActualAgent) setActive('platform')
        }
        // isSuperAdmin → isAgent stays false, all tabs remain visible
      }
    })

    async function loadSettings() {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')

      if (error) {
        console.error('Error loading settings:', error)
        setLoading(false)
        return
      }

      data?.forEach((row: any) => {
        switch (row.key) {
          case 'platform':
            setPlatform(prev => ({ ...prev, ...row.value }))
            break
          case 'notifications':
            setNotifications(prev => ({ ...prev, ...row.value }))
            break
          case 'security':
            setSecurity(prev => ({ ...prev, ...row.value }))
            break
          case 'listing_rules':
            setListing(prev => ({ ...prev, ...row.value }))
            break
          case 'support_hours':
            setSupportHours(prev => ({ ...DEFAULT_SUPPORT_HOURS, ...row.value, days: row.value?.days ?? prev.days }))
            break
          case 'email_config':
            setEmailConfig(prev => ({ ...prev, ...row.value }))
            break
          case 'admin_pin':
            if (typeof row.value?.hash === 'string') setAdminPinHash(row.value.hash)
            break
        }
      })
      setLoading(false)
    }

    loadSettings()
  }, [])

  // Save settings function
  const saveSettings = useCallback(async (key: string, value: any) => {
    setSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        key,
        value,
        category: key.split('_')[0],
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

    // Listing Rules changed → invalidate the cached agency fee percentage and
    // notify any open forms so they re-fetch immediately.
    if (!error && key === 'listing_rules') {
      invalidateFeeConfig()
      notifyListingRulesChange()
    }

    // Any settings change → drop the platform-settings cache so the public
    // site (phone, email, notification toggles) picks up the new values.
    if (!error) {
      invalidatePlatformSettings()
    }

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return true
    }
    console.error('Save error:', error)
    return false
  }, [user?.id])

  // Handle save all for current section
  const handleSave = async () => {
    setSaving(true)
    let success = true

    switch (active) {
      case 'platform':
        success = await saveSettings('platform', platform)
        break
      case 'notifications':
        success = await saveSettings('notifications', notifications)
        break
      case 'security':
        success = await saveSettings('security', security)
        break
      case 'listing':
        success = await saveSettings('listing_rules', listing)
        break
      case 'support_hours':
        success = await saveSettings('support_hours', supportHours)
        if (success) invalidateSupportHours()
        break
      case 'email':
        success = await saveSettings('email_config', emailConfig)
        break
    }

    setSaving(false)
    if (success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  // Test Resend email configuration
  const handleTestEmail = async () => {
    if (!notifications.adminEmail) {
      setTestEmailResult({ success: false, message: 'Please set admin email in Notifications tab first' })
      return
    }

    setTestEmailLoading(true)
    setTestEmailResult(null)

    try {
      const res = await fetch('/api/send-support-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          adminEmail: notifications.adminEmail,
          from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        setTestEmailResult({ success: true, message: 'Test email sent successfully! Check your inbox.' })
      } else {
        setTestEmailResult({ success: false, message: data?.error || 'Unknown error sending test email' })
      }
    } catch (err: any) {
      console.error('Test email error:', err)
      setTestEmailResult({
        success: false,
        message: err.message || 'Failed to send test email. Make sure RESEND_API_KEY is set in Vercel env.',
      })
    } finally {
      setTestEmailLoading(false)
    }
  }

  // ── Tab change with PIN gate ─────────────────────────────────────────────────
  function handleTabChange(id: string) {
    // Agents cannot access admin-only sections
    if (isAgent && ADMIN_ONLY_SECTIONS.has(id)) return
    // Admin-only sections require PIN verification (if a PIN is set)
    if (!isAgent && ADMIN_ONLY_SECTIONS.has(id) && adminPinHash && !pinVerified) {
      setPendingTab(id)
      setPinInput('')
      setPinError('')
      setShowPinGate(true)
      return
    }
    setActive(id)
    setPinVerified(false) // require PIN again when switching away and back
  }

  async function submitPin() {
    if (!pinInput.trim()) { setPinError('Enter your PIN.'); return }
    const h = await hashPin(pinInput.trim())
    if (h !== adminPinHash) { setPinError('Incorrect PIN. Try again.'); setPinInput(''); return }
    setPinVerified(true)
    setShowPinGate(false)
    if (pendingTab) { setActive(pendingTab); setPendingTab(null) }
  }

  async function saveNewPin() {
    if (newPin.length < 4) { setPinSetupMsg({ ok: false, text: 'PIN must be at least 4 digits.' }); return }
    if (newPin !== confirmPin) { setPinSetupMsg({ ok: false, text: 'PINs do not match.' }); return }
    setSavingPin(true)
    const h = await hashPin(newPin)
    const ok = await saveSettings('admin_pin', { hash: h })
    if (ok) {
      setAdminPinHash(h)
      setPinSetupMsg({ ok: true, text: 'Admin PIN saved. It will be required to access sensitive settings.' })
      setNewPin(''); setConfirmPin(''); setShowPinSetup(false)
    } else {
      setPinSetupMsg({ ok: false, text: 'Failed to save PIN. Try again.' })
    }
    setSavingPin(false)
  }

  async function clearPin() {
    setSavingPin(true)
    const ok = await saveSettings('admin_pin', { hash: null })
    if (ok) { setAdminPinHash(null); setPinSetupMsg({ ok: true, text: 'Admin PIN removed.' }) }
    setSavingPin(false)
  }

  // Sections visible to the current user (agents can't see admin-only tabs)
  const visibleSections = isAgent ? SECTIONS.filter(s => !ADMIN_ONLY_SECTIONS.has(s.id)) : SECTIONS

  // Nav grouping for the desktop rail: general settings vs. admin-only settings
  const GENERAL_IDS = new Set(['platform', 'notifications', 'listing', 'support_hours'])
  const generalSections = visibleSections.filter(s => GENERAL_IDS.has(s.id))
  const adminSections = visibleSections.filter(s => !GENERAL_IDS.has(s.id))
  const activeSection = visibleSections.find(s => s.id === active) ?? visibleSections[0]

  // Sections persisted by the global "Save Changes" button. Audit History and
  // Agents manage their own state (CSV export, agent CRUD), so no global save.
  const SAVEABLE_SECTIONS = new Set(['platform', 'notifications', 'email', 'security', 'support_hours', 'listing'])

  // Jump the content back to the top whenever the active section changes
  const mainRef = useRef<HTMLElement | null>(null)
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }) }, [active])

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  // ── Audit history state ──────────────────────────────────────────────────────
  const [historyTab, setHistoryTab]       = useState<'kyc' | 'listings' | 'settings'>('kyc')
  const [kycHistory, setKycHistory]       = useState<any[]>([])
  const [listingHistory, setListingHistory] = useState<any[]>([])
  const [settingsHistory, setSettingsHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    const supabase = createClient()
    const [kycRes, listingRes, settingsRes] = await Promise.all([
      supabase.from('landlords')
        .select('id, full_name, status, created_at, updated_at, kyc_submitted_at, whatsapp')
        .not('status', 'eq', 'not_submitted')
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase.from('properties')
        .select('id, title, city, status, type, price, created_at, updated_at, landlords(full_name)')
        .not('status', 'eq', 'pending_review')
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase.from('admin_settings')
        .select('key, value, updated_at, updated_by')
        .order('updated_at', { ascending: false })
        .limit(30),
    ])
    setKycHistory(kycRes.data ?? [])
    setListingHistory(listingRes.data ?? [])
    setSettingsHistory(settingsRes.data ?? [])
    setHistoryLoading(false)
  }, [])

  useEffect(() => {
    if (active === 'history') loadHistory()
  }, [active, loadHistory])

  function downloadHistoryCsv() {
    const KYC_STATUS: Record<string, string> = {
      approved: 'Approved', rejected: 'Rejected', pending: 'Pending',
      suspended: 'Suspended', not_submitted: 'Not Submitted',
    }
    const rows: [string, string][] = [
      ['Livarex Audit History Export', ''],
      ['Generated', new Date().toLocaleString('en-GB')],
      ['', ''],
      ['=== KYC Decisions ===', ''],
      ['Landlord', 'Status', 'WhatsApp', 'Submitted', 'Last Updated'],
      ...kycHistory.map(l => [
        l.full_name, KYC_STATUS[l.status] ?? l.status, l.whatsapp ?? '',
        l.kyc_submitted_at ? new Date(l.kyc_submitted_at).toLocaleString('en-GB') : '',
        l.updated_at ? new Date(l.updated_at).toLocaleString('en-GB') : '',
      ] as [string, string]),
      ['', ''],
      ['=== Listing Approvals ===', ''],
      ['Title', 'Landlord', 'City', 'Type', 'Status', 'Created', 'Last Updated'],
      ...listingHistory.map(p => [
        p.title, (p as any).landlords?.full_name ?? '', p.city ?? '',
        p.type, p.status,
        new Date(p.created_at).toLocaleString('en-GB'),
        new Date(p.updated_at).toLocaleString('en-GB'),
      ] as [string, string]),
      ['', ''],
      ['=== Settings Changes ===', ''],
      ['Setting Key', 'Last Updated'],
      ...settingsHistory.map(s => [s.key, s.updated_at ? new Date(s.updated_at).toLocaleString('en-GB') : ''] as [string, string]),
    ]
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `livarex-audit-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // ── Weekly report download (CSV, Excel-compatible) ─────────────────────────
  const [reportLoading, setReportLoading] = useState(false)
  const [reportMessage, setReportMessage] = useState<{ success: boolean; message: string } | null>(null)

  async function handleDownloadReport() {
    setReportLoading(true)
    setReportMessage(null)
    try {
      const supabase = createClient()
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7)
      const since = cutoff.toISOString()

      const fetchCount = async (table: string, extra?: (q: any) => any): Promise<number> => {
        let q = supabase.from(table).select('id', { count: 'exact', head: true })
        if (extra) q = extra(q)
        const { count } = await q
        return count ?? 0
      }

      const [
        totalUsers,
        newUsers,
        totalLandlords,
        newLandlords,
        totalProperties,
        newProperties,
        openEnquiries,
        newEnquiries,
        openTickets,
        newTickets,
        kycPending,
        newKyc,
        totalContacts,
        newContacts,
      ] = await Promise.all([
        fetchCount('tenants'),
        fetchCount('tenants', q => q.gte('created_at', since)),
        fetchCount('landlords'),
        fetchCount('landlords', q => q.gte('created_at', since)),
        fetchCount('properties'),
        fetchCount('properties', q => q.gte('created_at', since)),
        fetchCount('enquiries', q => q.eq('status', 'open')),
        fetchCount('enquiries', q => q.gte('created_at', since)),
        fetchCount('support_tickets', q => q.eq('status', 'open')),
        fetchCount('support_tickets', q => q.gte('created_at', since)),
        fetchCount('landlords', q => q.eq('status', 'pending')),
        fetchCount('landlords', q => q.gte('created_at', since).eq('status', 'pending')),
        fetchCount('contact_messages'),
        fetchCount('contact_messages', q => q.gte('created_at', since)),
      ])

      const rows: [string, string][] = [
        ['Livarex Platform Report', ''],
        ['Generated', new Date().toLocaleString('en-GB')],
        ['Period', 'Last 7 days'],
        ['', ''],
        ['Metric', 'Value'],
        ['Total Users', String(totalUsers)],
        ['New Users (7d)', String(newUsers)],
        ['Total Landlords', String(totalLandlords)],
        ['New Landlords (7d)', String(newLandlords)],
        ['Total Properties Listed', String(totalProperties)],
        ['New Properties (7d)', String(newProperties)],
        ['Open Enquiries', String(openEnquiries)],
        ['New Enquiries (7d)', String(newEnquiries)],
        ['Open Support Tickets', String(openTickets)],
        ['New Support Tickets (7d)', String(newTickets)],
        ['KYC Pending Review', String(kycPending)],
        ['KYC Submissions (7d)', String(newKyc)],
        ['Contact Messages', String(totalContacts)],
        ['New Contact Messages (7d)', String(newContacts)],
      ]

      const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `livarex-weekly-report-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setReportMessage({ success: true, message: 'Report downloaded. Open it in Excel, Google Sheets, or any CSV viewer.' })
    } catch (err: any) {
      console.error('Report download error:', err)
      setReportMessage({ success: false, message: err?.message || 'Failed to generate report' })
    } finally {
      setReportLoading(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard require="admin">
        <MobileSidebarProvider>
          <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
            <AdminSidebar userEmail={user?.email} userName={displayName} />
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          </div>
        </MobileSidebarProvider>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard require="admin">
      <MobileSidebarProvider>
        <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
          <AdminSidebar userEmail={user?.email} userName={displayName} />

          <div className="flex-1 flex flex-col min-w-0 p-2 md:p-4">
            <div className="md:hidden">
              <AdminHeader title="Settings" subtitle="Admin configuration" />
            </div>

            {/* ── Page header (desktop only — AdminHeader covers mobile) ── */}
            <header className="shrink-0 hidden md:flex items-start justify-between gap-4 pl-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Admin configuration</p>
                <h2 className="mt-1 text-xl md:text-2xl font-extrabold text-slate-950 tracking-tight">Settings</h2>
                <p className="mt-0.5 hidden sm:block text-xs md:text-sm text-slate-500">Manage your platform's configuration, security, and support.</p>
              </div>
              {/* Desktop: Save Changes in the header (bottom bar on mobile) */}
              <div className="hidden md:flex items-center gap-3 shrink-0 pt-1">
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <CheckCircle className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                {SAVEABLE_SECTIONS.has(active) && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                      saving ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground shadow-sm'
                    }`}
                  >
                    {saving ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Save Changes</>
                    )}
                  </button>
                )}
              </div>
            </header>

            {/* ── Settings card ── */}
            <div className="mt-2 md:mt-3 flex-1 min-h-0 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Mobile: horizontal scrollable chips */}
              <div className="lg:hidden shrink-0 border-b border-slate-100">
                <div className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {visibleSections.map(s => {
                    const Icon = s.icon
                    const isActive = active === s.id
                    const locked = !isAgent && ADMIN_ONLY_SECTIONS.has(s.id) && adminPinHash && !pinVerified
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleTabChange(s.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                          isActive ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                        {s.label}
                        {locked && <Lock className="w-2.5 h-2.5 opacity-50" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 flex min-h-0">
                {/* Desktop: nav rail */}
                <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 border-r border-slate-100 bg-slate-50/70 overflow-y-auto">
                  <nav className="p-3.5 space-y-5">
                     <div>
                       <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">General</p>
                       <div className="space-y-0.5">
                         {generalSections.map(s => {
                           const Icon = s.icon
                           const isActive = active === s.id
                           return (
                             <button
                               key={s.id}
                               type="button"
                               onClick={() => handleTabChange(s.id)}
                               className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                                 isActive ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                               }`}
                             >
                               <span className="flex items-center gap-2.5 min-w-0">
                                 <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={1.8} />
                                 <span className="truncate">{s.label}</span>
                               </span>
                               <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-white/60' : 'text-slate-300 group-hover:text-slate-400'}`} />
                             </button>
                           )
                         })}
                       </div>
                     </div>
                     {adminSections.length > 0 && (
                       <div>
                         <p className="px-2 mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                           Admin only
                           {adminPinHash && !isAgent && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                         </p>
                         <div className="space-y-0.5">
                           {adminSections.map(s => {
                             const Icon = s.icon
                             const isActive = active === s.id
                             const locked = !isAgent && ADMIN_ONLY_SECTIONS.has(s.id) && adminPinHash && !pinVerified
                             return (
                               <button
                                 key={s.id}
                                 type="button"
                                 onClick={() => handleTabChange(s.id)}
                                 className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                                   isActive ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                                 }`}
                               >
                                <span className="flex items-center gap-2.5 min-w-0">
                                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={1.8} />
                                  <span className="truncate">{s.label}</span>
                                </span>
                                {locked ? (
                                  <Lock className="w-3 h-3 shrink-0 text-amber-500" />
                                ) : (
                                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-white/60' : 'text-slate-300 group-hover:text-slate-400'}`} />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </nav>
                </aside>

                {/* ── Content ── */}
                <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto">
                  <div className="max-w-3xl mx-auto px-4 md:px-8 py-5 md:py-7 pb-8">

              {/* ─── PLATFORM ─── */}
              {active === 'platform' && (
                <div>
                  <SectionTitle 
                    title="Platform Information" 
                    sub="Public-facing details about your real estate platform."
                    icon={Building2}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldInput 
                      label="Platform Name" 
                      value={platform.name} 
                      onChange={v => setPlatform(p => ({ ...p, name: v }))} 
                      icon={Building2} 
                    />
                    <FieldInput 
                      label="Tagline" 
                      value={platform.tagline} 
                      onChange={v => setPlatform(p => ({ ...p, tagline: v }))} 
                      icon={Globe} 
                    />
                    <FieldInput 
                      label="Support Email" 
                      value={platform.email} 
                      onChange={v => setPlatform(p => ({ ...p, email: v }))} 
                      icon={Mail} 
                      mono 
                    />
                    <FieldInput 
                      label="Phone" 
                      value={platform.phone} 
                      onChange={v => setPlatform(p => ({ ...p, phone: v }))} 
                      icon={Phone} 
                      mono 
                    />
                    <div className="sm:col-span-2">
                      <FieldInput 
                        label="Address" 
                        value={platform.address} 
                        onChange={v => setPlatform(p => ({ ...p, address: v }))} 
                        icon={MapPin} 
                      />
                    </div>
                    <FieldInput 
                      label="Currency" 
                      value={platform.currency} 
                      onChange={v => setPlatform(p => ({ ...p, currency: v }))} 
                      icon={CreditCard} 
                      mono 
                    />
                    <FieldInput 
                      label="Country" 
                      value={platform.country} 
                      onChange={v => setPlatform(p => ({ ...p, country: v }))} 
                      icon={Globe} 
                    />
                    <div className="sm:col-span-2">
                      <FieldInput 
                        label="Website" 
                        value={platform.website} 
                        onChange={v => setPlatform(p => ({ ...p, website: v }))} 
                        icon={ArrowUpRight} 
                        mono 
                      />
                    </div>
                  </div>
                  <Divider />
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Public Visibility</p>
                        <p className="text-xs text-gray-500 mt-1">
                          These details appear in the footer of emails, on the contact page, 
                          and in platform-generated documents. Keep them accurate and up-to-date.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── NOTIFICATIONS ─── */}
              {active === 'notifications' && (
                <div>
                  <SectionTitle 
                    title="Notification Preferences" 
                    sub="Control which events trigger alerts and how they are delivered."
                    icon={Bell}
                  />
                  
                  <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Mail className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.8} />
                          </div>
                          <p className="text-sm font-semibold text-gray-900">Admin Email Address</p>
                        </div>
                        <FieldInput
                          label=""
                          value={notifications.adminEmail}
                          onChange={v => setNotifications(n => ({ ...n, adminEmail: v }))}
                          icon={Mail}
                          mono
                          placeholder="admin@livarex.com.ng"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                          All admin notifications will be sent to this email address.
                        </p>
                      </div>
                      <div className="shrink-0 sm:pt-0">
                        <StatusBadge 
                          status={notifications.adminEmail ? 'success' : 'warning'} 
                          text={notifications.adminEmail ? 'Configured' : 'Not Set'} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ToggleRow
                      label="New Landlord Registration" 
                      desc="Get notified when a new landlord completes sign-up"
                      enabled={notifications.newLandlord} 
                      onChange={() => setNotifications(n => ({ ...n, newLandlord: !n.newLandlord }))}
                      icon={Users} 
                      tag="email"
                    />
                    <ToggleRow
                      label="New Enquiry Received" 
                      desc="Alert when a tenant submits a property enquiry"
                      enabled={notifications.newEnquiry} 
                      onChange={() => setNotifications(n => ({ ...n, newEnquiry: !n.newEnquiry }))}
                      icon={BellRing} 
                      tag="email"
                    />
                    <ToggleRow
                      label="New Property Listed" 
                      desc="Alert when a landlord publishes a new listing"
                      enabled={notifications.newProperty} 
                      onChange={() => setNotifications(n => ({ ...n, newProperty: !n.newProperty }))}
                      icon={Building2} 
                      tag="email"
                    />
                    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                          <BarChart3 className="w-4 h-4" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">Weekly Summary Report</span>
                            <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">csv</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">Download platform statistics for the last 7 days (CSV — opens in Excel)</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadReport}
                        disabled={reportLoading}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                      >
                        {reportLoading ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                        ) : (
                          <><FileDown className="w-3.5 h-3.5" /> Download Report</>
                        )}
                      </button>
                      {reportMessage && (
                        <p className={`w-full sm:w-auto text-[11px] sm:max-w-[220px] sm:text-right ${reportMessage.success ? 'text-green-600' : 'text-red-600'}`}>
                          {reportMessage.message}
                        </p>
                      )}
                    </div>
                    <ToggleRow
                      label="SMS Alerts" 
                      desc="Critical platform alerts sent via SMS (requires Twilio)"
                      enabled={notifications.smsAlerts} 
                      onChange={() => setNotifications(n => ({ ...n, smsAlerts: !n.smsAlerts }))}
                      icon={Smartphone} 
                      tag="soon"
                      disabled
                    />
                  </div>
                  <Divider />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Email On', val: [notifications.newLandlord, notifications.newEnquiry, notifications.newProperty].filter(Boolean).length, of: 3 },
                      { label: 'Admin Email', val: notifications.adminEmail ? 1 : 0, of: 1 },
                      { label: 'Total Active', val: [notifications.newLandlord, notifications.newEnquiry, notifications.newProperty].filter(Boolean).length, of: 3 },
                    ].map(s => (
                      <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-extrabold text-gray-900 font-mono">{s.val}<span className="text-sm text-gray-300">/{s.of}</span></p>
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── EMAIL CONFIG (RESEND) ─── */}
              {active === 'email' && (
                <div>
                  <SectionTitle 
                    title="Email Configuration (Resend)" 
                    sub="Configure Resend API for sending transactional emails."
                    icon={Mail}
                    action={
                      emailConfig.enabled ? (
                        <StatusBadge status="success" text="Active" />
                      ) : (
                        <StatusBadge status="neutral" text="Disabled" />
                      )
                    }
                  />

                  <div className="space-y-4">
                    <ToggleRow
                      label="Enable Email Notifications"
                      desc="Turn on to send emails via Resend API"
                      enabled={emailConfig.enabled}
                      onChange={() => setEmailConfig(c => ({ ...c, enabled: !c.enabled }))}
                      icon={Send}
                      tag={emailConfig.enabled ? 'live' : 'off'}
                    />

                    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                      <FieldInput
                        label="Resend API Key"
                        value={emailConfig.resendApiKey}
                        onChange={v => setEmailConfig(c => ({ ...c, resendApiKey: v }))}
                        icon={Key}
                        type="password"
                        mono
                        placeholder="re_xxxxxxxxxxxx"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldInput
                          label="From Email"
                          value={emailConfig.fromEmail}
                          onChange={v => setEmailConfig(c => ({ ...c, fromEmail: v }))}
                          icon={Mail}
                          mono
                          placeholder="noreply@livarex.com.ng"
                        />
                        <FieldInput
                          label="From Name"
                          value={emailConfig.fromName}
                          onChange={v => setEmailConfig(c => ({ ...c, fromName: v }))}
                          icon={User}
                          placeholder="Livarex Homes"
                        />
                      </div>
                    </div>

                    {/* Test Email Section */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <TestTube className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Test Configuration</p>
                            <p className="text-xs text-gray-400">Send a test email to verify your setup</p>
                          </div>
                        </div>
                        <button
                          onClick={handleTestEmail}
                          disabled={testEmailLoading || !emailConfig.resendApiKey || !notifications.adminEmail}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          {testEmailLoading ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                          ) : (
                            <><Send className="w-3.5 h-3.5" /> Send Test</>
                          )}
                        </button>
                      </div>

                      {testEmailResult && (
                        <div className={`p-3 rounded-lg text-sm ${
                          testEmailResult.success 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            {testEmailResult.success ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            {testEmailResult.message}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Setup Instructions */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Webhook className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Resend Setup Guide</p>
                          <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
                            <li>Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resend.com</a></li>
                            <li>Verify your domain (e.g., livarex.com.ng)</li>
                            <li>Create an API key with &quot;sending&quot; permissions</li>
                            <li>Copy the API key (starts with <code className="bg-blue-100 px-1 rounded">re_</code>)</li>
                            <li>Paste it above and click Save Changes</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SECURITY ─── */}
              {active === 'security' && (
                <div>
                  <SectionTitle 
                    title="Security Settings" 
                    sub="Manage authentication, session control, and access restrictions."
                    icon={Shield}
                  />
                  <div className="space-y-2">
                    <ToggleRow
                      label="Two-Factor Authentication"
                      desc="Require 2FA for all admin accounts"
                      enabled={security.twoFactorAuth}
                      onChange={() => setSecurity(s => ({ ...s, twoFactorAuth: !s.twoFactorAuth }))}
                      icon={Lock}
                      tag="soon"
                      disabled
                    />
                    <ToggleRow
                      label="Login Notifications"
                      desc="Email alert on every new admin login (sent to your notification email)"
                      enabled={security.loginNotifications}
                      onChange={() => setSecurity(s => ({ ...s, loginNotifications: !s.loginNotifications }))}
                      icon={BellRing}
                    />
                    <ToggleRow
                      label="IP Allowlist"
                      desc="Restrict admin access to specific IP addresses"
                      enabled={security.ipAllowlist}
                      onChange={() => setSecurity(s => ({ ...s, ipAllowlist: !s.ipAllowlist }))}
                      icon={Wifi}
                      tag="soon"
                      disabled
                    />
                  </div>

                  {/* Session Timeout */}
                  <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Timer className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Session Timeout</p>
                        <p className="text-xs text-gray-400">
                          Auto-logout after inactivity. Set to 0 to disable.
                        </p>
                      </div>
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${security.sessionTimeout > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {security.sessionTimeout > 0 ? `${security.sessionTimeout} min` : 'Off'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range" min={0} max={120} step={5}
                        value={security.sessionTimeout}
                        onChange={e => setSecurity(s => ({ ...s, sessionTimeout: Number(e.target.value) }))}
                        style={{ accentColor: '#2563eb' }}
                        className="flex-1 h-1.5 rounded-full cursor-pointer"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={0} max={120}
                          value={security.sessionTimeout}
                          onChange={e => setSecurity(s => ({ ...s, sessionTimeout: Math.min(120, Math.max(0, Number(e.target.value))) }))}
                          className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
                        />
                        <span className="text-xs text-gray-400">min</span>
                      </div>
                    </div>
                    {security.sessionTimeout > 0 && (
                      <p className="mt-2 text-[11px] text-blue-600">
                        Admin sessions will auto-logout after {security.sessionTimeout} minutes of inactivity.
                      </p>
                    )}
                  </div>

                  {/* ── Admin PIN setup ── */}
                  <Divider />
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Key className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">Admin PIN</p>
                        <p className="text-xs text-gray-400">Protects sensitive settings (Email, Security, Agents) from support staff access.</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${adminPinHash ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {adminPinHash ? 'Active' : 'Not set'}
                      </span>
                    </div>

                    {!showPinSetup ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setShowPinSetup(true); setNewPin(''); setConfirmPin(''); setPinSetupMsg(null) }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors">
                          <Key className="w-3 h-3" />
                          {adminPinHash ? 'Change PIN' : 'Set PIN'}
                        </button>
                        {adminPinHash && (
                          <button onClick={clearPin} disabled={savingPin}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50">
                            <X className="w-3 h-3" /> Remove PIN
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FieldInput label="New PIN (4–10 digits)" value={newPin}
                            onChange={v => setNewPin(v.replace(/\D/g, ''))} icon={Key} type="password" mono placeholder="e.g. 1234" />
                          <FieldInput label="Confirm PIN" value={confirmPin}
                            onChange={v => setConfirmPin(v.replace(/\D/g, ''))} icon={Key} type="password" mono placeholder="Same as above" />
                        </div>
                        {pinSetupMsg && (
                          <p className={`text-xs font-medium ${pinSetupMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{pinSetupMsg.text}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button onClick={saveNewPin} disabled={savingPin || !newPin || !confirmPin}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-semibold transition-colors">
                            {savingPin ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Save PIN
                          </button>
                          <button onClick={() => setShowPinSetup(false)}
                            className="px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Divider />
                  {/* Coming soon notice — only for remaining unbuilt features */}
                  <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">More controls coming soon</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Two-factor authentication and IP allowlisting are planned for a future update.
                        Your account is currently protected by Supabase's built-in authentication.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── AUDIT HISTORY ─── */}
              {active === 'history' && (
                <div>
                  <SectionTitle
                    title="Audit History"
                    sub="A record of KYC decisions, listing approvals, and settings changes for accountability and compliance."
                    icon={FileText}
                    action={
                      <button onClick={downloadHistoryCsv} disabled={historyLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors disabled:opacity-50">
                        <FileDown className="w-3.5 h-3.5" /> Export CSV
                      </button>
                    }
                  />

                  {/* Category tabs */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-blue-50 mb-5">
                    {([
                      { id: 'kyc',      label: 'KYC Decisions',     count: kycHistory.length      },
                      { id: 'listings', label: 'Listing Approvals',  count: listingHistory.length  },
                      { id: 'settings', label: 'Settings Changes',   count: settingsHistory.length },
                    ] as const).map(t => (
                      <button key={t.id} type="button" onClick={() => setHistoryTab(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          historyTab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-blue-700 hover:text-blue-900 hover:bg-blue-100'
                        }`}>
                        {t.label}
                        <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full text-[10px] font-bold ${
                          historyTab === t.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-blue-200 text-blue-800'
                        }`}>{t.count}</span>
                      </button>
                    ))}
                  </div>

                  {historyLoading ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Loading audit records…</span>
                    </div>
                  ) : historyTab === 'kyc' ? (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">KYC Decisions</p>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kycHistory.length} records</span>
                      </div>
                      {kycHistory.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                          <ShieldCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No KYC decisions recorded yet.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {kycHistory.map(l => {
                            const STATUS_STYLES: Record<string, string> = {
                              approved:  'bg-emerald-50 text-emerald-700 border-emerald-100',
                              rejected:  'bg-red-50 text-red-600 border-red-100',
                              pending:   'bg-amber-50 text-amber-700 border-amber-100',
                              suspended: 'bg-orange-50 text-orange-700 border-orange-100',
                            }
                            const DOTS: Record<string, string> = {
                              approved: 'bg-emerald-500', rejected: 'bg-red-500',
                              pending: 'bg-amber-500', suspended: 'bg-orange-500',
                            }
                            const cls = STATUS_STYLES[l.status] ?? 'bg-gray-50 text-gray-500 border-gray-100'
                            const dot = DOTS[l.status] ?? 'bg-gray-400'
                            return (
                              <div key={l.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-white">
                                    {l.full_name.split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{l.full_name}</p>
                                  <p className="text-[11px] text-gray-400 truncate">{l.whatsapp ?? '—'} · Submitted {l.kyc_submitted_at ? new Date(l.kyc_submitted_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                                  {l.status.charAt(0).toUpperCase()+l.status.slice(1)}
                                </span>
                                <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                                  {l.updated_at ? new Date(l.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : historyTab === 'listings' ? (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Listing Approvals</p>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{listingHistory.length} records</span>
                      </div>
                      {listingHistory.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                          <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No listing approvals recorded yet.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {listingHistory.map(p => {
                            const PROP_STATUS: Record<string,{label:string;cls:string}> = {
                              available: { label:'Available', cls:'bg-emerald-50 text-emerald-700 border-emerald-100' },
                              taken:     { label:'Taken',     cls:'bg-red-50 text-red-600 border-red-100'            },
                              coming_soon:       { label:'Coming Soon',  cls:'bg-blue-50 text-blue-700 border-blue-100'        },
                              under_negotiation: { label:'Negotiating',  cls:'bg-amber-50 text-amber-700 border-amber-100'     },
                              pending_review:    { label:'Pending',      cls:'bg-violet-50 text-violet-700 border-violet-100'  },
                            }
                            const sm = PROP_STATUS[p.status] ?? { label: p.status, cls: 'bg-gray-50 text-gray-500 border-gray-100' }
                            return (
                              <div key={p.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                  <Building2 className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                                  <p className="text-[11px] text-gray-400 truncate">
                                    {(p as any).landlords?.full_name ?? 'Unknown'} · {p.city ?? '—'} · {p.type === 'rent' ? 'For Rent' : 'For Sale'}
                                  </p>
                                </div>
                                <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${sm.cls}`}>
                                  {sm.label}
                                </span>
                                <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                                  {new Date(p.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Settings Changes</p>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{settingsHistory.length} records</span>
                      </div>
                      {settingsHistory.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                          <Shield className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No settings changes recorded yet.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {settingsHistory.map(s => (
                            <div key={s.key} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <Shield className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 capitalize">{s.key.replace(/_/g,' ')}</p>
                                <p className="text-[11px] text-gray-400">Settings record updated</p>
                              </div>
                              <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                {s.updated_at ? new Date(s.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex items-start gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">About audit records</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        These records reflect the current state of each entity. For a full timestamped trail with per-field change history, export the CSV or use Supabase's built-in table history in your project dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── AGENTS ─── */}
              {active === 'agents' && <AgentSettingsSection currentUserId={user?.id} />}

              {/* ─── SUPPORT HOURS ─── */}
              {active === 'support_hours' && (
                <div>
                  <SectionTitle
                    title="Support Hours"
                    sub="When Livarex Support is open for customers. Timezone: Africa/Lagos (Nigeria). The customer-facing Online/Away status follows ONLY this schedule — never the agent heartbeat."
                    icon={Clock}
                  />

                  <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Weekly Schedule</p>
                        <p className="text-xs text-gray-400">08:00 – 18:00 Africa/Lagos by default</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {WEEKDAY_LABELS.map((label, i) => {
                        const day = supportHours.days[i]
                        return (
                          <div key={label} className={`flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 px-3 sm:px-0 py-2.5 rounded-lg sm:rounded-none sm:py-1.5 ${day?.enabled ? 'sm:bg-transparent bg-blue-50/40' : ''}`}>
                            <label className="sm:w-28 shrink-0 text-sm font-semibold text-gray-700">{label}</label>
                            <div className="flex items-center gap-3 flex-1">
                              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                <input
                                  type="checkbox"
                                  checked={day?.enabled}
                                  onChange={e => {
                                    const days = [...supportHours.days] as SupportHours['days']
                                    days[i] = { ...days[i], enabled: e.target.checked }
                                    setSupportHours(h => ({ ...h, days }))
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-500">Open</span>
                              </label>
                              <div className="flex items-center gap-2 flex-1 justify-end sm:justify-start">
                                <input
                                  type="time"
                                  value={day?.open ?? '08:00'}
                                  disabled={!day?.enabled}
                                  onChange={e => {
                                    const days = [...supportHours.days] as SupportHours['days']
                                    days[i] = { ...days[i], open: e.target.value || '08:00' }
                                    setSupportHours(h => ({ ...h, days }))
                                  }}
                                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white disabled:opacity-40"
                                />
                                <span className="text-xs text-gray-400">to</span>
                                <input
                                  type="time"
                                  value={day?.close ?? '18:00'}
                                  disabled={!day?.enabled}
                                  onChange={e => {
                                    const days = [...supportHours.days] as SupportHours['days']
                                    days[i] = { ...days[i], close: e.target.value || '18:00' }
                                    setSupportHours(h => ({ ...h, days }))
                                  }}
                                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white disabled:opacity-40"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-100">
                      <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2} />
                      <p className="text-sm text-blue-700">
                        Global Support status = open/away based on this schedule only. Individual agent presence is tracked separately and never changes the global status.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── LISTING RULES ─── */}
              {active === 'listing' && (
                <div>
                  <SectionTitle 
                    title="Listing Rules" 
                    sub="Control publishing constraints and requirements for landlord listings."
                    icon={Globe}
                  />
                  <div className="space-y-2">
                    <ToggleRow
                      label="Auto-approve Listings"
                      desc="Bypass admin review and publish immediately"
                      enabled={listing.autoApprove}
                      onChange={() => setListing(l => ({ ...l, autoApprove: !l.autoApprove }))}
                      icon={Zap}
                      tag={listing.autoApprove ? 'on' : undefined}
                    />
                    <ToggleRow
                      label="Require Property Images"
                      desc="Landlords must upload at least one photo"
                      enabled={listing.requireImages}
                      onChange={() => setListing(l => ({ ...l, requireImages: !l.requireImages }))}
                      icon={Image}
                    />
                    <ToggleRow
                      label="Require Description"
                      desc="Text description is mandatory on all listings"
                      enabled={listing.requireDescription}
                      onChange={() => setListing(l => ({ ...l, requireDescription: !l.requireDescription }))}
                      icon={FileText}
                    />
                    <ToggleRow
                      label="Allow Price Negotiation"
                      desc='Enables "under negotiation" status on listings'
                      enabled={listing.allowNegotiation}
                      onChange={() => setListing(l => ({ ...l, allowNegotiation: !l.allowNegotiation }))}
                      icon={DollarSign}
                    />
                  </div>

                  {/* Max per landlord */}
                  <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Hash className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Max Listings Per Landlord</p>
                        <p className="text-xs text-gray-400">Cap on simultaneous active listings</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range" min={1} max={100} step={1}
                        value={listing.maxPerLandlord}
                        onChange={e => setListing(l => ({ ...l, maxPerLandlord: Number(e.target.value) }))}
                        style={{ accentColor: '#2563eb' }}
                        className="flex-1 h-1.5 rounded-full"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={1} max={100}
                          value={listing.maxPerLandlord}
                          onChange={e => setListing(l => ({ ...l, maxPerLandlord: Number(e.target.value) }))}
                          className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
                        />
                        <span className="text-xs text-gray-400">max</span>
                      </div>
                    </div>
                  </div>

                  {/* Agency fee percentage */}
                  <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Agency Fee Percentage</p>
                        <p className="text-xs text-gray-400">Applied automatically to every listing's Agency Fee</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="number" min={0} max={100} step={1}
                        value={listing.agencyFeePercent}
                        onChange={e => {
                          const v = Number(e.target.value)
                          setListing(l => ({ ...l, agencyFeePercent: Number.isFinite(v) ? v : 0 }))
                        }}
                        className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono font-bold text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
                      />
                      <span className="text-sm font-semibold text-gray-500">%</span>
                      <p className="text-xs text-gray-400">
                        This is the single source of truth — Agency Fee is always calculated as rent × this percentage.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-100">
                    <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2} />
                    <p className="text-sm text-blue-700">
                      {[listing.autoApprove, listing.requireImages, listing.requireDescription, listing.allowNegotiation].filter(Boolean).length} of 4 rules active · Agency Fee {listing.agencyFeePercent}%
                    </p>
                  </div>
                </div>
              )}

            </div>
            </main>
              </div>

              {/* ── Mobile save bar ── */}
              {SAVEABLE_SECTIONS.has(active) && (
                <div className="md:hidden shrink-0 border-t border-slate-100 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    {saved && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 shrink-0">
                        <CheckCircle className="w-4 h-4" /> Saved
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className={`flex-1 inline-flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${
                        saving ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.98] text-white shadow-lg shadow-slate-950/10'
                      }`}
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      ) : (
                        <><Save className="w-4 h-4" /> Save Changes</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      {/* ── PIN gate modal ── */}
      {showPinGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 border border-gray-200">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-[15px] font-extrabold text-gray-900 mb-1">Admin verification</h3>
            <p className="text-[13px] text-gray-500 mb-5">Enter your admin PIN to access this section.</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={10}
              value={pinInput}
              onChange={e => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError('') }}
              onKeyDown={e => e.key === 'Enter' && submitPin()}
              autoFocus
              placeholder="••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-500/30 mb-2"
            />
            {pinError && <p className="text-xs text-red-600 text-center mb-3">{pinError}</p>}
            <div className="flex gap-2.5 mt-4">
              <button onClick={() => { setShowPinGate(false); setPendingTab(null) }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={submitPin}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold transition-colors">
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </MobileSidebarProvider>
    </AuthGuard>
  )
}

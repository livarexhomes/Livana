import { useState, useEffect } from 'react'
import {
  Building2, Bell, Shield, Globe, CreditCard, Save,
  CheckCircle, Mail, Phone, MapPin, ChevronRight,
  ToggleLeft, ToggleRight, AlertCircle, Zap, Users,
  BarChart3, Lock, Timer, BellRing, Wifi, Eye,
  Hash, Image, FileText, DollarSign, RefreshCw,
  ArrowUpRight, Sparkles, Activity,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const SECTIONS = [
  { id: 'platform',      label: 'Platform',       icon: Building2,  desc: 'Basic info' },
  { id: 'notifications', label: 'Notifications',   icon: Bell,       desc: 'Alerts & emails' },
  { id: 'security',      label: 'Security',         icon: Shield,     desc: 'Access control' },
  { id: 'listing',       label: 'Listing Rules',    icon: Globe,      desc: 'Publishing rules' },
  { id: 'billing',       label: 'Billing',          icon: CreditCard, desc: 'Plan & usage' },
]

type ToggleProps = {
  enabled: boolean
  onChange: () => void
  size?: 'sm' | 'md'
}

function Toggle({ enabled, onChange, size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 'w-9' : 'w-11'
  const h = size === 'sm' ? 'h-5' : 'h-6'
  const knob = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const onTx = size === 'sm' ? 'translate-x-4' : 'translate-x-6'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={`relative ${w} ${h} rounded-full transition-all duration-300 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        enabled
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-inner shadow-blue-700/30'
          : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span className={`absolute top-1 ${knob} rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? onTx : 'translate-x-1'}`} />
    </button>
  )
}

type FieldConfig = { key: string; label: string; icon: React.ElementType; span?: string }

type InputFieldProps = {
  field: FieldConfig
  value: string
  onChange: (val: string) => void
}

function InputField({ field, value, onChange }: InputFieldProps) {
  const [focused, setFocused] = useState(false)
  const Icon = field.icon
  return (
    <div className={field.span || ''}>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-2">
        {field.label}
      </label>
      <div className={`relative flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border transition-all duration-200 bg-white ${
        focused
          ? 'border-blue-400 ring-3 ring-blue-500/10 shadow-sm'
          : 'border-gray-200 hover:border-gray-300'
      }`}>
        <Icon className={`w-4 h-4 shrink-0 transition-colors ${focused ? 'text-blue-500' : 'text-gray-350'}`} strokeWidth={1.7} />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-sm text-gray-800 font-medium placeholder:text-gray-300 focus:outline-none bg-transparent"
        />
      </div>
    </div>
  )
}

type ToggleRowProps = {
  label: string
  desc: string
  enabled: boolean
  onChange: () => void
  icon?: React.ElementType
  badge?: string
  badgeColor?: string
}

function ToggleRow({ label, desc, enabled, onChange, icon: Icon, badge, badgeColor = 'blue' }: ToggleRowProps) {
  const badgeMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className={`group flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
      enabled
        ? 'border-blue-100 bg-blue-50/40'
        : 'border-gray-100 bg-white hover:bg-gray-50/70 hover:border-gray-200'
    }`} onClick={onChange}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            enabled ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-gray-200'
          }`}>
            <Icon className={`w-4 h-4 transition-colors ${enabled ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={1.7} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-semibold transition-colors ${enabled ? 'text-blue-900' : 'text-gray-800'}`}>{label}</p>
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeMap[badgeColor]}`}>
                {badge}
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 transition-colors ${enabled ? 'text-blue-700/60' : 'text-gray-400'}`}>{desc}</p>
        </div>
      </div>
      <div onClick={e => e.stopPropagation()}>
        <Toggle enabled={enabled} onChange={onChange} />
      </div>
    </div>
  )
}

type SectionHeaderProps = { title: string; desc: string; icon: React.ElementType }

function SectionHeader({ title, desc, icon: Icon }: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-4 pb-5 border-b border-gray-100">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-blue-600" strokeWidth={1.7} />
      </div>
      <div>
        <h2 className="text-base font-extrabold text-gray-900 tracking-tight">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

export default function AdminSettings() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [active, setActive] = useState('platform')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [platform, setPlatform] = useState({
    name: 'Livana Property Manager',
    tagline: "Nigeria's most trusted property platform",
    email: 'support@livana.ng',
    phone: '+234 800 548 2621',
    address: '14 Bourdillon Road, Ikoyi, Lagos',
    currency: 'NGN',
    country: 'Nigeria',
    website: 'https://livana.ng',
  })

  const [notifications, setNotifications] = useState({
    newLandlord: true,
    newEnquiry: true,
    newProperty: false,
    weeklyReport: true,
    smsAlerts: false,
  })

  const [listing, setListing] = useState({
    autoApprove: false,
    maxPerLandlord: 20,
    requireImages: true,
    requireDescription: true,
    allowNegotiation: true,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
  }, [])

  function handleSave() {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }, 900)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const activeSection = SECTIONS.find(s => s.id === active)!

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Header ── */}
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100/80 shrink-0 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col">
                <h1 className="text-lg font-extrabold text-gray-900 tracking-tight leading-tight">Settings</h1>
                <p className="text-xs text-gray-400 leading-tight">{activeSection.desc}</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-extrabold text-gray-900">Settings</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status pill */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700">All systems normal</span>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all duration-300 shadow-sm ${
                  saved
                    ? 'bg-emerald-500 text-white shadow-emerald-400/30'
                    : saving
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-blue-600/25'
                }`}
              >
                {saved ? (
                  <><CheckCircle className="w-4 h-4" /> Saved!</>
                ) : saving ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 md:pb-8">

            {/* ── Mobile tabs ── */}
            <div className="sm:hidden flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none -mx-1 px-1">
              {SECTIONS.map(s => {
                const Icon = s.icon
                return (
                  <button key={s.id} type="button" onClick={() => setActive(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      active === s.id
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
                    {s.label}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-6 max-w-5xl mx-auto">

              {/* ── Left nav ── */}
              <div className="hidden sm:block w-52 shrink-0">
                <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Configuration</p>
                  </div>
                  {SECTIONS.map((s, i) => {
                    const Icon = s.icon
                    const isActive = active === s.id
                    return (
                      <button key={s.id} type="button" onClick={() => setActive(s.id)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition-all duration-150 border-b border-gray-50 last:border-0 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50/80'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            isActive ? 'bg-white/20' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} strokeWidth={1.8} />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-white' : 'text-gray-700'}`}>{s.label}</p>
                            <p className={`text-[10px] leading-tight mt-0.5 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>{s.desc}</p>
                          </div>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? 'text-blue-200 translate-x-0.5' : 'text-gray-300'}`} />
                      </button>
                    )
                  })}
                </nav>

                {/* Quick info card */}
                <div className="mt-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-600/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-200" strokeWidth={2} />
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Pro Tip</p>
                  </div>
                  <p className="text-xs text-blue-100 leading-relaxed">Enable auto-approve to speed up listing time for verified landlords.</p>
                  <button
                    type="button"
                    onClick={() => setActive('listing')}
                    className="mt-3 text-xs font-bold text-white/80 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    Go to Listing Rules <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* ── Content ── */}
              <div className="flex-1 min-w-0 space-y-4">

                {/* ─── PLATFORM ─── */}
                {active === 'platform' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <SectionHeader title="Platform Information" desc="Basic details about your real estate platform." icon={Building2} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([
                        { key: 'name',     label: 'Platform Name',  icon: Building2  },
                        { key: 'tagline',  label: 'Tagline',         icon: Sparkles   },
                        { key: 'email',    label: 'Support Email',   icon: Mail       },
                        { key: 'phone',    label: 'Phone',           icon: Phone      },
                        { key: 'address',  label: 'Address',         icon: MapPin,    span: 'sm:col-span-2' },
                        { key: 'currency', label: 'Currency',        icon: CreditCard },
                        { key: 'country',  label: 'Country',         icon: Globe      },
                        { key: 'website',  label: 'Website URL',     icon: ArrowUpRight },
                      ] as FieldConfig[]).map(f => (
                        <InputField
                          key={f.key}
                          field={f}
                          value={(platform as any)[f.key]}
                          onChange={val => setPlatform(p => ({ ...p, [f.key]: val }))}
                        />
                      ))}
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={2} />
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Changes to platform name and email will reflect on all outgoing emails and SMS notifications. Remember to save.
                      </p>
                    </div>
                  </div>
                )}

                {/* ─── NOTIFICATIONS ─── */}
                {active === 'notifications' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <SectionHeader title="Notification Preferences" desc="Choose what alerts you receive and how." icon={Bell} />

                    <div className="space-y-2.5">
                      <ToggleRow
                        label="New landlord registration"
                        desc="Get notified when a new landlord registers"
                        enabled={notifications.newLandlord}
                        onChange={() => setNotifications(ns => ({ ...ns, newLandlord: !ns.newLandlord }))}
                        icon={Users}
                        badge="Email"
                        badgeColor="blue"
                      />
                      <ToggleRow
                        label="New enquiry received"
                        desc="Alert when a tenant sends a property enquiry"
                        enabled={notifications.newEnquiry}
                        onChange={() => setNotifications(ns => ({ ...ns, newEnquiry: !ns.newEnquiry }))}
                        icon={BellRing}
                        badge="Email"
                        badgeColor="blue"
                      />
                      <ToggleRow
                        label="New property listed"
                        desc="Alert when a landlord adds a new listing"
                        enabled={notifications.newProperty}
                        onChange={() => setNotifications(ns => ({ ...ns, newProperty: !ns.newProperty }))}
                        icon={Building2}
                        badge="Email"
                        badgeColor="blue"
                      />
                      <ToggleRow
                        label="Weekly summary report"
                        desc="Receive a weekly analytics digest every Monday"
                        enabled={notifications.weeklyReport}
                        onChange={() => setNotifications(ns => ({ ...ns, weeklyReport: !ns.weeklyReport }))}
                        icon={BarChart3}
                        badge="Digest"
                        badgeColor="green"
                      />
                      <ToggleRow
                        label="SMS alerts"
                        desc="Send critical platform alerts via SMS"
                        enabled={notifications.smsAlerts}
                        onChange={() => setNotifications(ns => ({ ...ns, smsAlerts: !ns.smsAlerts }))}
                        icon={Wifi}
                        badge="Paid"
                        badgeColor="amber"
                      />
                    </div>

                    {/* Channel summary */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {[
                        { label: 'Email alerts', count: [notifications.newLandlord, notifications.newEnquiry, notifications.newProperty, notifications.weeklyReport].filter(Boolean).length, total: 4, color: 'blue' },
                        { label: 'SMS alerts', count: notifications.smsAlerts ? 1 : 0, total: 1, color: 'amber' },
                        { label: 'Active total', count: Object.values(notifications).filter(Boolean).length, total: 5, color: 'green' },
                      ].map(c => (
                        <div key={c.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                          <p className={`text-xl font-extrabold ${
                            c.color === 'blue' ? 'text-blue-600' : c.color === 'amber' ? 'text-amber-600' : 'text-emerald-600'
                          }`}>{c.count}<span className="text-sm font-semibold text-gray-300">/{c.total}</span></p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">{c.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── SECURITY ─── */}
                {active === 'security' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <SectionHeader title="Security Settings" desc="Manage authentication and access control." icon={Shield} />

                    <div className="space-y-2.5">
                      {[
                        {
                          title: 'Two-Factor Authentication',
                          desc: 'Require 2FA for all admin logins',
                          enabled: true,
                          icon: Lock,
                          badge: 'Critical',
                          badgeColor: 'red' as const,
                        },
                        {
                          title: 'Session Timeout',
                          desc: 'Auto-logout after 30 minutes of inactivity',
                          enabled: true,
                          icon: Timer,
                          badge: 'Active',
                          badgeColor: 'green' as const,
                        },
                        {
                          title: 'Login Notifications',
                          desc: 'Email alert on every new admin login',
                          enabled: false,
                          icon: BellRing,
                          badge: undefined,
                          badgeColor: 'blue' as const,
                        },
                        {
                          title: 'IP Allowlist',
                          desc: 'Restrict admin access to specific IP ranges',
                          enabled: false,
                          icon: Wifi,
                          badge: 'Enterprise',
                          badgeColor: 'amber' as const,
                        },
                      ].map(s => (
                        <div key={s.title} className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-colors ${
                          s.enabled ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100 bg-white'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              s.enabled ? 'bg-emerald-100' : 'bg-gray-100'
                            }`}>
                              <s.icon className={`w-4 h-4 ${s.enabled ? 'text-emerald-600' : 'text-gray-400'}`} strokeWidth={1.7} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-semibold ${s.enabled ? 'text-emerald-900' : 'text-gray-700'}`}>{s.title}</p>
                                {s.badge && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                    s.badgeColor === 'red' ? 'bg-red-50 text-red-600'
                                    : s.badgeColor === 'green' ? 'bg-emerald-50 text-emerald-600'
                                    : s.badgeColor === 'amber' ? 'bg-amber-50 text-amber-700'
                                    : 'bg-blue-50 text-blue-600'
                                  }`}>{s.badge}</span>
                                )}
                              </div>
                              <p className={`text-xs mt-0.5 ${s.enabled ? 'text-emerald-700/60' : 'text-gray-400'}`}>{s.desc}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            s.enabled
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}>{s.enabled ? 'On' : 'Off'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Security score */}
                    <div className="flex items-center gap-5 p-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                      <div className="relative w-14 h-14 shrink-0">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                          <circle cx="28" cy="28" r="22" fill="none" stroke="#22d3ee" strokeWidth="4"
                            strokeDasharray={`${2 * Math.PI * 22 * 0.75} ${2 * Math.PI * 22 * 0.25}`}
                            strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-extrabold">75</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Security Score</p>
                        <p className="text-base font-extrabold text-white">Good — 2 settings inactive</p>
                        <p className="text-xs text-slate-400 mt-0.5">Enable Login Notifications & IP Allowlist to reach 100</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── LISTING RULES ─── */}
                {active === 'listing' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <SectionHeader title="Listing Rules" desc="Control how landlords can publish property listings." icon={Globe} />

                    <div className="space-y-2.5">
                      <ToggleRow
                        label="Auto-approve listings"
                        desc="Publish new listings without admin review"
                        enabled={listing.autoApprove}
                        onChange={() => setListing(l => ({ ...l, autoApprove: !l.autoApprove }))}
                        icon={Zap}
                        badge={listing.autoApprove ? 'On' : undefined}
                        badgeColor="amber"
                      />
                      <ToggleRow
                        label="Require property images"
                        desc="Landlords must upload at least one image"
                        enabled={listing.requireImages}
                        onChange={() => setListing(l => ({ ...l, requireImages: !l.requireImages }))}
                        icon={Image}
                      />
                      <ToggleRow
                        label="Require description"
                        desc="A text description is mandatory on all listings"
                        enabled={listing.requireDescription}
                        onChange={() => setListing(l => ({ ...l, requireDescription: !l.requireDescription }))}
                        icon={FileText}
                      />
                      <ToggleRow
                        label="Allow price negotiation"
                        desc='Enable "under negotiation" status on listings'
                        enabled={listing.allowNegotiation}
                        onChange={() => setListing(l => ({ ...l, allowNegotiation: !l.allowNegotiation }))}
                        icon={DollarSign}
                      />
                    </div>

                    {/* Max per landlord */}
                    <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <Hash className="w-4 h-4 text-gray-500" strokeWidth={1.7} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Max listings per landlord</p>
                          <p className="text-xs text-gray-400 mt-0.5">Limit how many active listings a single landlord can have at once</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range" min={1} max={100} step={1}
                          value={listing.maxPerLandlord}
                          onChange={e => setListing(l => ({ ...l, maxPerLandlord: Number(e.target.value) }))}
                          className="flex-1 accent-blue-600 h-1.5 rounded-full"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min={1} max={100}
                            value={listing.maxPerLandlord}
                            onChange={e => setListing(l => ({ ...l, maxPerLandlord: Number(e.target.value) }))}
                            className="w-16 border border-gray-200 rounded-xl px-2.5 py-2 text-sm font-bold text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                          <span className="text-xs text-gray-400 whitespace-nowrap">max</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-300 mt-1.5 px-0.5">
                        <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
                      </div>
                    </div>

                    {/* Active rules summary */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={2} />
                      <p className="text-xs text-blue-700 font-medium">
                        {[listing.autoApprove, listing.requireImages, listing.requireDescription, listing.allowNegotiation].filter(Boolean).length} of 4 listing rules active · Max {listing.maxPerLandlord} listings per landlord
                      </p>
                    </div>
                  </div>
                )}

                {/* ─── BILLING ─── */}
                {active === 'billing' && (
                  <div className="space-y-4">
                    {/* Plan card */}
                    <div className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 rounded-2xl p-6 text-white overflow-hidden shadow-xl shadow-blue-600/25">
                      {/* Decorative rings */}
                      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full border border-white/10" />
                      <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full border border-white/10" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full border border-white/10 translate-y-1/2 -translate-x-1/2" />

                      <div className="relative">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-200">Current Plan</span>
                              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">Active</span>
                            </div>
                            <p className="text-3xl font-extrabold tracking-tight">Enterprise</p>
                            <p className="text-sm text-blue-200 mt-1">Unlimited listings · Priority support · API access</p>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" strokeWidth={1.7} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-5">
                          {[
                            { label: 'Listings', value: '∞', sub: 'unlimited' },
                            { label: 'Team seats', value: '25', sub: 'admin users' },
                            { label: 'Uptime SLA', value: '99.9%', sub: 'guaranteed' },
                          ].map(f => (
                            <div key={f.label} className="bg-white/10 rounded-xl p-3 text-center">
                              <p className="text-lg font-extrabold text-white">{f.value}</p>
                              <p className="text-[10px] text-blue-200 font-medium mt-0.5">{f.sub}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/20">
                          <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-blue-200" strokeWidth={2} />
                            <p className="text-sm text-blue-200">Renews <span className="text-white font-bold">1 June 2027</span></p>
                          </div>
                          <button type="button" className="text-sm font-bold text-white/80 hover:text-white transition-colors flex items-center gap-1">
                            Manage Plan <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Usage stats */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Usage Overview</h2>
                          <p className="text-xs text-gray-400 mt-0.5">Billing cycle: May – June 2026</p>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Healthy</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Active Listings', value: '902+', pct: 90, color: 'blue' },
                          { label: 'Landlords', value: '319+', pct: 64, color: 'violet' },
                          { label: 'Monthly Visits', value: '12,400', pct: 42, color: 'emerald' },
                        ].map(s => (
                          <div key={s.label} className="rounded-xl border border-gray-100 p-4 space-y-2.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  s.color === 'blue' ? 'bg-blue-500'
                                  : s.color === 'violet' ? 'bg-violet-500'
                                  : 'bg-emerald-500'
                                }`}
                                style={{ width: `${s.pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">{s.pct}% capacity used</p>
                          </div>
                        ))}
                      </div>

                      {/* Invoice row */}
                      <div className="pt-2 border-t border-gray-50 space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Invoices</p>
                        {[
                          { period: 'May 2026', amount: '₦240,000', status: 'Paid' },
                          { period: 'April 2026', amount: '₦240,000', status: 'Paid' },
                          { period: 'March 2026', amount: '₦240,000', status: 'Paid' },
                        ].map(inv => (
                          <div key={inv.period} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                                <CreditCard className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.7} />
                              </div>
                              <p className="text-sm font-semibold text-gray-700">{inv.period}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-bold text-gray-900">{inv.amount}</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{inv.status}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
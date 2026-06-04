import { useState, useEffect } from 'react'
import {
  Building2, Bell, Shield, Globe, CreditCard, Save,
  CheckCircle, Mail, Phone, MapPin, RefreshCw,
  Lock, Timer, BellRing, Wifi, Zap, Image,
  FileText, DollarSign, Hash, Users, BarChart3,
  ArrowUpRight, Activity, TrendingUp,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const SECTIONS = [
  { id: 'platform',      label: 'Platform',       icon: Building2  },
  { id: 'notifications', label: 'Notifications',   icon: Bell       },
  { id: 'security',      label: 'Security',         icon: Shield     },
  { id: 'listing',       label: 'Listing Rules',    icon: Globe      },
  { id: 'billing',       label: 'Billing',          icon: CreditCard },
]

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={e => { e.stopPropagation(); onChange() }}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-[#D8D5CC]'
      }`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function FieldInput({
  label, value, onChange, icon: Icon, mono = false,
}: {
  label: string; value: string; onChange: (v: string) => void; icon: React.ElementType; mono?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.14em] text-gray-400 uppercase mb-1.5">{label}</label>
      <div className={`flex items-center gap-2.5 border rounded-lg px-3 py-2.5 bg-white transition-all ${
        focused ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-gray-200 hover:border-gray-300'
      }`}>
        <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${focused ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={1.8} />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`flex-1 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none bg-transparent ${mono ? 'font-mono' : ''}`}
        />
      </div>
    </div>
  )
}

function ToggleRow({
  label, desc, enabled, onChange, icon: Icon, tag,
}: {
  label: string; desc: string; enabled: boolean; onChange: () => void; icon?: React.ElementType; tag?: string
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
        enabled
          ? 'bg-blue-50/40 border-blue-100'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onChange}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            enabled ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Icon className={`w-3.5 h-3.5 ${enabled ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={1.8} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${enabled ? 'text-gray-800' : 'text-gray-600'}`}>{label}</span>
            {tag && (
              <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{tag}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{desc}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  )
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">{title}</h2>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-gray-100 my-6" />
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
    }, 800)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Top bar ── */}
          <header className="flex items-center justify-between pl-14 pr-6 md:pl-8 md:pr-8 py-3.5 bg-[#F4F6FB] border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <p className="text-xs font-mono text-gray-400 hidden sm:block">livana / admin /</p>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight">settings</h1>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold tracking-wide rounded-lg transition-all duration-200 ${
                saved
                  ? 'bg-[#3B6D11] text-white'
                  : saving
                  ? 'bg-blue-600/60 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
              }`}
            >
              {saved
                ? <><CheckCircle className="w-3.5 h-3.5" /> saved</>
                : saving
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> saving…</>
                : <><Save className="w-3.5 h-3.5" /> save changes</>
              }
            </button>
          </header>

          {/* ── Tab bar ── */}
          <div className="flex items-end gap-0 pl-14 md:pl-8 border-b border-gray-200 bg-[#F4F6FB] shrink-0 overflow-x-auto scrollbar-none">
            {SECTIONS.map(s => {
              const Icon = s.icon
              const isActive = active === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all duration-150 border-b-2 -mb-px ${
                    isActive
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : ''}`} strokeWidth={1.8} />
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">

              {/* ─── PLATFORM ─── */}
              {active === 'platform' && (
                <div>
                  <SectionTitle title="Platform information" sub="Public-facing details about your real estate platform." />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <FieldInput label="Platform name" value={platform.name} onChange={v => setPlatform(p => ({ ...p, name: v }))} icon={Building2} />
                    <FieldInput label="Tagline" value={platform.tagline} onChange={v => setPlatform(p => ({ ...p, tagline: v }))} icon={Globe} />
                    <FieldInput label="Support email" value={platform.email} onChange={v => setPlatform(p => ({ ...p, email: v }))} icon={Mail} mono />
                    <FieldInput label="Phone" value={platform.phone} onChange={v => setPlatform(p => ({ ...p, phone: v }))} icon={Phone} mono />
                    <div className="sm:col-span-2">
                      <FieldInput label="Address" value={platform.address} onChange={v => setPlatform(p => ({ ...p, address: v }))} icon={MapPin} />
                    </div>
                    <FieldInput label="Currency" value={platform.currency} onChange={v => setPlatform(p => ({ ...p, currency: v }))} icon={CreditCard} mono />
                    <FieldInput label="Country" value={platform.country} onChange={v => setPlatform(p => ({ ...p, country: v }))} icon={Globe} />
                    <div className="sm:col-span-2">
                      <FieldInput label="Website" value={platform.website} onChange={v => setPlatform(p => ({ ...p, website: v }))} icon={ArrowUpRight} mono />
                    </div>
                  </div>
                  <Divider />
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/40 border border-blue-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Platform name and support email are used in all outgoing emails and SMS notifications. Save changes to apply globally.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── NOTIFICATIONS ─── */}
              {active === 'notifications' && (
                <div>
                  <SectionTitle title="Notification preferences" sub="Control which events trigger alerts and how they are delivered." />
                  <div className="space-y-2">
                    <ToggleRow
                      label="New landlord registration" desc="Triggered when a new landlord completes sign-up"
                      enabled={notifications.newLandlord} onChange={() => setNotifications(n => ({ ...n, newLandlord: !n.newLandlord }))}
                      icon={Users} tag="email"
                    />
                    <ToggleRow
                      label="New enquiry received" desc="Alert when a tenant submits a property enquiry"
                      enabled={notifications.newEnquiry} onChange={() => setNotifications(n => ({ ...n, newEnquiry: !n.newEnquiry }))}
                      icon={BellRing} tag="email"
                    />
                    <ToggleRow
                      label="New property listed" desc="Alert when a landlord publishes a new listing"
                      enabled={notifications.newProperty} onChange={() => setNotifications(n => ({ ...n, newProperty: !n.newProperty }))}
                      icon={Building2} tag="email"
                    />
                    <ToggleRow
                      label="Weekly summary report" desc="Analytics digest delivered every Monday morning"
                      enabled={notifications.weeklyReport} onChange={() => setNotifications(n => ({ ...n, weeklyReport: !n.weeklyReport }))}
                      icon={BarChart3} tag="digest"
                    />
                    <ToggleRow
                      label="SMS alerts" desc="Critical platform alerts sent via SMS (Twilio)"
                      enabled={notifications.smsAlerts} onChange={() => setNotifications(n => ({ ...n, smsAlerts: !n.smsAlerts }))}
                      icon={Wifi} tag="paid"
                    />
                  </div>
                  <Divider />
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Email on', val: [notifications.newLandlord, notifications.newEnquiry, notifications.newProperty, notifications.weeklyReport].filter(Boolean).length, of: 4 },
                      { label: 'SMS on', val: notifications.smsAlerts ? 1 : 0, of: 1 },
                      { label: 'Total active', val: Object.values(notifications).filter(Boolean).length, of: 5 },
                    ].map(s => (
                      <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-extrabold text-gray-900 font-mono">{s.val}<span className="text-sm text-gray-300">/{s.of}</span></p>
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── SECURITY ─── */}
              {active === 'security' && (
                <div>
                  <SectionTitle title="Security settings" sub="Manage authentication, session control, and access restrictions." />
                  <div className="space-y-2">
                    {[
                      { title: '2FA for all admins', desc: 'Require two-factor auth on every admin login', enabled: true, icon: Lock, tag: 'critical' },
                      { title: 'Session timeout (30 min)', desc: 'Auto-logout after 30 minutes of inactivity', enabled: true, icon: Timer, tag: 'active' },
                      { title: 'Login notifications', desc: 'Email alert triggered on every new admin login', enabled: false, icon: BellRing, tag: undefined },
                      { title: 'IP allowlist', desc: 'Restrict admin access to specific IP ranges', enabled: false, icon: Wifi, tag: 'enterprise' },
                    ].map(s => (
                      <div key={s.title} className={`flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border ${
                        s.enabled ? 'bg-[#F7FBF4] border-[#C8DDB0]' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            s.enabled ? 'bg-[#DDF0CB]' : 'bg-gray-100'
                          }`}>
                            <s.icon className={`w-3.5 h-3.5 ${s.enabled ? 'text-[#3B6D11]' : 'text-gray-400'}`} strokeWidth={1.8} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${s.enabled ? 'text-gray-900' : 'text-gray-600'}`}>{s.title}</span>
                              {s.tag && (
                                <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${
                                  s.tag === 'critical' ? 'bg-[#FCEBEB] text-[#A32D2D]'
                                  : s.tag === 'active' ? 'bg-[#EAF3DE] text-[#3B6D11]'
                                  : 'bg-gray-100 text-gray-400'
                                }`}>{s.tag}</span>
                              )}
                            </div>
                            <p className={`text-xs mt-0.5 ${s.enabled ? 'text-[#5A7A45]' : 'text-gray-400'}`}>{s.desc}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md border ${
                          s.enabled
                            ? 'bg-[#EAF3DE] border-[#C8DDB0] text-[#3B6D11]'
                            : 'bg-[#F4F6FB] border-gray-200 text-gray-400'
                        }`}>{s.enabled ? 'ON' : 'OFF'}</span>
                      </div>
                    ))}
                  </div>
                  <Divider />
                  {/* Score bar */}
                  <div className="flex items-center gap-5 p-5 rounded-xl bg-[#1E1C18] text-white">
                    <div className="shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#6E6A62] mb-1">Security score</p>
                      <p className="text-4xl font-extrabold font-mono text-white">75<span className="text-xl text-[#6E6A62]">/100</span></p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: '75%' }} />
                      </div>
                      <p className="text-xs text-[#6E6A62]">Enable Login Notifications + IP Allowlist to reach 100</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── LISTING RULES ─── */}
              {active === 'listing' && (
                <div>
                  <SectionTitle title="Listing rules" sub="Control publishing constraints and requirements for landlord listings." />
                  <div className="space-y-2">
                    <ToggleRow
                      label="Auto-approve listings" desc="Bypass admin review and publish listings immediately"
                      enabled={listing.autoApprove} onChange={() => setListing(l => ({ ...l, autoApprove: !l.autoApprove }))}
                      icon={Zap} tag={listing.autoApprove ? 'on' : undefined}
                    />
                    <ToggleRow
                      label="Require property images" desc="Landlords must upload at least one photo"
                      enabled={listing.requireImages} onChange={() => setListing(l => ({ ...l, requireImages: !l.requireImages }))}
                      icon={Image}
                    />
                    <ToggleRow
                      label="Require description" desc="Text description is mandatory on all listings"
                      enabled={listing.requireDescription} onChange={() => setListing(l => ({ ...l, requireDescription: !l.requireDescription }))}
                      icon={FileText}
                    />
                    <ToggleRow
                      label="Allow price negotiation" desc='Enables "under negotiation" status on listings'
                      enabled={listing.allowNegotiation} onChange={() => setListing(l => ({ ...l, allowNegotiation: !l.allowNegotiation }))}
                      icon={DollarSign}
                    />
                  </div>
                  <Divider />
                  {/* Max per landlord */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Hash className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Max listings per landlord</p>
                        <p className="text-xs text-gray-400">Cap on simultaneous active listings per account</p>
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
                    <div className="flex justify-between text-[10px] text-gray-300 font-mono mt-2 px-0.5">
                      {['1','25','50','75','100'].map(v => <span key={v}>{v}</span>)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50/40 border border-blue-100">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" strokeWidth={2} />
                    <p className="text-xs text-blue-700">
                      {[listing.autoApprove, listing.requireImages, listing.requireDescription, listing.allowNegotiation].filter(Boolean).length} of 4 rules active · {listing.maxPerLandlord} listings max per landlord
                    </p>
                  </div>
                </div>
              )}

              {/* ─── BILLING ─── */}
              {active === 'billing' && (
                <div className="space-y-5">
                  {/* Plan block */}
                  <div className="bg-[#1E1C18] rounded-2xl p-6 text-white relative overflow-hidden">
                    {/* subtle grid texture */}
                    <div className="absolute inset-0 opacity-[0.04]"
                      style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 0, transparent 50%), repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '32px 32px' }} />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6E6A62] mb-1">Current plan</p>
                          <p className="text-3xl font-extrabold tracking-tight text-white">Enterprise</p>
                          <p className="text-sm text-[#6E6A62] mt-1">Unlimited listings · Priority support · API access</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold tracking-widest uppercase border border-blue-400/30">Active</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                          { label: 'Listings', val: '∞' },
                          { label: 'Admin seats', val: '25' },
                          { label: 'SLA uptime', val: '99.9%' },
                        ].map(f => (
                          <div key={f.label} className="border border-blue-900/40 rounded-xl p-3 text-center bg-blue-900/30">
                            <p className="text-xl font-extrabold font-mono text-white">{f.val}</p>
                            <p className="text-[10px] text-[#6E6A62] mt-0.5 uppercase tracking-wider">{f.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-blue-900/30">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-[#6E6A62]" strokeWidth={1.8} />
                          <p className="text-xs text-[#6E6A62]">Renews <span className="text-blue-300 font-bold">1 June 2027</span></p>
                        </div>
                        <button type="button" className="text-xs font-bold text-blue-300 hover:text-white transition-colors flex items-center gap-1">
                          Manage plan <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Usage — May 2026</p>
                        <p className="text-xs text-gray-400">Billing cycle overview</p>
                      </div>
                      <span className="px-2 py-1 rounded-md bg-[#EAF3DE] text-[#3B6D11] text-[10px] font-bold uppercase tracking-widest border border-[#C8DDB0]">Healthy</span>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: 'Active Listings', val: '902', cap: 1000, unit: '' },
                        { label: 'Landlords', val: '319', cap: 500, unit: '' },
                        { label: 'Monthly Visits', val: '12,400', cap: 30000, unit: '' },
                      ].map(s => {
                        const raw = parseInt(s.val.replace(',', ''))
                        const pct = Math.round((raw / s.cap) * 100)
                        return (
                          <div key={s.label}>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-semibold text-gray-600">{s.label}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold font-mono text-gray-900">{s.val}</p>
                                <span className="text-[10px] text-gray-400 font-mono">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Invoices */}
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">Recent invoices</p>
                      <TrendingUp className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.8} />
                    </div>
                    {[
                      { period: 'May 2026', amount: '₦240,000' },
                      { period: 'April 2026', amount: '₦240,000' },
                      { period: 'March 2026', amount: '₦240,000' },
                    ].map((inv, i) => (
                      <div key={inv.period} className={`flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 cursor-pointer group transition-colors ${i < 2 ? 'border-b border-gray-100' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                            <CreditCard className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.8} />
                          </div>
                          <p className="text-sm font-semibold text-gray-600">{inv.period}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold font-mono text-gray-900">{inv.amount}</p>
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#EAF3DE] text-[#3B6D11] border border-[#C8DDB0]">Paid</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
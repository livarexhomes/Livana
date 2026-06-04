import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Bell, Shield, Globe, Save, CreditCard,
  CheckCircle, Mail, Phone, MapPin, User, Wifi,
  Lock, Timer, BellRing, Zap, Image,
  FileText, DollarSign, Hash, Users, BarChart3,
  ArrowUpRight, AlertCircle,
  Eye, EyeOff, Send, TestTube, Trash2, Plus,
  Key, Smartphone, Webhook, Loader2, Check, X,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const SECTIONS = [
  { id: 'platform',      label: 'Platform',       icon: Building2  },
  { id: 'notifications', label: 'Notifications',   icon: Bell       },
  { id: 'email',         label: 'Email (Resend)',  icon: Mail       },
  { id: 'security',      label: 'Security',         icon: Shield     },
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
  weeklyReport: boolean
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
}

interface EmailConfig {
  resendApiKey: string
  fromEmail: string
  fromName: string
  enabled: boolean
}

// ── UI Components ────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange, loading = false }: { enabled: boolean; onChange: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={loading}
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
  icon: React.ElementType
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
  label, desc, enabled, onChange, icon: Icon, tag, loading = false,
}: {
  label: string
  desc: string
  enabled: boolean
  onChange: () => void
  icon?: React.ElementType
  tag?: string
  loading?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
        enabled
          ? 'bg-blue-50/40 border-blue-100'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={!loading ? onChange : undefined}
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
              <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${
                tag === 'live' ? 'bg-green-100 text-green-700' :
                tag === 'test' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-400'
              }`}>{tag}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{desc}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} loading={loading} />
    </div>
  )
}

function SectionTitle({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
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

// ── Main Component ───────────────────────────────────────────────────────────

export default function AdminSettings() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [active, setActive] = useState('platform')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [testEmailResult, setTestEmailResult] = useState<{success?: boolean; message?: string} | null>(null)
  const [newIp, setNewIp] = useState('')

  const [platform, setPlatform] = useState<PlatformSettings>({
    name: 'Livana Property Manager',
    tagline: "Nigeria's most trusted property platform",
    email: 'support@livana.ng',
    phone: '+234 800 548 2621',
    address: '14 Bourdillon Road, Ikoyi, Lagos',
    currency: 'NGN',
    country: 'Nigeria',
    website: 'https://livana.ng',
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    newLandlord: true,
    newEnquiry: true,
    newProperty: false,
    weeklyReport: true,
    smsAlerts: false,
    adminEmail: 'admin@livana.ng',
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
  })

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    resendApiKey: '',
    fromEmail: 'noreply@livana.ng',
    fromName: 'Livana',
    enabled: false,
  })

  // Load settings from database
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email, id: user?.id })
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
          case 'email_config':
            setEmailConfig(prev => ({ ...prev, ...row.value }))
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
    if (!emailConfig.resendApiKey || !notifications.adminEmail) {
      setTestEmailResult({ success: false, message: 'Please configure Resend API key and admin email first' })
      return
    }

    setTestEmailLoading(true)
    setTestEmailResult(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('send-admin-email', {
        body: {
          to: notifications.adminEmail,
          subject: 'Test Email from Livana Admin',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2563eb;">Test Email Successful!</h1>
              <p>Your Resend email configuration is working correctly.</p>
              <p style="color: #666; font-size: 14px;">Sent from Livana Admin Settings</p>
            </div>
          `,
        },
      })

      if (error) {
        throw new Error(error.message || 'Failed to send test email')
      }

      if (data?.success) {
        setTestEmailResult({ success: true, message: 'Test email sent successfully!' })
      } else {
        setTestEmailResult({ success: false, message: data?.error || 'Failed to send test email' })
      }
    } catch (err: any) {
      console.error('Test email error:', err)
      setTestEmailResult({ success: false, message: err.message || 'Network error - ensure the edge function is deployed' })
    } finally {
      setTestEmailLoading(false)
    }
  }

  // Add IP to allowlist
  const addIp = () => {
    if (!newIp || security.allowedIps.includes(newIp)) return
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(newIp)) {
      alert('Please enter a valid IP address')
      return
    }
    setSecurity(prev => ({ ...prev, allowedIps: [...prev.allowedIps, newIp] }))
    setNewIp('')
  }

  // Remove IP from allowlist
  const removeIp = (ip: string) => {
    setSecurity(prev => ({ ...prev, allowedIps: prev.allowedIps.filter(i => i !== ip) }))
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  if (loading) {
    return (
      <AuthGuard require="admin">
        <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
          <AdminSidebar userEmail={user?.email} userName={displayName} />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Top bar ── */}
          <header className="flex items-center justify-between pl-14 pr-6 md:pl-8 md:pr-8 py-3.5 bg-white border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <p className="text-xs font-mono text-gray-400 hidden sm:block">livana / admin /</p>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight">settings</h1>
            </div>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold tracking-wide rounded-lg transition-all duration-200 ${
                  saving
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
                }`}
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> Save Changes</>
                )}
              </button>
            </div>
          </header>

          {/* ── Tab bar ── */}
          <div className="flex items-end gap-0 pl-14 md:pl-8 border-b border-gray-200 bg-white shrink-0 overflow-x-auto scrollbar-none">
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
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">

              {/* ─── PLATFORM ─── */}
              {active === 'platform' && (
                <div>
                  <SectionTitle 
                    title="Platform Information" 
                    sub="Public-facing details about your real estate platform."
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
                  />
                  
                  <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                    <label className="block text-[10px] font-bold tracking-[0.14em] text-gray-400 uppercase mb-2">
                      Admin Email Address
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <FieldInput
                          label=""
                          value={notifications.adminEmail}
                          onChange={v => setNotifications(n => ({ ...n, adminEmail: v }))}
                          icon={Mail}
                          mono
                          placeholder="admin@livana.ng"
                        />
                      </div>
                      <div className="pt-5">
                        <StatusBadge 
                          status={notifications.adminEmail ? 'success' : 'warning'} 
                          text={notifications.adminEmail ? 'Configured' : 'Not Set'} 
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      All admin notifications will be sent to this email address.
                    </p>
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
                    <ToggleRow
                      label="Weekly Summary Report" 
                      desc="Analytics digest delivered every Monday morning"
                      enabled={notifications.weeklyReport} 
                      onChange={() => setNotifications(n => ({ ...n, weeklyReport: !n.weeklyReport }))}
                      icon={BarChart3} 
                      tag="digest"
                    />
                    <ToggleRow
                      label="SMS Alerts" 
                      desc="Critical platform alerts sent via SMS (requires Twilio)"
                      enabled={notifications.smsAlerts} 
                      onChange={() => setNotifications(n => ({ ...n, smsAlerts: !n.smsAlerts }))}
                      icon={Smartphone} 
                      tag="paid"
                    />
                  </div>
                  <Divider />
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Email On', val: [notifications.newLandlord, notifications.newEnquiry, notifications.newProperty, notifications.weeklyReport].filter(Boolean).length, of: 4 },
                      { label: 'SMS On', val: notifications.smsAlerts ? 1 : 0, of: 1 },
                      { label: 'Total Active', val: Object.values(notifications).filter(v => typeof v === 'boolean' && v).length, of: 5 },
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
                          placeholder="noreply@livana.ng"
                        />
                        <FieldInput
                          label="From Name"
                          value={emailConfig.fromName}
                          onChange={v => setEmailConfig(c => ({ ...c, fromName: v }))}
                          icon={User}
                          placeholder="Livana"
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
                            <li>Verify your domain (e.g., livana.ng)</li>
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
                  />
                  <div className="space-y-2">
                    <ToggleRow
                      label="Two-Factor Authentication"
                      desc="Require 2FA for all admin accounts"
                      enabled={security.twoFactorAuth}
                      onChange={() => setSecurity(s => ({ ...s, twoFactorAuth: !s.twoFactorAuth }))}
                      icon={Lock}
                      tag={security.twoFactorAuth ? 'critical' : undefined}
                    />
                    <ToggleRow
                      label="Login Notifications"
                      desc="Email alert on every new admin login"
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
                      tag="enterprise"
                    />
                  </div>

                  {/* Session Timeout */}
                  <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Timer className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Session Timeout</p>
                        <p className="text-xs text-gray-400">Minutes of inactivity before auto-logout</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range" min={5} max={120} step={5}
                        value={security.sessionTimeout}
                        onChange={e => setSecurity(s => ({ ...s, sessionTimeout: Number(e.target.value) }))}
                        style={{ accentColor: '#2563eb' }}
                        className="flex-1 h-1.5 rounded-full"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={5} max={120}
                          value={security.sessionTimeout}
                          onChange={e => setSecurity(s => ({ ...s, sessionTimeout: Number(e.target.value) }))}
                          className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
                        />
                        <span className="text-xs text-gray-400">min</span>
                      </div>
                    </div>
                  </div>

                  {/* IP Allowlist Management */}
                  {security.ipAllowlist && (
                    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-900">Allowed IP Addresses</p>
                        <span className="text-xs text-gray-400">{security.allowedIps.length} IPs configured</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={newIp}
                          onChange={e => setNewIp(e.target.value)}
                          placeholder="192.168.1.1"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          onKeyDown={e => e.key === 'Enter' && addIp()}
                        />
                        <button
                          onClick={addIp}
                          disabled={!newIp}
                          className="px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {security.allowedIps.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">No IPs added yet</p>
                        ) : (
                          security.allowedIps.map(ip => (
                            <div key={ip} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                              <code className="text-xs font-mono text-gray-700">{ip}</code>
                              <button
                                onClick={() => removeIp(ip)}
                                className="p-1 hover:bg-red-100 rounded transition-colors text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <Divider />
                  {/* Security Score */}
                  <div className="flex items-center gap-5 p-5 rounded-xl bg-gray-900 text-white">
                    <div className="shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Security Score</p>
                      <p className="text-4xl font-extrabold font-mono text-white">
                        {[
                          security.twoFactorAuth,
                          security.loginNotifications,
                          security.ipAllowlist,
                          security.sessionTimeout <= 30,
                        ].filter(Boolean).length * 20}
                        <span className="text-xl text-gray-500">/100</span>
                      </p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-blue-500 transition-all" 
                          style={{ width: `${[security.twoFactorAuth, security.loginNotifications, security.ipAllowlist, security.sessionTimeout <= 30].filter(Boolean).length * 20}%` }} 
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {!security.twoFactorAuth && 'Enable 2FA for maximum security. '}
                        {!security.loginNotifications && 'Turn on login notifications. '}
                        {security.sessionTimeout > 30 && 'Reduce session timeout. '}
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

                  <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-100">
                    <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2} />
                    <p className="text-sm text-blue-700">
                      {[listing.autoApprove, listing.requireImages, listing.requireDescription, listing.allowNegotiation].filter(Boolean).length} of 4 rules active
                    </p>
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

import { useState, useEffect } from 'react'
import {
  Bell, Shield, Phone, Mail, Save, CheckCircle,
  MessageSquare, Eye, EyeOff, Key, ChevronRight,
  Globe, User, Lock, Laptop, Sparkles, ShieldCheck,
  MessageCircle, Trash2, Loader2, AlertTriangle, X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'
import { useToast } from '../../hooks/use-toast'

const SECTIONS = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account',       label: 'Account',        icon: User },
  { id: 'security',      label: 'Security',       icon: Shield },
  { id: 'whatsapp',      label: 'WhatsApp',       icon: Phone },
]

const NOTIF_ITEMS = [
  { key: 'enquiryEmail',    label: 'New enquiry (Email)',      desc: 'Get an email when a tenant enquires about your listing',       icon: Mail,           color: '#EFF6FF', iconColor: '#2563EB' },
  { key: 'statusEmail',     label: 'Listing status updates',  desc: 'Email when your listing is approved or needs changes',         icon: CheckCircle,    color: '#EFF6FF', iconColor: '#2563EB' },
  { key: 'reviewEmail',     label: 'Review & feedback alerts', desc: 'Email when a tenant leaves feedback on your property',        icon: MessageSquare,  color: '#FFF7ED', iconColor: '#EA580C' },
  { key: 'weeklyDigest',    label: 'Weekly summary digest',   desc: 'Receive a weekly report of your listing views and enquiries',  icon: Globe,          color: '#F5F3FF', iconColor: '#7C3AED' },
  { key: 'newMessage',      label: 'New direct messages',     desc: 'Alert when a tenant sends you a direct message',               icon: Bell,           color: '#EFF6FF', iconColor: '#2563EB' },
]

const WA_TOGGLES = [
  { key: 'showOnListing', label: 'Show WhatsApp button on listings', desc: 'Allow tenants to contact you directly via WhatsApp' },
  { key: 'autoReply',     label: 'Enable auto-reply message',        desc: 'Automatically send a reply when a tenant first messages you' },
]

function getPasswordStrength(val: string): { score: number; label: string; color: string } {
  if (!val) return { score: 0, label: '', color: '' }
  let score = 0
  if (val.length >= 8) score++
  if (/[A-Z]/.test(val)) score++
  if (/[0-9]/.test(val)) score++
  if (/[^A-Za-z0-9]/.test(val)) score++
  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak',   color: '#EF4444' },
    2: { label: 'Fair',   color: '#F97316' },
    3: { label: 'Good',   color: '#EAB308' },
    4: { label: 'Strong', color: '#22C55E' },
  }
  return { score, ...map[score] }
}

// ── Toggle component ──────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={on}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        background: on ? '#2563EB' : '#CBD5E1',
        transition: 'background .2s',
        flexShrink: 0,
        marginTop: 2,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: on ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transition: 'left .2s',
        display: 'block',
      }} />
    </button>
  )
}

// ── Input wrapper ─────────────────────────────────────────────────────────────
function InputWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      border: '1px solid #E5E7EB', borderRadius: 16,
      padding: '0 16px', height: 46, background: '#FFFFFF',
      transition: 'box-shadow .2s ease, border-color .2s ease',
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}
      onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)', e.currentTarget.style.borderColor = '#93C5FD')}
      onBlur={e => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)', e.currentTarget.style.borderColor = '#E5E7EB')}
    >
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  flex: 1, border: 'none', outline: 'none',
  fontSize: 15, color: '#0F172A', background: 'transparent',
  fontFamily: 'inherit', minWidth: 0,
}

const iconStyle: React.CSSProperties = { width: 16, height: 16, color: '#94A3B8', flexShrink: 0 }

// ── Field label ───────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 11.5, fontWeight: 600,
      color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 7,
    }}>
      {children}
    </label>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(226,232,240,0.7)',
      borderRadius: 24, padding: 28,
      boxShadow: '0 20px 50px rgba(15,23,42,0.06)', marginBottom: 24, ...style,
    }}>
      {children}
    </div>
  )
}

function CardHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #E5E7EB' }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{title}</p>
      <p style={{ fontSize: 14, color: '#64748B', marginTop: 6, lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

// ── Submit button ─────────────────────────────────────────────────────────────
function SubmitBtn({ onClick, children, loading }: { onClick: () => void; children: React.ReactNode; loading?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={loading} style={{
      width: '100%', padding: '14px 18px', fontSize: 15, fontWeight: 700,
      color: '#fff', background: loading ? '#93C5FD' : '#2563EB', border: 'none',
      borderRadius: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10,
      fontFamily: 'inherit', transition: 'background .18s ease, transform .18s ease',
      boxShadow: loading ? 'none' : '0 15px 30px rgba(37,99,235,0.18)',
    }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1d4ed8' }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2563EB' }}
    >
      {loading ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Saving...</> : children}
    </button>
  )
}

// ── Section breadcrumb ────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563EB' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.18em' }}>
        {children}
      </span>
    </div>
  )
}

// ── Password field ────────────────────────────────────────────────────────────
function PasswordField({
  label, placeholder, value, onChange,
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ marginBottom: 18 }}>
      <FieldLabel>{label}</FieldLabel>
      <InputWrap>
        <Lock style={iconStyle} strokeWidth={1.7} />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 2 }}>
          {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
        </button>
      </InputWrap>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function LandlordSettings() {
  const { toast } = useToast()
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [active, setActive] = useState('notifications')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [settingsId, setSettingsId] = useState<string | null>(null)

  const [notifs, setNotifs] = useState({
    enquiryEmail:    true,
    statusEmail:     true,
    reviewEmail:     true,
    weeklyDigest:    false,
    newMessage:      true,
  })

  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const [whatsapp, setWhatsapp] = useState({
    number: '',
    autoReply: false,
    autoReplyMsg: 'Hello! Thanks for your enquiry. I will get back to you shortly.',
    showOnListing: true,
  })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Add spin animation styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  // Delete account handler
  async function deleteAccount() {
    if (deleteConfirmText !== 'DELETE') {
      toast({ title: 'Error', description: 'Please type DELETE to confirm', variant: 'destructive' })
      return
    }
    if (!landlord?.id || !user?.id) return

    setDeleting(true)
    const supabase = createClient()

    try {
      // 1. Delete landlord's properties (and their images via cascade)
      const { error: propsError } = await supabase
        .from('properties')
        .delete()
        .eq('landlord_id', landlord.id)

      if (propsError) throw propsError

      // 2. Delete landlord settings
      const { error: settingsError } = await supabase
        .from('landlord_settings')
        .delete()
        .eq('landlord_id', landlord.id)

      if (settingsError) throw settingsError

      // 3. Delete landlord record
      const { error: landlordError } = await supabase
        .from('landlords')
        .delete()
        .eq('id', landlord.id)

      if (landlordError) throw landlordError

      // 4. Sign out
      await supabase.auth.signOut()

      // 5. Redirect to home
      window.location.href = '/'

      toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted.' })
    } catch (err: any) {
      console.error('Delete account error:', err)
      toast({ title: 'Error', description: err.message || 'Failed to delete account', variant: 'destructive' })
      setDeleting(false)
    }
  }

  // Load data
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email, id: user.id })
      
      // Load landlord data
      const { data: l } = await supabase
        .from('landlords')
        .select('*')
        .eq('user_id', user.id)
        .single() as { data: Landlord | null }
      
      setLandlord(l)
      if (l) {
        setDisplayName(l.full_name ?? '')
        
        // Load or create settings
        const { data: settings } = await supabase
          .from('landlord_settings')
          .select('*')
          .eq('landlord_id', l.id)
          .single()
        
        if (settings) {
          setSettingsId(settings.id)
          if (settings.notifications) {
            setNotifs(settings.notifications)
          }
          if (settings.whatsapp) {
            setWhatsapp(settings.whatsapp)
          }
        } else {
          // Create default settings
          const { data: newSettings } = await supabase
            .from('landlord_settings')
            .insert({ landlord_id: l.id })
            .select()
            .single()
          if (newSettings) {
            setSettingsId(newSettings.id)
          }
        }
      }
    })
  }, [])

  // Save notification settings
  async function saveNotifications() {
    if (!landlord?.id) return
    setSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('landlord_settings')
      .upsert({ 
        id: settingsId,
        landlord_id: landlord.id,
        notifications: notifs,
      }, { onConflict: 'landlord_id' })

    setSaving(false)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Notification settings saved' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  // Save WhatsApp settings
  async function saveWhatsapp() {
    if (!landlord?.id) return
    setSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('landlord_settings')
      .upsert({ 
        id: settingsId,
        landlord_id: landlord.id,
        whatsapp: whatsapp,
      }, { onConflict: 'landlord_id' })

    setSaving(false)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      // Also update landlord whatsapp number
      await supabase
        .from('landlords')
        .update({ whatsapp: whatsapp.number })
        .eq('id', landlord.id)
      
      toast({ title: 'Success', description: 'WhatsApp settings saved' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  // Save account details
  async function saveAccount() {
    if (!landlord?.id) return
    setSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('landlords')
      .update({ 
        full_name: displayName,
      })
      .eq('id', landlord.id)

    setSaving(false)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Account details saved' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  // Change password
  async function changePassword() {
    if (!newPass || newPass !== confirmPass) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (newPass.length < 8) {
      toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }
    
    setSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase.auth.updateUser({ password: newPass })
    
    setSaving(false)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Password updated successfully' })
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    }
  }

  const strength = getPasswordStrength(newPass)
  const strengthColors = ['#EF4444', '#F97316', '#EAB308', '#22C55E']

  const displayNameFallback = landlord?.full_name || displayName || user?.email || 'Your profile'
  const initials = displayNameFallback
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <AuthGuard require="landlord">
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden bg-[#F8FAFC] font-inherit">

        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <LandlordSidebar
            userName={landlord?.full_name}
            userEmail={user?.email}
            isVerified={landlord?.is_verified}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Header */}
          <header className="px-4 md:px-8 py-6 md:py-6 bg-[#F8FAFC] border-b border-gray-100 shrink-0">
            <div className="w-full mx-auto">
              {/* Title section */}
              <div className="mb-6">
                <p className="text-xs md:text-sm font-semibold text-blue-600 mb-2 md:mb-3 uppercase tracking-wide">
                  Landlord Settings
                </p>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  Manage your account
                </h1>
                <p className="text-sm md:text-base text-gray-600 max-w-2xl leading-relaxed">
                  Update your profile, notifications, security, and WhatsApp contact options.
                </p>
              </div>

              {/* Profile card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4 md:mb-5 pb-4 md:pb-5 border-b border-gray-100">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-lg md:text-xl font-bold text-blue-600">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm md:text-base font-semibold text-gray-900 truncate">{displayNameFallback}</p>
                    <p className="text-xs md:text-sm text-gray-600 truncate mt-1">{user?.email || 'No email'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Status</p>
                    <p className={`text-sm font-bold ${landlord?.is_verified ? 'text-green-600' : 'text-amber-600'}`}>
                      {landlord?.is_verified ? 'Verified' : 'Unverified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Joined</p>
                    <p className="text-sm font-bold text-gray-900">
                      {landlord?.created_at ? new Date(landlord.created_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-8">
            <div className="w-full mx-auto">
              {/* Mobile tab navigation */}
              <div className="md:hidden mb-6 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                {SECTIONS.map(s => {
                  const Icon = s.icon
                  const isActive = active === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActive(s.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.7} />
                      {s.label}
                    </button>
                  )
                })}
              </div>

              {/* Desktop layout with fixed sidebar */}
              <div className="flex gap-6">
                {/* Desktop sidebar - FIXED */}
                <div className="hidden md:block md:w-60 flex-shrink-0">
                  <nav className="fixed w-60 top-24 flex flex-col gap-2 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm max-h-[calc(100vh-150px)] overflow-y-auto">
                    {SECTIONS.map(s => {
                      const Icon = s.icon
                      const isActive = active === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActive(s.id)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isActive ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <Icon className="w-4 h-4" strokeWidth={1.7} />
                            </div>
                            {s.label}
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-300'}`} />
                        </button>
                      )
                    })}
                  </nav>
                </div>

                {/* Content area - with margin to account for fixed sidebar */}
                <div className="flex-1 space-y-6">

                {active === 'notifications' && (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Notifications</span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm">
                        <div className="mb-6 pb-4 border-b border-gray-100">
                          <p className="text-base md:text-lg font-bold text-gray-900 mb-2">Notification Preferences</p>
                          <p className="text-sm text-gray-600">Choose what alerts you receive about your listings.</p>
                        </div>
                        <div className="space-y-2 md:space-y-3">
                          {NOTIF_ITEMS.map(n => {
                            const Icon = n.icon
                            const isOn = (notifs as any)[n.key]
                            return (
                              <div
                                key={n.key}
                                className="flex flex-col md:flex-row md:items-start md:justify-between md:gap-4 p-3 md:p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start gap-3 mb-3 md:mb-0">
                                  <div
                                    className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                                    style={{ background: n.color }}
                                  >
                                    <Icon className="w-5 h-5" style={{ color: n.iconColor }} strokeWidth={1.7} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm md:text-base font-semibold text-gray-900">{n.label}</p>
                                    <p className="text-xs md:text-sm text-gray-600 leading-relaxed mt-1">{n.desc}</p>
                                  </div>
                                </div>
                                <Toggle
                                  on={isOn}
                                  onChange={() => setNotifs(ns => ({ ...ns, [n.key]: !isOn }))}
                                />
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <SubmitBtn onClick={saveNotifications} loading={saving}>
                            {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
                          </SubmitBtn>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {active === 'account' && (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Account</span>
                      </div>

                      {/* Account Details Card */}
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm mb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-base md:text-lg font-bold text-white flex-shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base md:text-lg font-semibold text-gray-900 truncate">{displayName || 'Your Name'}</p>
                            <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                            {landlord?.is_verified && (
                              <div className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mb-6 pb-4 border-b border-gray-100">
                          <p className="text-base md:text-lg font-bold text-gray-900 mb-2">Account Details</p>
                          <p className="text-sm text-gray-600">Manage your display name.</p>
                        </div>

                        {/* Email field */}
                        <div className="mb-5">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email address</label>
                          <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center gap-3">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.7} />
                            <input
                              value={user?.email || ''}
                              disabled
                              className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Email cannot be changed here. Contact support to update.</p>
                        </div>

                        {/* Display name field */}
                        <div className="mb-6">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Display name</label>
                          <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20 focus-within:border-blue-300 transition-all">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.7} />
                            <input
                              value={displayName}
                              onChange={e => setDisplayName(e.target.value)}
                              placeholder="Your full name"
                              className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400"
                            />
                          </div>
                        </div>

                        <SubmitBtn onClick={saveAccount} loading={saving}>
                          <CheckCircle className="w-4 h-4" /> Save Account Details
                        </SubmitBtn>
                      </div>

                      {/* Danger zone */}
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="text-base font-semibold text-red-900">Danger zone</h3>
                            <p className="text-sm text-red-700 mt-1">
                              Permanently delete your account and all your listings. This cannot be undone.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteDialogOpen(true)}
                          className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Delete my account
                        </button>
                      </div>

                      {/* Delete Account Dialog */}
                      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogContent className="max-w-sm">
                          <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                              </div>
                              <DialogTitle>Delete Account</DialogTitle>
                            </div>
                            <DialogDescription className="text-sm text-gray-600 leading-relaxed">
                              This will permanently delete your account and all your listings. 
                              This action <strong>cannot be undone</strong>. Type <strong>DELETE</strong> below to confirm.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="mt-4">
                            <input
                              type="text"
                              value={deleteConfirmText}
                              onChange={e => setDeleteConfirmText(e.target.value)}
                              placeholder="Type DELETE to confirm"
                              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                            />
                          </div>

                          <DialogFooter className="gap-2 sm:gap-3 flex-row justify-end mt-6">
                            <button
                              type="button"
                              onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText('') }}
                              disabled={deleting}
                              className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={deleteAccount}
                              disabled={deleting || deleteConfirmText !== 'DELETE'}
                              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Delete Account'}
                            </button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}

                {active === 'security' && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Security</span>
                    </div>

                    {/* Change Password Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm mb-6">
                      <div className="mb-6 pb-4 border-b border-gray-100">
                        <p className="text-base md:text-lg font-bold text-gray-900 mb-2">Change Password</p>
                        <p className="text-sm text-gray-600">Keep your account secure with a strong password.</p>
                      </div>

                      {/* Current Password */}
                      <div className="mb-5">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current password</label>
                        <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20">
                          <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.7} />
                          <input
                            type="password"
                            value={currentPass}
                            onChange={e => setCurrentPass(e.target.value)}
                            placeholder="••••••••"
                            className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400"
                          />
                        </div>
                      </div>

                      {/* New Password */}
                      <div className="mb-5">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">New password</label>
                        <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20">
                          <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.7} />
                          <input
                            type="password"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            placeholder="8+ characters"
                            className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400"
                          />
                        </div>
                        {newPass.length > 0 && (
                          <div className="mt-3">
                            <div className="flex gap-1 mb-2">
                              {[0, 1, 2, 3].map(i => (
                                <div
                                  key={i}
                                  className="h-1 flex-1 rounded-full transition-colors"
                                  style={{
                                    background: i < strength.score ? strength.color : '#E5E7EB',
                                  }}
                                />
                              ))}
                            </div>
                            <p className="text-xs font-semibold" style={{ color: strength.color }}>
                              {strength.label}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="mb-6">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Confirm new password</label>
                        <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20">
                          <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.7} />
                          <input
                            type="password"
                            value={confirmPass}
                            onChange={e => setConfirmPass(e.target.value)}
                            placeholder="Repeat new password"
                            className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400"
                          />
                        </div>
                        {confirmPass.length > 0 && newPass !== confirmPass && (
                          <p className="text-xs text-red-600 mt-2 font-medium">Passwords do not match</p>
                        )}
                      </div>

                      <SubmitBtn onClick={changePassword} loading={saving}>
                        <Shield className="w-4 h-4" /> Update Password
                      </SubmitBtn>
                    </div>

                    {/* Active Sessions Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm">
                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <p className="text-base md:text-lg font-bold text-gray-900 mb-2">Active Sessions</p>
                        <p className="text-sm text-gray-600">Devices currently signed into your account.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 md:p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Laptop className="w-5 h-5 text-blue-600" strokeWidth={1.7} />
                          </div>
                          <div>
                            <p className="text-sm md:text-base font-semibold text-gray-900">Current Device</p>
                            <p className="text-xs md:text-sm text-gray-600 mt-0.5">Active now · {user?.email}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full whitespace-nowrap">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {active === 'whatsapp' && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">WhatsApp</span>
                    </div>

                    {/* WhatsApp Settings Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm mb-6">
                      <div className="mb-6 pb-4 border-b border-gray-100">
                        <p className="text-base md:text-lg font-bold text-gray-900 mb-2">WhatsApp Contact Settings</p>
                        <p className="text-sm text-gray-600">Configure how tenants can reach you via WhatsApp.</p>
                      </div>

                      {/* WhatsApp Number */}
                      <div className="mb-6">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">WhatsApp number</label>
                        <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.7} />
                          <input
                            value={whatsapp.number}
                            onChange={e => setWhatsapp(w => ({ ...w, number: e.target.value }))}
                            placeholder="+234 800 000 0000"
                            className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400"
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-2">This number is displayed to tenants on your listings.</p>
                      </div>

                      {/* WhatsApp Toggles */}
                      <div className="space-y-3 mb-6">
                        {WA_TOGGLES.map(f => (
                          <div
                            key={f.key}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 md:p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                          >
                            <div>
                              <p className="text-sm md:text-base font-semibold text-gray-900">{f.label}</p>
                              <p className="text-xs md:text-sm text-gray-600 mt-1">{f.desc}</p>
                            </div>
                            <Toggle
                              on={(whatsapp as any)[f.key]}
                              onChange={() => setWhatsapp(w => ({ ...w, [f.key]: !(w as any)[f.key] }))}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Auto-reply message */}
                      {whatsapp.autoReply && (
                        <div className="mb-6">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Auto-reply message</label>
                          <textarea
                            rows={3}
                            value={whatsapp.autoReplyMsg}
                            onChange={e => setWhatsapp(w => ({ ...w, autoReplyMsg: e.target.value }))}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 font-inherit focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                            placeholder="Your auto-reply message..."
                          />
                        </div>
                      )}

                      <SubmitBtn onClick={saveWhatsapp} loading={saving}>
                        <Phone className="w-4 h-4" /> Save WhatsApp Settings
                      </SubmitBtn>
                    </div>

                    {/* WhatsApp Business Tip */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm md:text-base font-semibold text-green-900 mb-1">WhatsApp Business tip</p>
                        <p className="text-xs md:text-sm text-green-700 leading-relaxed">
                          Using WhatsApp Business lets you set up a business profile, quick replies, and away messages — making it easier for tenants to reach you and build trust.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

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

  const initials = (landlord?.full_name ?? displayName ?? user?.email ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <AuthGuard require="landlord">
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8FAFC', fontFamily: 'inherit' }}>

        <LandlordSidebar
          userName={landlord?.full_name}
          userEmail={user?.email}
          isVerified={landlord?.is_verified}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          <header style={{ padding: '24px 28px 0', background: '#F8FAFC' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', marginBottom: 8, letterSpacing: '.18em', textTransform: 'uppercase' }}>
                  Landlord Settings
                </p>
                <h1 style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.1 }}>
                  Manage your landlord account and preferences
                </h1>
                <p style={{ fontSize: 15, color: '#64748B', marginTop: 12, maxWidth: 580, lineHeight: 1.8 }}>
                  Update your profile, notification preferences, security settings, and WhatsApp contact options from one modern dashboard.
                </p>
              </div>
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 24, padding: 24, boxShadow: '0 20px 50px rgba(15,23,42,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 18, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#2563EB' }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>{landlord?.full_name || displayName || 'Your profile'}</p>
                    <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'No email available'}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: 13 }}>
                    <span>Status</span>
                    <span style={{ fontWeight: 700, color: landlord?.is_verified ? '#16A34A' : '#D97706' }}>{landlord?.is_verified ? 'Verified' : 'Unverified'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: 13 }}>
                    <span>Joined</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{landlord?.created_at ? new Date(landlord.created_at).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>

            <div style={{ display: 'flex', gap: 20, maxWidth: 860 }}>

              <div style={{ width: 220, flexShrink: 0 }} className="hidden sm:block">
                <nav style={{
                  display: 'grid', gap: 10,
                  background: '#F8FAFC', border: '1px solid #E5E7EB',
                  borderRadius: 24, padding: 16,
                  boxShadow: '0 20px 50px rgba(15,23,42,0.08)',
                  position: 'sticky', top: 24,
                }}>
                  {SECTIONS.map(s => {
                    const Icon = s.icon
                    const isActive = active === s.id
                    return (
                      <button key={s.id} type="button" onClick={() => setActive(s.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '14px 18px', fontSize: 14, fontWeight: 600,
                          color: isActive ? '#2563EB' : '#475569',
                          background: isActive ? '#FFFFFF' : '#F8FAFC',
                          border: '1px solid', borderColor: isActive ? '#C7D2FE' : 'transparent',
                          borderRadius: 18, boxShadow: isActive ? '0 10px 25px rgba(37,99,235,0.12)' : 'none',
                          cursor: 'pointer', transition: 'all .2s ease', fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            background: isActive ? 'rgba(37,99,235,.12)' : '#EEF2FF',
                          }}>
                            <Icon style={{ width: 16, height: 16, color: isActive ? '#2563EB' : '#7C3AED' }} strokeWidth={1.7} />
                          </div>
                          {s.label}
                        </div>
                        <ChevronRight style={{ width: 14, height: 14, color: isActive ? '#2563EB' : '#CBD5E1' }} />
                      </button>
                    )
                  })}
                </nav>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>

                {active === 'notifications' && (
                  <div>
                    <SectionLabel>Notifications</SectionLabel>
                    <Card>
                      <CardHead title="Notification Preferences" desc="Choose what alerts you receive about your listings." />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {NOTIF_ITEMS.map(n => {
                          const Icon = n.icon
                          const isOn = (notifs as any)[n.key]
                          return (
                            <div key={n.key} style={{
                              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                              gap: 16, padding: '14px 16px', borderRadius: 8,
                              border: '1px solid #E2E8F0', transition: 'background .15s',
                            }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{
                                  width: 36, height: 36, borderRadius: 8, flexShrink: 0, marginTop: 1,
                                  background: n.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <Icon style={{ width: 17, height: 17, color: n.iconColor }} strokeWidth={1.7} />
                                </div>
                                <div>
                                  <p style={{ fontSize: 13.5, fontWeight: 500, color: '#0F172A', marginBottom: 2 }}>{n.label}</p>
                                  <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>{n.desc}</p>
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
                      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
                        <SubmitBtn onClick={saveNotifications} loading={saving}>
                          {saved ? <><CheckCircle style={{ width: 16, height: 16 }} /> Saved!</> : <><Save style={{ width: 16, height: 16 }} /> Save Changes</>}
                        </SubmitBtn>
                      </div>
                    </Card>
                  </div>
                )}

                {active === 'account' && (
                  <div>
                    <SectionLabel>Account</SectionLabel>

                    <Card>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #E2E8F0' }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 17, fontWeight: 600, color: '#fff',
                        }}>
                          {initials}
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{displayName || 'Your Name'}</p>
                          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>{user?.email}</p>
                          {landlord?.is_verified && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 11.5, fontWeight: 500, color: '#059669', background: '#ECFDF5', padding: '3px 8px', borderRadius: 20 }}>
                              <ShieldCheck style={{ width: 11, height: 11 }} /> Verified Landlord
                            </div>
                          )}
                        </div>
                      </div>

                      <CardHead title="Account Details" desc="Manage your display name." />

                      <div style={{ marginBottom: 18 }}>
                        <FieldLabel>Email address</FieldLabel>
                        <InputWrap>
                          <Mail style={iconStyle} strokeWidth={1.7} />
                          <input
                            value={user?.email || ''}
                            disabled
                            style={{ ...inputStyle, opacity: 0.6 }}
                          />
                        </InputWrap>
                        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Email cannot be changed here. Contact support to update.</p>
                      </div>

                      <div style={{ marginBottom: 18 }}>
                        <FieldLabel>Display name</FieldLabel>
                        <InputWrap>
                          <User style={iconStyle} strokeWidth={1.7} />
                          <input
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="Your full name"
                            style={inputStyle}
                          />
                        </InputWrap>
                      </div>

                      <SubmitBtn onClick={saveAccount} loading={saving}>
                        <CheckCircle style={{ width: 16, height: 16 }} /> Save Account Details
                      </SubmitBtn>
                    </Card>

                    <div style={{
                      background: '#FEF2F2', border: '1px solid #FECACA',
                      borderRadius: 16, padding: '20px 24px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Trash2 style={{ width: 15, height: 15, color: '#DC2626' }} />
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#DC2626' }}>Danger zone</h3>
                      </div>
                      <p style={{ fontSize: 13, color: '#B91C1C', marginBottom: 14 }}>
                        Permanently delete your account and all your listings. This action cannot be undone.
                      </p>
                      <button type="button" onClick={() => setDeleteDialogOpen(true)} style={{
                        padding: '8px 16px', border: '1px solid #FCA5A5', color: '#DC2626',
                        fontSize: 13, fontWeight: 600, background: 'transparent',
                        borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'background .15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        Delete my account
                      </button>
                    </div>

                    {/* Delete Account Dialog */}
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <DialogContent style={{ maxWidth: 420 }}>
                        <DialogHeader>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 8, background: '#FEE2E2',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <AlertTriangle style={{ width: 20, height: 20, color: '#DC2626' }} />
                            </div>
                            <DialogTitle style={{ margin: 0 }}>Delete Account</DialogTitle>
                          </div>
                          <DialogDescription style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                            This will permanently delete your account and all your listings. 
                            This action <strong>cannot be undone</strong>. Type <strong>DELETE</strong> below to confirm.
                          </DialogDescription>
                        </DialogHeader>

                        <div style={{ marginTop: 16 }}>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE to confirm"
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: 8,
                              border: '1px solid #E2E8F0', fontSize: 14,
                              fontFamily: 'inherit', outline: 'none',
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#DC2626')}
                            onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
                          />
                        </div>

                        <DialogFooter style={{ marginTop: 20, gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText('') }}
                            disabled={deleting}
                            style={{
                              padding: '8px 16px', border: '1px solid #E2E8F0', background: '#fff',
                              color: '#475569', fontSize: 13, fontWeight: 600,
                              borderRadius: 8, cursor: deleting ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={deleteAccount}
                            disabled={deleting || deleteConfirmText !== 'DELETE'}
                            style={{
                              padding: '8px 16px', border: 'none', background: deleting || deleteConfirmText !== 'DELETE' ? '#FCA5A5' : '#DC2626',
                              color: '#fff', fontSize: 13, fontWeight: 600,
                              borderRadius: 8, cursor: deleting || deleteConfirmText !== 'DELETE' ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6
                            }}
                          >
                            {deleting ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Deleting...</> : 'Delete Account'}
                          </button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {active === 'security' && (
                  <div>
                    <SectionLabel>Security</SectionLabel>
                    <Card>
                      <CardHead title="Change Password" desc="Keep your account secure with a strong password." />

                      <PasswordField
                        label="Current password"
                        placeholder="••••••••"
                        value={currentPass}
                        onChange={setCurrentPass}
                      />

                      <div style={{ marginBottom: 18 }}>
                        <FieldLabel>New password</FieldLabel>
                        <InputWrap>
                          <Lock style={iconStyle} strokeWidth={1.7} />
                          <input
                            type="password"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            placeholder="8+ characters"
                            style={inputStyle}
                          />
                        </InputWrap>
                        {newPass.length > 0 && (
                          <div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                              {[0, 1, 2, 3].map(i => (
                                <div key={i} style={{
                                  height: 3, flex: 1, borderRadius: 2,
                                  background: i < strength.score ? strengthColors[strength.score - 1] : '#E2E8F0',
                                  transition: 'background .3s',
                                }} />
                              ))}
                            </div>
                            <p style={{ fontSize: 12, marginTop: 5, color: strength.color, fontWeight: 500 }}>
                              {strength.label}
                            </p>
                          </div>
                        )}
                      </div>

                      <PasswordField
                        label="Confirm new password"
                        placeholder="Repeat new password"
                        value={confirmPass}
                        onChange={setConfirmPass}
                      />

                      {confirmPass.length > 0 && newPass !== confirmPass && (
                        <p style={{ fontSize: 12, color: '#EF4444', marginTop: -10, marginBottom: 14 }}>
                          Passwords do not match
                        </p>
                      )}

                      <SubmitBtn onClick={changePassword} loading={saving}>
                        <Shield style={{ width: 16, height: 16 }} /> Update Password
                      </SubmitBtn>
                    </Card>

                    <Card>
                      <CardHead title="Active Sessions" desc="Devices currently signed into your account." />
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', border: '1px solid #E2E8F0', borderRadius: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 8,
                            background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Laptop style={{ width: 18, height: 18, color: '#2563EB' }} strokeWidth={1.7} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13.5, fontWeight: 500, color: '#0F172A' }}>Current Device</p>
                            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Active now · {user?.email}</p>
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 10px', fontSize: 11.5, fontWeight: 600,
                          background: '#D1FAE5', color: '#059669', borderRadius: 20,
                        }}>
                          Active
                        </span>
                      </div>
                    </Card>
                  </div>
                )}

                {active === 'whatsapp' && (
                  <div>
                    <SectionLabel>WhatsApp</SectionLabel>
                    <Card>
                      <CardHead title="WhatsApp Contact Settings" desc="Configure how tenants can reach you via WhatsApp." />

                      <div style={{ marginBottom: 18 }}>
                        <FieldLabel>WhatsApp number</FieldLabel>
                        <InputWrap>
                          <Phone style={iconStyle} strokeWidth={1.7} />
                          <input
                            value={whatsapp.number}
                            onChange={e => setWhatsapp(w => ({ ...w, number: e.target.value }))}
                            placeholder="+234 800 000 0000"
                            style={inputStyle}
                          />
                        </InputWrap>
                        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                          This number is displayed to tenants on your listings.
                        </p>
                      </div>

                      {WA_TOGGLES.map(f => (
                        <div key={f.key} style={{
                          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                          gap: 16, padding: '14px 16px', borderRadius: 8,
                          border: '1px solid #E2E8F0', marginBottom: 10, transition: 'background .15s',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <p style={{ fontSize: 13.5, fontWeight: 500, color: '#0F172A', marginBottom: 2 }}>{f.label}</p>
                            <p style={{ fontSize: 12, color: '#94A3B8' }}>{f.desc}</p>
                          </div>
                          <Toggle
                            on={(whatsapp as any)[f.key]}
                            onChange={() => setWhatsapp(w => ({ ...w, [f.key]: !(w as any)[f.key] }))}
                          />
                        </div>
                      ))}

                      {whatsapp.autoReply && (
                        <div style={{ marginTop: 4, marginBottom: 18 }}>
                          <FieldLabel>Auto-reply message</FieldLabel>
                          <textarea
                            rows={3}
                            value={whatsapp.autoReplyMsg}
                            onChange={e => setWhatsapp(w => ({ ...w, autoReplyMsg: e.target.value }))}
                            style={{
                              width: '100%', padding: '12px 14px', borderRadius: 8,
                              border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A',
                              fontFamily: 'inherit', resize: 'none', outline: 'none',
                              background: '#F8FAFC', transition: 'all .15s',
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#2563EB', e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)', e.currentTarget.style.background = '#fff')}
                            onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0', e.currentTarget.style.boxShadow = 'none', e.currentTarget.style.background = '#F8FAFC')}
                          />
                        </div>
                      )}

                      <SubmitBtn onClick={saveWhatsapp} loading={saving}>
                        <Phone style={{ width: 16, height: 16 }} /> Save WhatsApp Settings
                      </SubmitBtn>
                    </Card>

                    <div style={{
                      background: '#F0FDF4', border: '1px solid #BBF7D0',
                      borderRadius: 16, padding: '18px 20px',
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 8, background: '#22C55E',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Sparkles style={{ width: 20, height: 20, color: '#fff' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#14532D', marginBottom: 3 }}>
                          WhatsApp Business tip
                        </p>
                        <p style={{ fontSize: 12.5, color: '#15803D', lineHeight: 1.55 }}>
                          Using WhatsApp Business lets you set up a business profile, quick replies, and away messages —
                          making it easier for tenants to reach you and build trust.
                        </p>
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

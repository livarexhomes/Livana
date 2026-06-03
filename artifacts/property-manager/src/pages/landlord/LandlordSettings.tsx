import { useState, useEffect } from 'react'
import {
  Bell, Shield, Phone, Mail, Save, CheckCircle,
  MessageSquare, Eye, EyeOff, Key, ChevronRight,
  Globe, User, Lock, Laptop, Sparkles, ShieldCheck,
  LayoutDashboard, Building2, MessageCircle, Users,
  BarChart3, Settings, Trash2,
} from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

const SECTIONS = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account',       label: 'Account',        icon: User },
  { id: 'security',      label: 'Security',       icon: Shield },
  { id: 'whatsapp',      label: 'WhatsApp',       icon: Phone },
]

const NOTIF_ITEMS = [
  { key: 'enquiryEmail',    label: 'New enquiry (Email)',      desc: 'Get an email when a tenant enquires about your listing',       icon: Mail,           color: '#EFF6FF', iconColor: '#2563EB' },
  { key: 'enquiryWhatsApp', label: 'New enquiry (WhatsApp)',  desc: 'Get a WhatsApp message for new tenant enquiries',              icon: Phone,          color: '#F0FDF4', iconColor: '#16A34A' },
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
      display: 'flex', alignItems: 'center', gap: 8,
      border: '1px solid #E2E8F0', borderRadius: 8,
      padding: '0 14px', height: 42, background: '#fff',
      transition: 'all .15s',
    }}
      onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,.12)', e.currentTarget.style.borderColor = '#2563EB')}
      onBlur={e => (e.currentTarget.style.boxShadow = 'none', e.currentTarget.style.borderColor = '#E2E8F0')}
    >
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  flex: 1, border: 'none', outline: 'none',
  fontSize: 14, color: '#0F172A', background: 'transparent',
  fontFamily: 'inherit',
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
      background: '#fff', border: '1px solid #E2E8F0',
      borderRadius: 16, padding: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 16, ...style,
    }}>
      {children}
    </div>
  )
}

function CardHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #E2E8F0' }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{title}</p>
      <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 3 }}>{desc}</p>
    </div>
  )
}

// ── Submit button ─────────────────────────────────────────────────────────────
function SubmitBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%', padding: 11, fontSize: 14, fontWeight: 600,
      color: '#fff', background: '#2563EB', border: 'none',
      borderRadius: 8, cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
      fontFamily: 'inherit', transition: 'background .18s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
      onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}
    >
      {children}
    </button>
  )
}

// ── Section breadcrumb ────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.7px' }}>
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
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [active, setActive] = useState('notifications')
  const [saved, setSaved] = useState(false)
  const [displayName, setDisplayName] = useState('')

  const [notifs, setNotifs] = useState({
    enquiryEmail:    true,
    enquiryWhatsApp: false,
    statusEmail:     true,
    reviewEmail:     true,
    weeklyDigest:    false,
    newMessage:      true,
  })

  const [account, setAccount] = useState({ email: '', currentPass: '', newPass: '', confirmPass: '' })
  const [newPass, setNewPass] = useState('')
  const [currentPass, setCurrentPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const [whatsapp, setWhatsapp] = useState({
    number: '',
    autoReply: false,
    autoReplyMsg: 'Hello! Thanks for your enquiry. I will get back to you shortly.',
    showOnListing: true,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email, id: user.id })
      setAccount(a => ({ ...a, email: user.email ?? '' }))
      const { data: l } = await supabase.from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (l) {
        setDisplayName(l.full_name ?? '')
        setWhatsapp(w => ({ ...w, number: l.whatsapp ?? '' }))
      }
    })
  }, [])

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const strength = getPasswordStrength(newPass)
  const strengthColors = ['#EF4444', '#F97316', '#EAB308', '#22C55E']

  const initials = (landlord?.full_name ?? displayName ?? user?.email ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <AuthGuard require="landlord">
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8FAFC', fontFamily: 'inherit' }}>

        {/* ── Original sidebar (untouched for API) ── */}
        <LandlordSidebar
          userName={landlord?.full_name}
          userEmail={user?.email}
          isVerified={landlord?.is_verified}
        />

        {/* ── Main ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Topbar */}
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 28px', background: '#fff',
            borderBottom: '1px solid #E2E8F0',
          }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', letterSpacing: '-.3px' }}>
                Account Settings
              </h1>
              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>
                Manage your preferences and account details
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', fontSize: 13.5, fontWeight: 600,
                borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all .18s',
                background: saved ? '#059669' : '#2563EB',
                color: '#fff',
                boxShadow: saved ? '0 4px 12px rgba(5,150,105,.25)' : '0 4px 12px rgba(37,99,235,.25)',
              }}
            >
              {saved
                ? <><CheckCircle style={{ width: 15, height: 15 }} /> Saved!</>
                : <><Save style={{ width: 15, height: 15 }} /> Save Changes</>
              }
            </button>
          </header>

          {/* Content */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>

            {/* Mobile tabs */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 4 }}
              className="sm:hidden">
              {SECTIONS.map(s => {
                const Icon = s.icon
                return (
                  <button key={s.id} type="button" onClick={() => setActive(s.id)}
                    style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      border: `1px solid ${active === s.id ? '#2563EB' : '#E2E8F0'}`,
                      background: active === s.id ? '#2563EB' : '#fff',
                      color: active === s.id ? '#fff' : '#475569',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <Icon style={{ width: 14, height: 14 }} strokeWidth={2} />
                    {s.label}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 20, maxWidth: 860 }}>

              {/* Desktop left nav */}
              <div style={{ width: 200, flexShrink: 0 }} className="hidden sm:block">
                <nav style={{
                  background: '#fff', border: '1px solid #E2E8F0',
                  borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                  position: 'sticky', top: 0,
                }}>
                  {SECTIONS.map(s => {
                    const Icon = s.icon
                    const isActive = active === s.id
                    return (
                      <button key={s.id} type="button" onClick={() => setActive(s.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '13px 16px', fontSize: 13.5, fontWeight: 500,
                          color: isActive ? '#2563EB' : '#475569',
                          background: isActive ? '#EFF6FF' : 'transparent',
                          border: 'none', borderBottom: '1px solid #E2E8F0',
                          cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            background: isActive ? 'rgba(37,99,235,.15)' : '#F1F5F9',
                          }}>
                            <Icon style={{ width: 15, height: 15, color: isActive ? '#2563EB' : '#94A3B8' }} strokeWidth={1.7} />
                          </div>
                          {s.label}
                        </div>
                        <ChevronRight style={{ width: 13, height: 13, color: isActive ? '#93C5FD' : '#CBD5E1' }} />
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Panels */}
              <div style={{ flex: 1, minWidth: 0 }}>

                {/* ── Notifications ── */}
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
                    </Card>
                  </div>
                )}

                {/* ── Account ── */}
                {active === 'account' && (
                  <div>
                    <SectionLabel>Account</SectionLabel>

                    {/* Profile snapshot */}
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

                      <CardHead title="Account Details" desc="Manage your login email and display name." />

                      <div style={{ marginBottom: 18 }}>
                        <FieldLabel>Email address</FieldLabel>
                        <InputWrap>
                          <Mail style={iconStyle} strokeWidth={1.7} />
                          <input
                            value={account.email}
                            onChange={e => setAccount(a => ({ ...a, email: e.target.value }))}
                            style={inputStyle}
                          />
                        </InputWrap>
                        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Changing your email requires re-verification.</p>
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

                      <div style={{ marginBottom: 4 }}>
                        <FieldLabel>Phone number</FieldLabel>
                        <InputWrap>
                          <Phone style={iconStyle} strokeWidth={1.7} />
                          <input placeholder="+234 800 000 0000" style={inputStyle} />
                        </InputWrap>
                      </div>

                      <SubmitBtn onClick={handleSave}>
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
                      <button type="button" style={{
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
                  </div>
                )}

                {/* ── Security ── */}
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
                        {/* Strength bar */}
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

                      {/* Match hint */}
                      {confirmPass.length > 0 && newPass !== confirmPass && (
                        <p style={{ fontSize: 12, color: '#EF4444', marginTop: -10, marginBottom: 14 }}>
                          Passwords do not match
                        </p>
                      )}

                      <SubmitBtn onClick={handleSave}>
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

                {/* ── WhatsApp ── */}
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

                      <SubmitBtn onClick={handleSave}>
                        <Phone style={{ width: 16, height: 16 }} /> Save WhatsApp Settings
                      </SubmitBtn>
                    </Card>

                    {/* Tip card */}
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
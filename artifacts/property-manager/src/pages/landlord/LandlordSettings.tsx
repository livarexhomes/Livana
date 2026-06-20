import { useState, useEffect } from 'react'
import {
  Bell, Shield, Phone, Mail, Save, CheckCircle,
  MessageSquare, Eye, EyeOff, Key, ChevronRight,
  Globe, User, Lock, Laptop, Sparkles, ShieldCheck,
  MessageCircle, Trash2, Loader2, AlertTriangle,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import LandlordSidebar from '@/components/layout/LandlordSidebar'
import AuthGuard from '@/components/auth/AuthGuard'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import type { Landlord } from '@/types'
import { useToast } from '@/hooks/use-toast'

const SECTIONS = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account',       label: 'Account',        icon: User },
  { id: 'security',      label: 'Security',       icon: Shield },
  { id: 'whatsapp',      label: 'WhatsApp',       icon: Phone },
]

const NOTIF_ITEMS = [
  { key: 'enquiryEmail',  label: 'New enquiry',           desc: 'Get an email when a tenant enquires about your listing',      icon: Mail,          iconBg: 'bg-blue-50',   iconColor: 'text-blue-600' },
  { key: 'statusEmail',   label: 'Listing status updates', desc: 'Email when your listing is approved or needs changes',        icon: CheckCircle,   iconBg: 'bg-blue-50',   iconColor: 'text-blue-600' },
  { key: 'reviewEmail',   label: 'Review & feedback',     desc: 'Email when a tenant leaves feedback on your property',        icon: MessageSquare, iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
  { key: 'weeklyDigest',  label: 'Weekly digest',         desc: 'A weekly report of your listing views and enquiries',         icon: Globe,         iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
  { key: 'newMessage',    label: 'New direct messages',   desc: 'Alert when a tenant sends you a direct message',              icon: Bell,          iconBg: 'bg-blue-50',   iconColor: 'text-blue-600' },
]

const WA_TOGGLES = [
  { key: 'showOnListing', label: 'Show WhatsApp on listings', desc: 'Allow tenants to see your WhatsApp button on listings' },
  { key: 'autoReply',     label: 'Enable auto-reply',         desc: 'Automatically reply when a tenant first messages you'  },
]

function getPasswordStrength(val: string) {
  if (!val) return { score: 0, label: '', color: '' }
  let score = 0
  if (val.length >= 8) score++
  if (/[A-Z]/.test(val)) score++
  if (/[0-9]/.test(val)) score++
  if (/[^A-Za-z0-9]/.test(val)) score++
  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak',   color: 'bg-red-500'    },
    2: { label: 'Fair',   color: 'bg-orange-500' },
    3: { label: 'Good',   color: 'bg-yellow-500' },
    4: { label: 'Strong', color: 'bg-green-500'  },
  }
  return { score, ...map[score] }
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={on}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

const fieldCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300 transition-all'
const inputCls = 'flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400'

function PasswordField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      <div className={fieldCls}>
        <Lock className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
        <button type="button" onClick={() => setShow(s => !s)} className="text-gray-400 hover:text-gray-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function CardSection({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <p className="text-base font-bold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function SaveBtn({ onClick, loading, saved, icon, label }: { onClick: () => void; loading: boolean; saved: boolean; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-900/10">
      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : saved ? <><CheckCircle className="w-4 h-4 text-green-400" /> Saved!</> : <>{icon} {label}</>}
    </button>
  )
}

export default function LandlordSettings() {
  const { toast } = useToast()
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [active, setActive] = useState('notifications')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [settingsId, setSettingsId] = useState<string | null>(null)

  const [notifs, setNotifs] = useState({ enquiryEmail: true, statusEmail: true, reviewEmail: true, weeklyDigest: false, newMessage: true })
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [whatsapp, setWhatsapp] = useState({ number: '', autoReply: false, autoReplyMsg: 'Hello! Thanks for your enquiry. I will get back to you shortly.', showOnListing: true })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email, id: user.id })
      const { data: l } = await supabase.from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (l) {
        setDisplayName(l.full_name ?? '')
        const { data: settings } = await supabase.from('landlord_settings').select('*').eq('landlord_id', l.id).single()
        if (settings) {
          setSettingsId(settings.id)
          if (settings.notifications) setNotifs(settings.notifications)
          if (settings.whatsapp) setWhatsapp(settings.whatsapp)
        } else {
          const { data: newSettings } = await supabase.from('landlord_settings').insert({ landlord_id: l.id }).select().single()
          if (newSettings) setSettingsId(newSettings.id)
        }
      }
    })
  }, [])

  function flashSaved() { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  async function saveNotifications() {
    if (!landlord?.id) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('landlord_settings').upsert({ id: settingsId, landlord_id: landlord.id, notifications: notifs }, { onConflict: 'landlord_id' })
    setSaving(false)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Saved', description: 'Notification settings updated' }); flashSaved() }
  }

  async function saveWhatsapp() {
    if (!landlord?.id) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('landlord_settings').upsert({ id: settingsId, landlord_id: landlord.id, whatsapp }, { onConflict: 'landlord_id' })
    if (!error) await supabase.from('landlords').update({ whatsapp: whatsapp.number }).eq('id', landlord.id)
    setSaving(false)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Saved', description: 'WhatsApp settings updated' }); flashSaved() }
  }

  async function saveAccount() {
    if (!landlord?.id) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('landlords').update({ full_name: displayName }).eq('id', landlord.id)
    setSaving(false)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Saved', description: 'Account details updated' }); flashSaved() }
  }

  async function changePassword() {
    if (!currentPass) { toast({ title: 'Error', description: 'Enter your current password', variant: 'destructive' }); return }
    if (!newPass || newPass !== confirmPass) { toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' }); return }
    if (newPass.length < 8) { toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' }); return }
    setSaving(true)
    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: currentPass })
    if (verifyError) { setSaving(false); toast({ title: 'Error', description: 'Current password is incorrect', variant: 'destructive' }); return }
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setSaving(false)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Password updated', description: 'Your password has been changed' }); setCurrentPass(''); setNewPass(''); setConfirmPass('') }
  }

  async function deleteAccount() {
    if (deleteConfirmText !== 'DELETE') { toast({ title: 'Error', description: 'Type DELETE to confirm', variant: 'destructive' }); return }
    if (!landlord?.id || !user?.id) return
    setDeleting(true)
    const supabase = createClient()
    try {
      await supabase.from('properties').delete().eq('landlord_id', landlord.id)
      await supabase.from('landlord_settings').delete().eq('landlord_id', landlord.id)
      await supabase.from('landlords').delete().eq('id', landlord.id)
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete account', variant: 'destructive' })
      setDeleting(false)
    }
  }

  const strength = getPasswordStrength(newPass)
  const displayNameFallback = landlord?.full_name || displayName || user?.email || 'Your profile'
  const initials = displayNameFallback.split(' ').filter(Boolean).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <AuthGuard require="landlord">
      <div className="flex min-h-screen bg-gray-50">

        {/* Main app sidebar */}
        <div className="hidden md:block shrink-0">
          <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />
        </div>

        {/* Page content */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Top bar */}
          <div className="bg-white border-b border-gray-100 px-5 sm:px-8 py-5 shrink-0">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Settings</p>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Manage your account</h1>
            <p className="text-sm text-gray-500 mt-1">Update your profile, notifications, security, and WhatsApp settings.</p>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

            {/* Settings nav */}
            <aside className="bg-white border-b lg:border-b-0 lg:border-r border-gray-100 shrink-0 lg:w-56">
              {/* Mobile: horizontal scroll */}
              <div className="flex lg:hidden gap-1 p-3 overflow-x-auto">
                {SECTIONS.map(s => {
                  const Icon = s.icon
                  const isActive = active === s.id
                  return (
                    <button key={s.id} type="button" onClick={() => setActive(s.id)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${isActive ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {s.label}
                    </button>
                  )
                })}
              </div>
              {/* Desktop: vertical */}
              <nav className="hidden lg:flex flex-col p-3 gap-1 sticky top-0">
                {/* Profile mini card */}
                <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-extrabold shrink-0">{initials}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{displayNameFallback}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                  {landlord?.is_verified && (
                    <div className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </div>
                  )}
                </div>
                {SECTIONS.map(s => {
                  const Icon = s.icon
                  const isActive = active === s.id
                  return (
                    <button key={s.id} type="button" onClick={() => setActive(s.id)}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" strokeWidth={1.7} />
                        {s.label}
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white/60' : 'text-gray-300'}`} />
                    </button>
                  )
                })}
              </nav>
            </aside>

            {/* Main panel */}
            <main className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5">

              {/* ── NOTIFICATIONS ── */}
              {active === 'notifications' && (
                <CardSection title="Notification Preferences" desc="Choose what alerts you receive about your listings.">
                  <div className="space-y-3">
                    {NOTIF_ITEMS.map(n => {
                      const Icon = n.icon
                      const isOn = (notifs as any)[n.key]
                      return (
                        <div key={n.key} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl ${n.iconBg} flex items-center justify-center shrink-0`}>
                              <Icon className={`w-4 h-4 ${n.iconColor}`} strokeWidth={1.7} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{n.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.desc}</p>
                            </div>
                          </div>
                          <Toggle on={isOn} onChange={() => setNotifs(ns => ({ ...ns, [n.key]: !isOn }))} />
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 pt-5 border-t border-gray-100">
                    <SaveBtn onClick={saveNotifications} loading={saving} saved={saved} icon={<Save className="w-4 h-4" />} label="Save Preferences" />
                  </div>
                </CardSection>
              )}

              {/* ── ACCOUNT ── */}
              {active === 'account' && (
                <div className="space-y-5">
                  <CardSection title="Account Details" desc="Update your display name shown on listings.">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email address</label>
                        <div className={`${fieldCls} bg-gray-50`}>
                          <Mail className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
                          <input value={user?.email || ''} disabled className={`${inputCls} text-gray-500`} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">Contact support to change your email.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Display name</label>
                        <div className={fieldCls}>
                          <User className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
                          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" className={inputCls} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <SaveBtn onClick={saveAccount} loading={saving} saved={saved} icon={<CheckCircle className="w-4 h-4" />} label="Save Account Details" />
                    </div>
                  </CardSection>

                  {/* Danger zone */}
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-900">Danger zone</p>
                        <p className="text-xs text-red-700 mt-1 leading-relaxed">Permanently delete your account and all listings. This cannot be undone.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setDeleteDialogOpen(true)}
                      className="px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                      Delete my account
                    </button>
                  </div>

                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          </div>
                          <DialogTitle>Delete Account</DialogTitle>
                        </div>
                        <DialogDescription className="text-sm text-gray-600 leading-relaxed">
                          This will permanently delete your account and all your listings. This action <strong>cannot be undone</strong>. Type <strong>DELETE</strong> below to confirm.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4">
                        <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE to confirm"
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none" />
                      </div>
                      <DialogFooter className="gap-2 flex-row justify-end mt-5">
                        <button type="button" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText('') }} disabled={deleting}
                          className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                        <button type="button" onClick={deleteAccount} disabled={deleting || deleteConfirmText !== 'DELETE'}
                          className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed flex items-center gap-2">
                          {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : 'Delete Account'}
                        </button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* ── SECURITY ── */}
              {active === 'security' && (
                <div className="space-y-5">
                  <CardSection title="Change Password" desc="Keep your account secure with a strong, unique password.">
                    <div className="space-y-4">
                      <PasswordField label="Current password" placeholder="••••••••" value={currentPass} onChange={setCurrentPass} />
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New password</label>
                        <div className={fieldCls}>
                          <Lock className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
                          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="8+ characters" className={inputCls} />
                        </div>
                        {newPass.length > 0 && (
                          <div className="mt-2.5">
                            <div className="flex gap-1 mb-1.5">
                              {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : 'bg-gray-100'}`} />
                              ))}
                            </div>
                            <p className={`text-xs font-bold ${strength.score <= 1 ? 'text-red-500' : strength.score === 2 ? 'text-orange-500' : strength.score === 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {strength.label}
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <PasswordField label="Confirm new password" placeholder="Repeat password" value={confirmPass} onChange={setConfirmPass} />
                        {confirmPass.length > 0 && newPass !== confirmPass && (
                          <p className="text-xs text-red-500 mt-1.5 font-medium">Passwords do not match</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <SaveBtn onClick={changePassword} loading={saving} saved={saved} icon={<Shield className="w-4 h-4" />} label="Update Password" />
                    </div>
                  </CardSection>

                  <CardSection title="Active Sessions" desc="Devices currently signed in to your account.">
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Laptop className="w-5 h-5 text-blue-600" strokeWidth={1.7} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Current Device</p>
                          <p className="text-xs text-gray-500 mt-0.5">Active now · {user?.email}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full whitespace-nowrap">Active</span>
                    </div>
                  </CardSection>
                </div>
              )}

              {/* ── WHATSAPP ── */}
              {active === 'whatsapp' && (
                <div className="space-y-5">
                  <CardSection title="WhatsApp Contact Settings" desc="Configure how tenants can reach you via WhatsApp.">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">WhatsApp number</label>
                        <div className={fieldCls}>
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
                          <input value={whatsapp.number} onChange={e => setWhatsapp(w => ({ ...w, number: e.target.value }))} placeholder="+234 800 000 0000" className={inputCls} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">This number is shown to tenants on your listings.</p>
                      </div>
                      <div className="space-y-3">
                        {WA_TOGGLES.map(f => (
                          <div key={f.key} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                            </div>
                            <Toggle on={(whatsapp as any)[f.key]} onChange={() => setWhatsapp(w => ({ ...w, [f.key]: !(w as any)[f.key] }))} />
                          </div>
                        ))}
                      </div>
                      {whatsapp.autoReply && (
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Auto-reply message</label>
                          <textarea rows={3} value={whatsapp.autoReplyMsg} onChange={e => setWhatsapp(w => ({ ...w, autoReplyMsg: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
                            placeholder="Your auto-reply message…" />
                        </div>
                      )}
                    </div>
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <SaveBtn onClick={saveWhatsapp} loading={saving} saved={saved} icon={<Phone className="w-4 h-4" />} label="Save WhatsApp Settings" />
                    </div>
                  </CardSection>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900 mb-1">WhatsApp Business tip</p>
                      <p className="text-xs text-emerald-700 leading-relaxed">WhatsApp Business lets you set a business profile, quick replies, and away messages — making it easier for tenants to reach you and build trust.</p>
                    </div>
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

import { useState, useEffect } from 'react'
import {
  Bell, Shield, Phone, Mail, Save, CheckCircle,
  MessageSquare, Eye, EyeOff, Key, ChevronRight,
  Globe, User, Lock,
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

export default function LandlordSettings() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [active, setActive] = useState('notifications')
  const [saved, setSaved] = useState(false)
  const [showPass, setShowPass] = useState(false)
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

  return (
    <AuthGuard require="landlord">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage your account preferences</p>
            </div>
            <button type="button" onClick={handleSave}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl shadow-sm transition-all ${
                saved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
              }`}>
              {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {/* Mobile tabs */}
            <div className="sm:hidden flex gap-2 overflow-x-auto pb-3">
              {SECTIONS.map(s => {
                const Icon = s.icon
                return (
                  <button key={s.id} type="button" onClick={() => setActive(s.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      active === s.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />{s.label}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-5 max-w-4xl">
              {/* Desktop left nav */}
              <div className="hidden sm:block w-48 shrink-0">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-0">
                  {SECTIONS.map(s => {
                    const Icon = s.icon
                    return (
                      <button key={s.id} type="button" onClick={() => setActive(s.id)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                          active === s.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                        }`}>
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${active === s.id ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={1.7} />
                          {s.label}
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 ${active === s.id ? 'text-blue-400' : 'text-gray-300'}`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-4">

                {/* Notifications */}
                {active === 'notifications' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-1">Notification Preferences</h2>
                      <p className="text-sm text-gray-400">Choose what alerts you receive about your listings.</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { key: 'enquiryEmail',    label: 'New enquiry (Email)',     desc: 'Get an email when a tenant enquires about your listing',       icon: Mail },
                        { key: 'enquiryWhatsApp', label: 'New enquiry (WhatsApp)',  desc: 'Get a WhatsApp message for new tenant enquiries',              icon: Phone },
                        { key: 'statusEmail',     label: 'Listing status updates',  desc: 'Email when your listing is approved or needs changes',         icon: CheckCircle },
                        { key: 'reviewEmail',     label: 'Review & feedback alerts', desc: 'Email when a tenant leaves feedback on your property',        icon: MessageSquare },
                        { key: 'weeklyDigest',    label: 'Weekly summary digest',   desc: 'Receive a weekly report of your listing views and enquiries',  icon: Globe },
                        { key: 'newMessage',      label: 'New direct messages',     desc: 'Alert when a tenant sends you a direct message',               icon: Bell },
                      ].map(n => {
                        const Icon = n.icon
                        return (
                          <div key={n.key} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/60 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                <Icon className="w-4 h-4 text-blue-600" strokeWidth={1.7} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{n.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{n.desc}</p>
                              </div>
                            </div>
                            <button type="button"
                              onClick={() => setNotifs(ns => ({ ...ns, [n.key]: !(ns as any)[n.key] }))}
                              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-1 ${(notifs as any)[n.key] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${(notifs as any)[n.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Account */}
                {active === 'account' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 mb-1">Account Details</h2>
                        <p className="text-sm text-gray-400">Manage your login email and display name.</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email Address</label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                          <Mail className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
                          <input value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))}
                            className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">Changing your email requires re-verification.</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Display Name</label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all bg-white">
                          <User className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
                          <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                            placeholder="Your full name"
                            className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none" />
                        </div>
                      </div>
                      <button type="button" onClick={handleSave}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
                        Save Account Details
                      </button>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-red-800 mb-1">Danger Zone</h3>
                      <p className="text-xs text-red-600 mb-3">Permanently delete your account and all your listings. This cannot be undone.</p>
                      <button type="button" className="px-4 py-2 border border-red-300 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                )}

                {/* Security */}
                {active === 'security' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 mb-1">Change Password</h2>
                        <p className="text-sm text-gray-400">Keep your account secure with a strong password.</p>
                      </div>
                      {[
                        { key: 'currentPass', label: 'Current Password', placeholder: '••••••••' },
                        { key: 'newPass', label: 'New Password', placeholder: '8+ characters' },
                        { key: 'confirmPass', label: 'Confirm New Password', placeholder: 'Repeat new password' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{f.label}</label>
                          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all bg-white">
                            <Lock className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
                            <input
                              type={showPass ? 'text' : 'password'}
                              value={(account as any)[f.key]}
                              onChange={e => setAccount(a => ({ ...a, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none" />
                            {f.key === 'newPass' && (
                              <button type="button" onClick={() => setShowPass(s => !s)} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={handleSave}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
                        Update Password
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                      <h2 className="text-sm font-bold text-gray-900 mb-1">Active Sessions</h2>
                      <p className="text-xs text-gray-400">Devices currently signed into your account.</p>
                      <div className="p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <Key className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Current Device</p>
                            <p className="text-xs text-gray-400 mt-0.5">Active now · {user?.email}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* WhatsApp */}
                {active === 'whatsapp' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 mb-1">WhatsApp Contact Settings</h2>
                        <p className="text-sm text-gray-400">Configure how tenants can reach you via WhatsApp.</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">WhatsApp Number</label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all bg-white">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
                          <input value={whatsapp.number} onChange={e => setWhatsapp(w => ({ ...w, number: e.target.value }))}
                            placeholder="+234 800 000 0000"
                            className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">This number is displayed to tenants on your listings.</p>
                      </div>
                      {[
                        { key: 'showOnListing', label: 'Show WhatsApp button on listings', desc: 'Allow tenants to contact you directly via WhatsApp' },
                        { key: 'autoReply', label: 'Enable auto-reply message', desc: 'Automatically send a reply when a tenant first messages you' },
                      ].map(f => (
                        <div key={f.key} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{f.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                          </div>
                          <button type="button"
                            onClick={() => setWhatsapp(w => ({ ...w, [f.key]: !(w as any)[f.key] }))}
                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${(whatsapp as any)[f.key] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${(whatsapp as any)[f.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      ))}
                      {whatsapp.autoReply && (
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Auto-reply Message</label>
                          <textarea rows={3} value={whatsapp.autoReplyMsg}
                            onChange={e => setWhatsapp(w => ({ ...w, autoReplyMsg: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white resize-none" />
                        </div>
                      )}
                      <button type="button" onClick={handleSave}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
                        Save WhatsApp Settings
                      </button>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">WhatsApp Business Tip</p>
                        <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                          Using WhatsApp Business lets you set up a business profile, quick replies, and away messages — making it easier for tenants to reach you and build trust.
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

import { useState, useEffect } from 'react'
import {
  Building2, Bell, Shield, Globe, CreditCard, Save,
  CheckCircle, Mail, Phone, MapPin, ChevronRight,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const SECTIONS = [
  { id: 'platform', label: 'Platform', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'listing', label: 'Listing Rules', icon: Globe },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

export default function AdminSettings() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [active, setActive] = useState('platform')
  const [saved, setSaved] = useState(false)

  const [platform, setPlatform] = useState({
    name: 'LIVAREX Property Manager',
    tagline: "Nigeria's most trusted property platform",
    email: 'support@livarex.com',
    phone: '+234 800 548 2621',
    address: '14 Bourdillon Road, Ikoyi, Lagos',
    currency: 'NGN',
    country: 'Nigeria',
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
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-5 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
              <p className="text-sm text-gray-400 mt-0.5">Configure your platform preferences</p>
            </div>
            <button type="button" onClick={handleSave}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl shadow-sm transition-all ${
                saved
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
              }`}>
              {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {/* Mobile section tabs */}
            <div className="sm:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none -mx-1 px-1">
              {SECTIONS.map(s => {
                const Icon = s.icon
                return (
                  <button key={s.id} type="button" onClick={() => setActive(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                      active === s.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
                    {s.label}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-5 max-w-5xl">
              {/* ── Left nav ── */}
              <div className="hidden sm:block w-48 shrink-0">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {SECTIONS.map(s => {
                    const Icon = s.icon
                    return (
                      <button key={s.id} type="button" onClick={() => setActive(s.id)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                          active === s.id
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-600 hover:bg-gray-50'
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

              {/* ── Content ── */}
              <div className="flex-1 space-y-4">

                {/* Platform */}
                {active === 'platform' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-1">Platform Information</h2>
                      <p className="text-sm text-gray-400">Basic details about your real estate platform.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { key: 'name', label: 'Platform Name', icon: Building2 },
                        { key: 'tagline', label: 'Tagline', icon: Globe },
                        { key: 'email', label: 'Support Email', icon: Mail },
                        { key: 'phone', label: 'Phone', icon: Phone },
                        { key: 'address', label: 'Address', icon: MapPin },
                        { key: 'currency', label: 'Currency', icon: CreditCard },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{f.label}</label>
                          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all bg-white">
                            <f.icon className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.7} />
                            <input
                              value={(platform as any)[f.key]}
                              onChange={e => setPlatform(p => ({ ...p, [f.key]: e.target.value }))}
                              className="flex-1 text-sm text-gray-800 focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notifications */}
                {active === 'notifications' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-1">Notification Preferences</h2>
                      <p className="text-sm text-gray-400">Choose what alerts you receive.</p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { key: 'newLandlord', label: 'New landlord registration', desc: 'Get notified when a new landlord registers' },
                        { key: 'newEnquiry', label: 'New enquiry received', desc: 'Alert when a tenant sends an enquiry' },
                        { key: 'newProperty', label: 'New property listed', desc: 'Alert when a landlord adds a listing' },
                        { key: 'weeklyReport', label: 'Weekly summary report', desc: 'Receive a weekly analytics digest' },
                        { key: 'smsAlerts', label: 'SMS alerts', desc: 'Send critical alerts via SMS' },
                      ].map(n => (
                        <div key={n.key} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{n.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{n.desc}</p>
                          </div>
                          <button type="button"
                            onClick={() => setNotifications(ns => ({ ...ns, [n.key]: !(ns as any)[n.key] }))}
                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
                              (notifications as any)[n.key] ? 'bg-blue-600' : 'bg-gray-200'
                            }`}>
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              (notifications as any)[n.key] ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security */}
                {active === 'security' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-1">Security Settings</h2>
                      <p className="text-sm text-gray-400">Manage authentication and access control.</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { title: 'Two-Factor Authentication', desc: 'Require 2FA for all admin logins', enabled: true },
                        { title: 'Session Timeout', desc: 'Auto-logout after 30 minutes of inactivity', enabled: true },
                        { title: 'Login Notifications', desc: 'Email alert on new admin login', enabled: false },
                        { title: 'IP Allowlist', desc: 'Restrict admin access to specific IP ranges', enabled: false },
                      ].map(s => (
                        <div key={s.title} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                          </div>
                          <span className={`shrink-0 mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{s.enabled ? 'Active' : 'Off'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Listing Rules */}
                {active === 'listing' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-1">Listing Rules</h2>
                      <p className="text-sm text-gray-400">Control how landlords can publish property listings.</p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { key: 'autoApprove', label: 'Auto-approve listings', desc: 'Publish new listings without admin review' },
                        { key: 'requireImages', label: 'Require property images', desc: 'Landlords must upload at least one image' },
                        { key: 'requireDescription', label: 'Require description', desc: 'A text description is mandatory' },
                        { key: 'allowNegotiation', label: 'Allow price negotiation', desc: 'Enable "under negotiation" status on listings' },
                      ].map(r => (
                        <div key={r.key} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{r.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                          </div>
                          <button type="button"
                            onClick={() => setListing(l => ({ ...l, [r.key]: !(l as any)[r.key] }))}
                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
                              (listing as any)[r.key] ? 'bg-blue-600' : 'bg-gray-200'
                            }`}>
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              (listing as any)[r.key] ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      ))}
                      <div className="p-4 rounded-xl border border-gray-100">
                        <p className="text-sm font-semibold text-gray-800 mb-1">Max listings per landlord</p>
                        <p className="text-xs text-gray-400 mb-3">Limit how many active listings a single landlord can have</p>
                        <div className="flex items-center gap-3">
                          <input type="number" min={1} max={100} value={listing.maxPerLandlord}
                            onChange={e => setListing(l => ({ ...l, maxPerLandlord: Number(e.target.value) }))}
                            className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-500">listings per landlord</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing */}
                {active === 'billing' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-1">Billing & Subscription</h2>
                      <p className="text-sm text-gray-400">Your current plan and payment details.</p>
                    </div>
                    <div className="bg-blue-600 rounded-2xl p-5 text-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Current Plan</p>
                          <p className="text-2xl font-extrabold">Enterprise</p>
                          <p className="text-blue-200 text-sm mt-1">Unlimited listings · Priority support</p>
                        </div>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">Active</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                        <p className="text-sm text-blue-200">Renews: 1 June 2027</p>
                        <button type="button" className="text-sm font-bold text-white hover:text-blue-200 transition-colors">Manage Plan →</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Active Listings', value: '902+' },
                        { label: 'Landlords', value: '319+' },
                        { label: 'Monthly Visits', value: '12,400' },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 rounded-xl p-4 text-center border border-gray-100">
                          <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                      ))}
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

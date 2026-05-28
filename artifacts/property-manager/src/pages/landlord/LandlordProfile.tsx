import { useState, useEffect, useRef } from 'react'
import {
  CheckCircle, User, Phone, Shield,
  MapPin, Briefcase, Calendar, Globe, Twitter,
  Linkedin, Instagram, Camera, Save, Loader2,
} from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient, getSupabaseAvatarUrl } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

const FIELD = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
const LABEL = "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block"

const SPECIALIZATIONS = [
  'Residential', 'Commercial', 'Land & Plots', 'Short-let / Serviced',
  'Luxury Properties', 'Off-plan / New Builds', 'Student Housing',
]

export default function LandlordProfile() {
  const [user, setUser]         = useState<{ email?: string; id?: string } | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [form, setForm]         = useState({
    full_name: '', whatsapp: '', bio: '',
    city: '', state: '', years_experience: '', specialization: '',
    website: '', linkedin: '', twitter: '', instagram: '',
  })
  const [avatarUrl, setAvatarUrl]             = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const avatarInputRef          = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email, id: user.id })
      const { data } = await supabase
        .from('landlords')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setLandlord(data)
        setForm({
          full_name:        data.full_name        ?? '',
          whatsapp:         data.whatsapp         ?? '',
          bio:              data.bio              ?? '',
          city:             data.city             ?? '',
          state:            data.state            ?? '',
          years_experience: data.years_experience ?? '',
          specialization:   data.specialization   ?? '',
          website:          data.website          ?? '',
          linkedin:         data.linkedin         ?? '',
          twitter:          data.twitter          ?? '',
          instagram:        data.instagram        ?? '',
        })
        if (data.avatar_url) setAvatarUrl(getSupabaseAvatarUrl(data.avatar_url))
      }
    })
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (!file.type.startsWith('image/')) { setAvatarError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Image must be under 5MB.'); return }
    setAvatarUploading(true); setAvatarError('')
    const supabase = createClient()
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage
      .from('landlord-avatars')
      .upload(path, file, { upsert: true })
    if (upErr) { setAvatarError(upErr.message); setAvatarUploading(false); return }
    await supabase.from('landlords').update({ avatar_url: path }).eq('user_id', user.id)
    setAvatarUrl(getSupabaseAvatarUrl(path) + `?t=${Date.now()}`)
    setAvatarUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setLoading(true); setError(''); setSuccess(false)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('landlords')
      .update({
        full_name:        form.full_name,
        whatsapp:         form.whatsapp,
        bio:              form.bio              || null,
        city:             form.city             || null,
        state:            form.state            || null,
        years_experience: form.years_experience || null,
        specialization:   form.specialization   || null,
        website:          form.website          || null,
        linkedin:         form.linkedin         || null,
        twitter:          form.twitter          || null,
        instagram:        form.instagram        || null,
      })
      .eq('user_id', user.id)
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  const displayName = form.full_name || user?.email?.split('@')[0] || 'Landlord'
  const initials    = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  const location    = [form.city, form.state].filter(Boolean).join(', ')

  return (
    <AuthGuard require="landlord">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <LandlordSidebar
          userName={landlord?.full_name}
          userEmail={user?.email}
          isVerified={landlord?.is_verified}
          avatarUrl={avatarUrl}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Page header */}
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">My Profile</h1>
              <p className="text-sm text-gray-400 mt-0.5">Build your public landlord profile for tenants</p>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('profile-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Saving…' : 'Save Profile'}
            </button>
          </header>

          <main className="flex-1 overflow-y-auto">
            <form id="profile-form" onSubmit={handleSubmit}>
              <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-10 space-y-6">

                {/* ── Hero card ── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Banner */}
                  <div className="h-36 md:h-48 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 relative">
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
                        backgroundSize: '28px 28px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      title="Upload profile photo"
                      className="absolute bottom-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/35 backdrop-blur-sm rounded-xl flex items-center justify-center text-white transition-colors border border-white/30">
                      {avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Identity row */}
                  <div className="px-6 md:px-8 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 md:-mt-12 mb-4">
                      {/* Avatar */}
                      <div className="relative shrink-0 group w-fit">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl ring-4 ring-white shadow-xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                          {avatarUrl
                            ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" onError={() => setAvatarUrl(null)} />
                            : <span className="text-2xl md:text-3xl font-extrabold text-white">{initials}</span>
                          }
                        </div>
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          {avatarUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 pb-1 pt-2 sm:pt-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 leading-tight">{displayName}</h2>
                          {landlord?.is_verified && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg">
                              <CheckCircle className="w-3.5 h-3.5" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-400">
                          {location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{location}</span>}
                          {form.years_experience && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{form.years_experience} yrs exp.</span>}
                          {form.specialization && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{form.specialization}</span>}
                        </div>
                        {form.bio && <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-2 max-w-xl">{form.bio}</p>}
                      </div>

                      {/* Social quick-links */}
                      <div className="flex items-center gap-2 pb-1 shrink-0">
                        {form.website   && <a href={form.website}   target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-400 transition-colors"><Globe     className="w-4 h-4" /></a>}
                        {form.linkedin  && <a href={form.linkedin}  target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-400 transition-colors"><Linkedin  className="w-4 h-4" /></a>}
                        {form.twitter   && <a href={form.twitter}   target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-400 transition-colors"><Twitter   className="w-4 h-4" /></a>}
                        {form.instagram && <a href={form.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-pink-50 hover:text-pink-500 flex items-center justify-center text-gray-400 transition-colors"><Instagram className="w-4 h-4" /></a>}
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Camera className="w-3 h-3" />
                      Click your photo or the camera icon to upload a profile picture
                    </p>
                  </div>
                </div>

                {/* Hidden file input */}
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                {/* Feedback banners */}
                {avatarError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{avatarError}</div>}
                {error       && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
                {success     && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                    <CheckCircle className="w-4 h-4 shrink-0" /> Profile updated successfully.
                  </div>
                )}

                {/* ── 3-column grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                  {/* Card 1 — Personal Info */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <h2 className="text-sm font-bold text-gray-900">Personal Information</h2>
                    </div>

                    <div>
                      <label className={LABEL}>Full Name *</label>
                      <input required value={form.full_name}
                        onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                        placeholder="Your full legal name"
                        className={FIELD} />
                    </div>

                    <div>
                      <label className={LABEL}>WhatsApp Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input required value={form.whatsapp}
                          onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                          placeholder="+234 800 000 0000"
                          className={`${FIELD} pl-10`} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">Tenants will contact you via this number.</p>
                    </div>

                    <div>
                      <label className={LABEL}>Bio</label>
                      <textarea rows={5} value={form.bio}
                        onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                        placeholder="Tell tenants about yourself and your property management style…"
                        className={`${FIELD} resize-none`} />
                    </div>
                  </div>

                  {/* Card 2 — Professional Details */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      </div>
                      <h2 className="text-sm font-bold text-gray-900">Professional Details</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={LABEL}>City</label>
                        <input value={form.city}
                          onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                          placeholder="e.g. Lagos"
                          className={FIELD} />
                      </div>
                      <div>
                        <label className={LABEL}>State</label>
                        <input value={form.state}
                          onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                          placeholder="e.g. Lagos"
                          className={FIELD} />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL}>Years of Experience</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="number" min="0" max="50" value={form.years_experience}
                          onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))}
                          placeholder="e.g. 5"
                          className={`${FIELD} pl-10`} />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL}>Specialization</label>
                      <select value={form.specialization}
                        onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                        className={FIELD}>
                        <option value="">Select a specialization…</option>
                        {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Verification status */}
                    {landlord && (
                      <div className={`rounded-xl border p-4 flex items-start gap-3 ${
                        landlord.is_verified ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          landlord.is_verified ? 'bg-blue-600' : 'bg-gray-200'
                        }`}>
                          <Shield className={`w-4 h-4 ${landlord.is_verified ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${landlord.is_verified ? 'text-blue-800' : 'text-gray-700'}`}>
                            {landlord.is_verified ? 'Verified Account' : 'Not Yet Verified'}
                          </p>
                          <p className={`text-xs mt-0.5 leading-relaxed ${landlord.is_verified ? 'text-blue-600' : 'text-gray-500'}`}>
                            {landlord.is_verified
                              ? 'Your verified badge appears on all your listings.'
                              : 'Email support@livarex.com to request verification.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 3 — Social + Tips (spans full width on md, 1 col on xl) */}
                  <div className="space-y-5 md:col-span-2 xl:col-span-1">
                    {/* Social Links */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4 text-blue-600" />
                        </div>
                        <h2 className="text-sm font-bold text-gray-900">Social & Web Presence</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                        {[
                          { key: 'website',   label: 'Website',     icon: Globe,     placeholder: 'https://yourwebsite.com' },
                          { key: 'linkedin',  label: 'LinkedIn',    icon: Linkedin,  placeholder: 'linkedin.com/in/yourname' },
                          { key: 'twitter',   label: 'X (Twitter)', icon: Twitter,   placeholder: '@yourusername' },
                          { key: 'instagram', label: 'Instagram',   icon: Instagram, placeholder: '@yourhandle' },
                        ].map(s => {
                          const Icon = s.icon
                          return (
                            <div key={s.key}>
                              <label className={LABEL}>{s.label}</label>
                              <div className="relative">
                                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input value={(form as any)[s.key]}
                                  onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                                  placeholder={s.placeholder}
                                  className={`${FIELD} pl-10`} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Profile tips */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 space-y-3">
                      <p className="text-sm font-bold text-white">Profile Tips</p>
                      {[
                        'Upload a clear profile photo to build trust',
                        'A complete profile gets 3× more enquiries',
                        'Add your WhatsApp for direct tenant contact',
                        'A clear bio builds trust with potential tenants',
                        'Social links show transparency & professionalism',
                      ].map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-200 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-100 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </form>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

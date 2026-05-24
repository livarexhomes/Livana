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
const SPECIALIZATIONS = [
  'Residential', 'Commercial', 'Land & Plots', 'Short-let / Serviced',
  'Luxury Properties', 'Off-plan / New Builds', 'Student Housing',
]

export default function LandlordProfile() {
  const [user, setUser]         = useState<{ email?: string; id?: string } | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: '', whatsapp: '', bio: '',
    city: '', state: '', years_experience: '',
    specialization: '',
    linkedin: '', twitter: '', instagram: '', website: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email, id: user.id })
      const { data: l } = await supabase
        .from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (l) {
        setAvatarUrl(l.avatar_url ?? null)
        setForm({
          full_name:        l.full_name        ?? '',
          whatsapp:         l.whatsapp         ?? '',
          bio:              l.bio              ?? '',
          city:             (l as any).city              ?? '',
          state:            (l as any).state             ?? '',
          years_experience: (l as any).years_experience  ?? '',
          specialization:   (l as any).specialization    ?? '',
          linkedin:         (l as any).linkedin          ?? '',
          twitter:          (l as any).twitter           ?? '',
          instagram:        (l as any).instagram         ?? '',
          website:          (l as any).website           ?? '',
        })
      }
    })
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (!file.type.startsWith('image/')) { setAvatarError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Image must be under 5MB.'); return }

    setAvatarUploading(true)
    setAvatarError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: upErr } = await supabase.storage
      .from('landlord-avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      setAvatarError('Upload failed: ' + upErr.message)
      setAvatarUploading(false)
      return
    }

    const publicUrl = getSupabaseAvatarUrl(path)
    const { error: dbErr } = await supabase
      .from('landlords')
      .update({ avatar_url: publicUrl })
      .eq('user_id', user.id)

    if (dbErr) {
      setAvatarError('Saved photo but failed to update profile: ' + dbErr.message)
    } else {
      setAvatarUrl(publicUrl)
    }
    setAvatarUploading(false)
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setLoading(true); setError(''); setSuccess(false)
    const supabase = createClient()
    const { error: err } = await supabase.from('landlords').upsert(
      { user_id: user.id, ...form },
      { onConflict: 'user_id' }
    )
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  const displayName = form.full_name || user?.email?.split('@')[0] || 'Landlord'
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'L'
  const location = [form.city, form.state].filter(Boolean).join(', ')

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
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">My Profile</h1>
              <p className="text-sm text-gray-400 mt-0.5">Build your public landlord profile for tenants</p>
            </div>
            <button type="button" form="profile-form"
              onClick={() => document.getElementById('profile-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              <Save className="w-4 h-4" />
              {loading ? 'Saving…' : 'Save Profile'}
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <form id="profile-form" onSubmit={handleSubmit}>
              <div className="max-w-3xl space-y-5">

                {/* Profile header card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      title="Change cover / avatar"
                      className="absolute bottom-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-60">
                      {avatarUploading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Camera className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="px-6 pb-5">
                    <div className="flex items-end gap-4 -mt-8 mb-4">
                      {/* Avatar — real photo or initials fallback */}
                      <div className="relative shrink-0 group">
                        <div className="w-16 h-16 rounded-2xl ring-4 ring-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                          {avatarUrl
                            ? <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={() => setAvatarUrl(null)}
                              />
                            : <span className="text-xl font-extrabold text-white">{initials}</span>
                          }
                        </div>
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          title="Upload profile photo"
                          className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity disabled:opacity-60">
                          {avatarUploading
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : <Camera className="w-5 h-5" />}
                        </button>
                      </div>

                      <div className="pb-1">
                        <p className="text-lg font-extrabold text-gray-900 leading-tight">{displayName}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          {location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>}
                          {form.years_experience && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{form.years_experience} yrs exp.</span>}
                          {form.specialization && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{form.specialization}</span>}
                        </div>
                      </div>
                      {landlord?.is_verified && (
                        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-xl">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-blue-600">Verified</span>
                        </div>
                      )}
                    </div>

                    {form.bio && <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{form.bio}</p>}

                    {/* Upload hint */}
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      Click your photo or the camera icon to upload a profile picture
                    </p>
                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />

                {/* Avatar error */}
                {avatarError && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{avatarError}</div>
                )}

                {/* Form feedback */}
                {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
                {success && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                    <CheckCircle className="w-4 h-4 shrink-0" /> Profile updated successfully.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left column */}
                  <div className="space-y-5">

                    {/* Personal Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                        <User className="w-4 h-4 text-blue-600" />
                        <h2 className="text-sm font-bold text-gray-900">Personal Information</h2>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Full Name *</label>
                        <input required value={form.full_name}
                          onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                          placeholder="Your full legal name"
                          className={FIELD} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">WhatsApp Number *</label>
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
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Bio</label>
                        <textarea rows={4} value={form.bio}
                          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                          placeholder="Tell tenants about yourself and your property management style…"
                          className={`${FIELD} resize-none`} />
                      </div>
                    </div>

                    {/* Social Links */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <h2 className="text-sm font-bold text-gray-900">Social & Web Presence</h2>
                      </div>
                      {[
                        { key: 'website',   label: 'Website',     icon: Globe,     placeholder: 'https://yourwebsite.com' },
                        { key: 'linkedin',  label: 'LinkedIn',    icon: Linkedin,  placeholder: 'linkedin.com/in/yourname' },
                        { key: 'twitter',   label: 'X (Twitter)', icon: Twitter,   placeholder: '@yourusername' },
                        { key: 'instagram', label: 'Instagram',   icon: Instagram, placeholder: '@yourhandle' },
                      ].map(s => {
                        const Icon = s.icon
                        return (
                          <div key={s.key}>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{s.label}</label>
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

                  {/* Right column */}
                  <div className="space-y-5">

                    {/* Professional Details */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        <h2 className="text-sm font-bold text-gray-900">Professional Details</h2>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">City</label>
                        <input value={form.city}
                          onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                          placeholder="e.g. Lagos"
                          className={FIELD} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">State</label>
                        <input value={form.state}
                          onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                          placeholder="e.g. Lagos State"
                          className={FIELD} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Years of Experience</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="number" min="0" max="50" value={form.years_experience}
                            onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))}
                            placeholder="e.g. 5"
                            className={`${FIELD} pl-10`} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Specialization</label>
                        <select value={form.specialization}
                          onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                          className={FIELD}>
                          <option value="">Select a specialization…</option>
                          {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Verification status */}
                    {landlord && (
                      <div className={`rounded-2xl border p-5 flex items-start gap-3 ${
                        landlord.is_verified ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white shadow-sm'
                      }`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          landlord.is_verified ? 'bg-blue-600' : 'bg-gray-100'
                        }`}>
                          <Shield className={`w-4.5 h-4.5 ${landlord.is_verified ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${landlord.is_verified ? 'text-blue-800' : 'text-gray-700'}`}>
                            {landlord.is_verified ? 'Verified Account' : 'Not Yet Verified'}
                          </p>
                          <p className={`text-xs mt-1 leading-relaxed ${landlord.is_verified ? 'text-blue-600' : 'text-gray-500'}`}>
                            {landlord.is_verified
                              ? 'Your verified badge is displayed on all your listings. Tenants see this as a trust signal.'
                              : 'Complete your profile and email support@livarex.com to request verification. Verified landlords get 3× more enquiries.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Profile tips */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 space-y-3">
                      <p className="text-sm font-bold text-blue-900">Profile Tips</p>
                      {[
                        'Upload a clear profile photo to build trust',
                        'A complete profile gets 3× more enquiries',
                        'Add your WhatsApp number to enable direct contact',
                        'A clear bio builds trust with potential tenants',
                        'Social links show transparency and professionalism',
                      ].map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700">{tip}</p>
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

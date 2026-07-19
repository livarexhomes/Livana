'use client'

import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import {
  User, ShieldCheck, FileText, CheckCircle2,
  Upload, X, AlertCircle, ChevronRight, Loader2,
  KeyRound, Camera,
} from 'lucide-react'
import { createClient } from '../../lib/supabase'

// ── Constants ────────────────────────────────────────────────
const FIELD = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
const SELECT = FIELD + ' cursor-pointer'

const ID_TYPES = [
  'National ID Card (NIN)',
  "Voter's Card",
  "Driver's License",
]

const ID_TYPE_LENGTHS: Record<string, number> = {
  'National ID Card (NIN)': 11,
  "Voter's Card": 10,
  "Driver's License": 11,
}

const DOC_SLOTS = [
  { key: 'id_front',     label: 'ID Card — Front',      required: true  },
  { key: 'id_back',      label: 'ID Card — Back',        required: true  },
  { key: 'utility_bill', label: 'Utility Bill / Proof of Address', required: true },
  // { key: 'selfie',       label: 'Selfie with ID',        required: true  },
]

const STEPS = [
  { id: 1, label: 'Profile',   icon: User },
  { id: 2, label: 'KYC Info',  icon: ShieldCheck },
  { id: 3, label: 'Documents', icon: FileText },
]

// ── Component ────────────────────────────────────────────────
export default function LandlordOnboarding() {
  const [, navigate] = useLocation()
  const [step, setStep] = useState(1)
  const [landlordId, setLandlordId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Step 1 — Profile
  const [profile, setProfile] = useState({
    full_name: '', whatsapp: '', city: '', state: '', bio: '',
  })

  // Step 2 — KYC
  const [kyc, setKyc] = useState({
    id_type: '', id_number: '', kyc_notes: '',
  })

  // Step 3 — Documents
  const [docs, setDocs] = useState<Record<string, File | null>>({
    id_front: null, id_back: null, utility_bill: null, selfie: null,
  })
  const [docPreviews, setDocPreviews] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // OTP verification state
  const [otpStep, setOtpStep]         = useState(false)   // show OTP entry screen
  const [otpCode, setOtpCode]         = useState('')
  const [otpLoading, setOtpLoading]   = useState(false)
  const [otpError, setOtpError]       = useState('')
  const [otpResending, setOtpResending] = useState(false)
  const [userEmail, setUserEmail]     = useState('')

  // ── Load landlord ────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/login'); return }
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      const { data: l } = await supabase
        .from('landlords').select('*').eq('user_id', user.id).single() as { data: any }
      if (!l) { navigate('/'); return }
      // Already approved — go to dashboard
      if (l.status === 'approved') { navigate('/landlord'); return }
      // Already submitted — show pending screen
      if (l.status === 'pending') { setSubmitted(true); setLoading(false); return }
      setLandlordId(l.id)
      setProfile({
        full_name: l.full_name ?? '',
        whatsapp:  l.whatsapp  ?? '',
        city:      l.city      ?? '',
        state:     l.state     ?? '',
        bio:       l.bio       ?? '',
      })
      setKyc({
        id_type:   l.id_type   ?? '',
        id_number: l.id_number ?? '',
        kyc_notes: l.kyc_notes ?? '',
      })
      setLoading(false)
    })
  }, [])

  // ── Helpers ──────────────────────────────────────────────
  function setP(k: keyof typeof profile, v: string) { setProfile(p => ({ ...p, [k]: v })) }
  function setK(k: keyof typeof kyc, v: string)     { setKyc(p => ({ ...p, [k]: v })) }

  function pickFile(key: string, file: File) {
    setDocs(d => ({ ...d, [key]: file }))
    const url = URL.createObjectURL(file)
    setDocPreviews(p => ({ ...p, [key]: url }))
  }
  function removeFile(key: string) {
    setDocs(d => ({ ...d, [key]: null }))
    setDocPreviews(p => { const n = { ...p }; delete n[key]; return n })
  }

  // ── Step 1 save ──────────────────────────────────────────
  async function saveProfile() {
    if (!landlordId) return
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('landlords').update({
      full_name: profile.full_name,
      whatsapp:  profile.whatsapp,
      city:      profile.city  || null,
      state:     profile.state || null,
      bio:       profile.bio   || null,
    }).eq('id', landlordId)
    setSaving(false)
    if (err) { setError(err.message); return }
    setStep(2)
  }

  // ── Step 2 save ──────────────────────────────────────────
  async function saveKyc() {
    if (!landlordId) return
    const max = ID_TYPE_LENGTHS[kyc.id_type] ?? 20
    const normalized = kyc.id_number.replace(/\D/g, '')
    if (!normalized) {
      setError('Please enter your ID number.')
      return
    }
    if (normalized.length > max) {
      setError(`ID number must be at most ${max} digits.`)
      return
    }
    if (normalized !== kyc.id_number) {
      setError('ID number may only contain digits.')
      return
    }

    setSaving(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('landlords').update({
      id_type:   kyc.id_type   || null,
      id_number: kyc.id_number || null,
      kyc_notes: kyc.kyc_notes || null,
    }).eq('id', landlordId)
    setSaving(false)
    if (err) { setError(err.message); return }
    setStep(3)
  }

  // ── Step 3 upload + send OTP ────────────────────────────
  async function submitAll() {
    if (!landlordId || !userId) return
    const required = DOC_SLOTS.filter(s => s.required)
    const missing = required.filter(s => !docs[s.key])
    if (missing.length > 0) {
      setError(`Please upload: ${missing.map(s => s.label).join(', ')}`)
      return
    }
    setUploading(true); setError('')
    const supabase = createClient()

    // Upload each document
    for (const slot of DOC_SLOTS) {
      const file = docs[slot.key]
      if (!file) continue
      const ext = file.name.split('.').pop()
      const path = `${userId}/${slot.key}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('kyc-documents')
        .upload(path, file, { upsert: true })
      if (upErr) { setError(`Upload failed: ${upErr.message}`); setUploading(false); return }
      await supabase.from('kyc_documents').insert({
        landlord_id:  landlordId,
        doc_type:     slot.key,
        storage_path: path,
        file_name:    file.name,
      })
    }

    setUploading(false)

    // Send OTP to the landlord's email for final verification
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, full_name: profile.full_name }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to send verification code. Please try again.')
      return
    }

    setOtpStep(true)
  }

  // ── OTP verify + finalise ────────────────────────────────
  async function verifyOtp() {
    if (!landlordId || otpCode.length !== 6) return
    setOtpLoading(true); setOtpError('')

    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, otp: otpCode }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      setOtpError(body.error ?? 'Incorrect code. Please try again.')
      setOtpLoading(false); return
    }

    // OTP verified — mark landlord as pending for admin review
    const supabase = createClient()
    await supabase.from('landlords').update({
      status: 'pending',
      kyc_submitted_at: new Date().toISOString(),
    }).eq('id', landlordId)

    setOtpLoading(false)
    navigate('/landlord/pending')
  }

  async function resendOtp() {
    if (!userEmail) return
    setOtpResending(true); setOtpError('')

    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, full_name: profile.full_name }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setOtpError(body.error ?? 'Failed to resend verification code. Please try again.')
    }

    setOtpResending(false)
  }

  // ── OTP verification screen ──────────────────────────────
  if (otpStep) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
            <KeyRound className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            We sent a 6-digit code to <span className="font-semibold text-gray-700">{userEmail}</span>.
            Enter it below to complete your application.
          </p>

          {otpError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-left">
              {otpError}
            </div>
          )}

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all mb-4"
          />

          <button
            onClick={verifyOtp}
            disabled={otpLoading || otpCode.length !== 6}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all text-sm flex items-center justify-center gap-2 mb-4">
            {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {otpLoading ? 'Verifying…' : 'Verify & Submit Application'}
          </button>

          <button
            onClick={resendOtp}
            disabled={otpResending}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50">
            {otpResending ? 'Sending…' : "Didn't receive it? Resend code"}
          </button>
        </div>
      </div>
    )
  }

  // ── Submitted screen ─────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-3xl border border-gray-100 p-10 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted</h2>
          <p className="text-gray-500 leading-relaxed mb-6 text-sm">
            Your KYC documents are under review. Our team will verify your information within 24 hours.
            You'll be able to list properties once approved.
          </p>
          <Link href="/"
            className="block w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  // ── Main layout ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-lg font-extrabold text-gray-900 tracking-tight">LIVAREX</span>
          </Link>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
            Landlord Onboarding
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = step > s.id
            const active = step === s.id
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    done    ? 'bg-emerald-500 text-white' :
                    active  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-[11px] font-semibold ${active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all ${step > s.id ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto shrink-0"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── STEP 1: Profile ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <User className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Your Profile</h2>
                <span className="ml-auto text-xs text-gray-400">Step 1 of 3</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name *</label>
                <input required value={profile.full_name} onChange={e => setP('full_name', e.target.value)}
                  placeholder="e.g. Adebayo Johnson" className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">WhatsApp Number *</label>
                <input required value={profile.whatsapp} onChange={e => setP('whatsapp', e.target.value)}
                  placeholder="+2348012345678" className={FIELD} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">City</label>
                  <input value={profile.city} onChange={e => setP('city', e.target.value)}
                    placeholder="e.g. Lagos" className={FIELD} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">State</label>
                  <input value={profile.state} onChange={e => setP('state', e.target.value)}
                    placeholder="e.g. Lagos State" className={FIELD} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bio <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <textarea rows={3} value={profile.bio} onChange={e => setP('bio', e.target.value)}
                  placeholder="Tell tenants a bit about yourself…"
                  className={FIELD + ' resize-none'} />
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving || !profile.full_name || !profile.whatsapp}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 text-sm flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving…' : <>Continue <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* ── STEP 2: KYC Info ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Personal */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Identity Verification</h2>
                <span className="ml-auto text-xs text-gray-400">Step 2 of 3</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ID Type *</label>
                <select required value={kyc.id_type} onChange={e => {
                  const selected = e.target.value
                  setK('id_type', selected)
                  const max = ID_TYPE_LENGTHS[selected] ?? 20
                  if (kyc.id_number.length > max) setK('id_number', kyc.id_number.slice(0, max))
                }} className={SELECT}>
                  <option value="">Select ID type…</option>
                  {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ID Number *</label>
                <input required value={kyc.id_number} onChange={e => {
                  const max = ID_TYPE_LENGTHS[kyc.id_type] ?? 20
                  setK('id_number', e.target.value.replace(/\D/g, '').slice(0, max))
                }}
                  placeholder="Enter your ID number" className={FIELD} />
                <p className="text-xs text-gray-400 mt-1">
                  Numbers only{kyc.id_type ? ` — max ${ID_TYPE_LENGTHS[kyc.id_type]} digits` : ''}
                </p>
              </div>

            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-sm">
                Back
              </button>
              <button onClick={saveKyc}
                disabled={saving || !kyc.id_type || !kyc.id_number}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 text-sm flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving…' : <>Continue <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Documents ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <FileText className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Upload Documents</h2>
                <span className="ml-auto text-xs text-gray-400">Step 3 of 3</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Upload clear photos or scans. Accepted formats: JPG, PNG, PDF (max 10 MB each).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DOC_SLOTS.map(slot => {
                  const preview = docPreviews[slot.key]
                  const file = docs[slot.key]
                  return (
                    <div key={slot.key}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {slot.label} {slot.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        ref={el => { fileRefs.current[slot.key] = el }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(slot.key, f) }}
                      />
                      {file ? (
                        <div className="relative rounded-xl border-2 border-emerald-400 bg-emerald-50 overflow-hidden">
                          {preview && file.type.startsWith('image/') ? (
                            <img src={preview} alt={slot.label} className="w-full h-32 object-cover" />
                          ) : (
                            <div className="h-32 flex flex-col items-center justify-center gap-2">
                              <FileText className="w-8 h-8 text-emerald-500" />
                              <p className="text-xs font-semibold text-emerald-700 truncate px-4 max-w-full">{file.name}</p>
                            </div>
                          )}
                          <button onClick={() => removeFile(slot.key)}
                            className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm text-red-500 hover:bg-red-50 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute bottom-2 left-2">
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> Uploaded
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button type="button"
                          onClick={() => fileRefs.current[slot.key]?.click()}
                          className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 flex flex-col items-center justify-center gap-2 transition-all group">
                          {slot.key === 'selfie'
                            ? <Camera className="w-7 h-7 text-gray-300 group-hover:text-blue-400 transition-colors" />
                            : <Upload className="w-7 h-7 text-gray-300 group-hover:text-blue-400 transition-colors" />
                          }
                          <span className="text-xs text-gray-400 group-hover:text-blue-500 font-medium transition-colors">
                            Click to upload
                          </span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Privacy note */}
            <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Your documents are encrypted and stored securely. They are only accessible to LIVAREX admins for verification purposes and will never be shared with third parties.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-sm">
                Back
              </button>
              <button onClick={submitAll} disabled={uploading}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 text-sm flex items-center justify-center gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Submit for Verification'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

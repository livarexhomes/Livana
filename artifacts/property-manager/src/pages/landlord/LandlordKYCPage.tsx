import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { ShieldCheck, FileText, CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '../../lib/supabase'

const FIELD = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
const SELECT = FIELD + ' cursor-pointer'

const ID_TYPES = ['National ID Card (NIN)', "Voter's Card", "Driver's License", 'International Passport', 'BVN (Bank Verification Number)']
const BANKS = ['Access Bank', 'GTBank', 'First Bank', 'Zenith Bank', 'UBA', 'Fidelity Bank', 'FCMB', 'Polaris Bank', 'Stanbic IBTC', 'Sterling Bank', 'Union Bank', 'Wema Bank', 'Other']

export default function LandlordKYCPage() {
  const [, navigate] = useLocation()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [landlordId, setLandlordId] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)

  const [form, setForm] = useState({
    nin: '', dob: '', id_type: '', id_number: '',
    bank_name: '', account_number: '', state: '', kyc_notes: '',
  })

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/login'); return }
      const { data: landlord } = await supabase.from('landlords').select('id, status, full_name').eq('user_id', user.id).single() as { data: any }
      if (!landlord) { navigate('/'); return }
      setLandlordId(landlord.id)
      setCurrentStatus(landlord.status)
      setLoading(false)
    })
  }, [])

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!landlordId) return
    setSubmitting(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('landlords').update({
      nin: form.nin || null,
      dob: form.dob || null,
      id_type: form.id_type || null,
      id_number: form.id_number || null,
      bank_name: form.bank_name || null,
      account_number: form.account_number || null,
      state: form.state || null,
      kyc_notes: form.kyc_notes || null,
      kyc_submitted_at: new Date().toISOString(),
      status: 'pending',
    }).eq('id', landlordId)

    if (err) {
      setError('Failed to submit KYC. Please contact support.')
      console.error('KYC error:', err)
    } else {
      setCurrentStatus('pending')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (currentStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-3xl border border-gray-200 p-10 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">KYC Under Review</h2>
          <p className="text-gray-500 leading-relaxed mb-6">
            Your KYC information has been submitted and is being reviewed by our Admin team. This usually takes up to 24 hours. You'll be able to list properties once approved.
          </p>
          <div className="space-y-3">
            <Link href="/" className="block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Back to Home
            </Link>
            <Link href="/contact" className="block px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (currentStatus === 'approved') {
    navigate('/landlord'); return null
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <img src="/livana-logo-transparent.png" alt="LIVAREX" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            KYC Required
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/25">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Verify Your Identity</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            To maintain trust on our platform, we require all landlords to complete identity verification before listing properties.
          </p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">NIN (National ID No.) *</label>
                <input required type="text" placeholder="12345678901" value={form.nin} onChange={e => set('nin', e.target.value)} className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date of Birth *</label>
                <input required type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className={FIELD} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">State of Origin *</label>
              <input required type="text" placeholder="e.g. Lagos State" value={form.state} onChange={e => set('state', e.target.value)} className={FIELD} />
            </div>
          </div>

          {/* Government ID */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900">Government ID</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ID Type *</label>
              <select required value={form.id_type} onChange={e => set('id_type', e.target.value)} className={SELECT}>
                <option value="">Select ID type…</option>
                {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ID Number *</label>
              <input required type="text" placeholder="Enter your ID number" value={form.id_number} onChange={e => set('id_number', e.target.value)} className={FIELD} />
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900">Bank Details</h2>
              <span className="ml-auto text-xs text-gray-400">For payment verification only</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bank Name *</label>
                <select required value={form.bank_name} onChange={e => set('bank_name', e.target.value)} className={SELECT}>
                  <option value="">Select bank…</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Number *</label>
                <input required type="text" maxLength={10} placeholder="0123456789" value={form.account_number} onChange={e => set('account_number', e.target.value.replace(/\D/g, '').slice(0, 10))} className={FIELD} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Additional Notes <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
              <textarea rows={3} placeholder="Any additional information you'd like to share with the Admin..." value={form.kyc_notes} onChange={e => set('kyc_notes', e.target.value)} className={FIELD + ' resize-none'} />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Your personal information is encrypted and stored securely. It will only be used for identity verification purposes and will not be shared with third parties.
            </p>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 text-sm">
            {submitting ? 'Submitting your KYC…' : 'Submit for Verification'}
          </button>
        </form>
      </div>
    </div>
  )
}

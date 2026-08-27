// Shared types, helpers, and mock data for the Vetting Hub redesign.
// Real data is still loaded by AdminVetting.tsx; this file is the source
// of truth for component prop types and the VITE_USE_MOCK_VETTING demo path.

export type VettingStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'not_submitted'

export type VettingLandlord = {
  id: string
  full_name: string
  whatsapp: string
  email: string
  city: string
  nin: string
  id_type: string
  id_number: string
  status: VettingStatus
  is_verified: boolean
  created_at: string
  kyc_submitted_at: string | null
}

export type VettingKycDoc = {
  doc_type: string
  file_name: string
  url: string
}

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-indigo-400 to-indigo-600',
]

export function avatarGrad(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function daysAgo(d: string | null | undefined): string | null {
  if (!d) return null
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

export const KYC_STATUS_META: Record<VettingStatus, {
  label: string
  bg: string
  text: string
  border: string
  dot: string
}> = {
  approved:      { label: 'Approved',      bg: 'bg-emerald-50 dark:bg-emerald-950/40',  text: 'text-emerald-700 dark:text-emerald-300',  border: 'border-emerald-200 dark:border-emerald-800/60', dot: 'bg-emerald-500' },
  pending:       { label: 'Pending',       bg: 'bg-amber-50 dark:bg-amber-950/40',      text: 'text-amber-700 dark:text-amber-300',      border: 'border-amber-200 dark:border-amber-800/60',     dot: 'bg-amber-500'   },
  rejected:      { label: 'Rejected',      bg: 'bg-red-50 dark:bg-red-950/40',          text: 'text-red-700 dark:text-red-300',          border: 'border-red-200 dark:border-red-800/60',         dot: 'bg-red-500'     },
  suspended:     { label: 'Suspended',     bg: 'bg-slate-100 dark:bg-slate-800',        text: 'text-slate-700 dark:text-slate-200',      border: 'border-slate-200 dark:border-slate-700',        dot: 'bg-slate-500'   },
  not_submitted: { label: 'Not Submitted', bg: 'bg-slate-50 dark:bg-slate-900',         text: 'text-slate-500 dark:text-slate-400',      border: 'border-slate-200 dark:border-slate-700',        dot: 'bg-slate-400'   },
}

export const DOC_LABELS: Record<string, string> = {
  id_front:     'National ID — Front',
  id_back:      'National ID — Back',
  utility_bill: 'Utility Bill',
  selfie:       'Selfie Verification',
  nin_slip:     'NIN Slip',
}

// ── Mock data ────────────────────────────────────────────────────────────────
// Used when VITE_USE_MOCK_VETTING=true. Covers each status so the redesigned
// UI can be demoed end-to-end without a live Supabase connection.

const NOW = Date.now()
const days = (n: number) => new Date(NOW - n * 86400000).toISOString()

export const MOCK_LANDLORDS: VettingLandlord[] = [
  {
    id: 'mock-1',
    full_name: 'Adaeze Okonkwo',
    whatsapp: '+234 803 412 9087',
    email: 'adaeze.o@example.com',
    city: 'Lekki, Lagos',
    nin: '29384756102',
    id_type: 'NIN Slip',
    id_number: '29384756102',
    status: 'pending',
    is_verified: false,
    created_at: days(14),
    kyc_submitted_at: days(2),
  },
  {
    id: 'mock-2',
    full_name: 'Tunde Bakare',
    whatsapp: '+234 706 921 3344',
    email: 'tunde.b@example.com',
    city: 'Yaba, Lagos',
    nin: '56102938475',
    id_type: 'Driver License',
    id_number: 'LKA02938475',
    status: 'pending',
    is_verified: false,
    created_at: days(21),
    kyc_submitted_at: days(4),
  },
  {
    id: 'mock-3',
    full_name: 'Chinwe Eze',
    whatsapp: '+234 810 553 7211',
    email: 'chinwe.eze@example.com',
    city: 'Ikeja, Lagos',
    nin: '84756102938',
    id_type: 'International Passport',
    id_number: 'A04928374',
    status: 'pending',
    is_verified: false,
    created_at: days(7),
    kyc_submitted_at: days(1),
  },
  {
    id: 'mock-4',
    full_name: 'Ibrahim Suleiman',
    whatsapp: '+234 803 998 1023',
    email: 'ibrahim.s@example.com',
    city: 'Sango Ota, Ogun',
    nin: '10293847561',
    id_type: 'Voter Card',
    id_number: 'VCB847561023',
    status: 'approved',
    is_verified: true,
    created_at: days(62),
    kyc_submitted_at: days(58),
  },
  {
    id: 'mock-5',
    full_name: 'Folake Adeyemi',
    whatsapp: '+234 706 442 8710',
    email: 'folake.a@example.com',
    city: 'Magodo, Lagos',
    nin: '37485920164',
    id_type: 'NIN Slip',
    id_number: '37485920164',
    status: 'approved',
    is_verified: true,
    created_at: days(45),
    kyc_submitted_at: days(40),
  },
  {
    id: 'mock-6',
    full_name: 'Olumide Adesanya',
    whatsapp: '+234 810 776 3344',
    email: 'olumide.a@example.com',
    city: 'Surulere, Lagos',
    nin: '92038475610',
    id_type: 'NIN Slip',
    id_number: '92038475610',
    status: 'rejected',
    is_verified: false,
    created_at: days(30),
    kyc_submitted_at: days(26),
  },
  {
    id: 'mock-7',
    full_name: 'Ngozi Umeh',
    whatsapp: '+234 803 119 4477',
    email: 'ngozi.u@example.com',
    city: 'Ajah, Lagos',
    nin: '66778899001',
    id_type: 'NIN Slip',
    id_number: '66778899001',
    status: 'suspended',
    is_verified: false,
    created_at: days(95),
    kyc_submitted_at: days(90),
  },
  {
    id: 'mock-8',
    full_name: 'Kelechi Nwosu',
    whatsapp: '+234 706 224 9988',
    email: 'kelechi.n@example.com',
    city: 'Maryland, Lagos',
    nin: '11223344556',
    id_type: 'Driver License',
    id_number: 'LKA112233445',
    status: 'not_submitted',
    is_verified: false,
    created_at: days(3),
    kyc_submitted_at: null,
  },
]

export const MOCK_KYC_DOCS: VettingKycDoc[] = [
  { doc_type: 'id_front',     file_name: 'national_id_front.jpg', url: '' },
  { doc_type: 'id_back',      file_name: 'national_id_back.jpg',  url: '' },
  { doc_type: 'selfie',       file_name: 'selfie_with_id.jpg',    url: '' },
  { doc_type: 'utility_bill', file_name: 'phcn_bill_2025.pdf',   url: '' },
]

// Read once at import time so production builds don't ship the env string.
export const USE_MOCK_VETTING: boolean =
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env?.VITE_USE_MOCK_VETTING === 'true'

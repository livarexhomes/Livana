import { ShieldCheck, FileText, UserCheck, Home, Award, AlertTriangle, CheckCircle, ArrowRight, Phone } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import SEO from '@/components/SEO'
import { Link } from '@/lib/navigation'

const STEPS = [
  {
    number: 1,
    icon: <UserCheck className="w-6 h-6 text-blue-600" />,
    title: 'Account Registration',
    description: 'Landlords create a verified account with a valid email address and Nigerian phone number. OTP verification confirms the phone immediately.',
    badge: 'Required',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    number: 2,
    icon: <FileText className="w-6 h-6 text-violet-600" />,
    title: 'Government ID Submission',
    description: 'Every landlord must upload a clear photo of one government-issued ID: NIN slip, international passport, driver\'s license, or voter\'s card.',
    badge: 'Required',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    number: 3,
    icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
    title: 'Manual Document Review',
    description: 'Our verification team reviews every submission within 24–48 hours. We cross-check the ID details, confirm identity, and check against our fraud database.',
    badge: '24–48 hrs',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    number: 4,
    icon: <Home className="w-6 h-6 text-amber-600" />,
    title: 'Property Ownership Confirmation',
    description: 'For each listing, we review proof of ownership or legal authority to let (title deed, C of O, allocation letter, or estate agent authority). Landlords listing without proof are declined.',
    badge: 'Per listing',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    number: 5,
    icon: <Award className="w-6 h-6 text-blue-600" />,
    title: 'Verified Badge Awarded',
    description: 'Approved landlords receive the ✅ Verified badge on their profile and all their listings. This badge tells tenants: "This person is real, their identity is confirmed, and their property claim has been checked."',
    badge: 'Ongoing',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
]

const FAQS = [
  {
    q: 'How long does verification take?',
    a: 'Document review typically takes 24–48 hours on business days. You\'ll receive an email notification as soon as your application is reviewed.',
  },
  {
    q: 'What happens if a landlord submits fake documents?',
    a: 'Any landlord found submitting fraudulent documents is permanently banned from LIVAREX. We report repeat offenders to relevant authorities. Tenants can also flag suspicious listings using the "Report Listing" button on any property.',
  },
  {
    q: 'Can tenants report fake listings?',
    a: 'Yes. Every property page has a "Report Listing" button. Reports are reviewed within 24 hours, and listings that violate our policy are taken down immediately.',
  },
  {
    q: 'Does "Verified" mean the property is guaranteed?',
    a: 'Verified status means the landlord\'s identity has been confirmed and their claim to the property has been checked. It significantly reduces scam risk, but we still encourage tenants to book an inspection before making any payment.',
  },
  {
    q: 'What is planned for the future?',
    a: 'We\'re building NIN/BVN database integration and face-match verification. These will go live as part of our Phase 2 upgrades, making LIVAREX the most rigorously verified property platform in Nigeria.',
  },
]

export default function HowWeVerifyPage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="How LIVAREX Verifies Landlords — Trust & Safety"
        description="Learn exactly how LIVAREX verifies every landlord: government ID checks, property ownership confirmation, and our 5-step manual review process. Trust is our product."
        url="/how-we-verify"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <PublicNavbar />

      {/* Hero */}
      <div className="pt-[72px] bg-gradient-to-br from-gray-950 via-blue-950 to-gray-900">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-16 md:py-24 text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/40">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-4">
            How LIVAREX Verifies Landlords
          </h1>
          <p className="text-blue-200/80 text-base md:text-xl max-w-2xl mx-auto">
            Trust is our product. Every landlord on LIVAREX goes through a manual identity and property verification process before their listings go live.
          </p>
        </div>
      </div>

      {/* Trust stats */}
      <div className="bg-blue-600">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: '100%', label: 'Landlords ID-verified' },
            { num: '24–48h', label: 'Review turnaround' },
            { num: '0', label: 'Unreviewed listings' },
            { num: '24h', label: 'Report response time' },
          ].map(({ num, label }) => (
            <div key={label}>
              <p className="text-2xl font-black text-white">{num}</p>
              <p className="text-blue-200/80 text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-3">Our Process</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">5-step verification</h2>
        </div>
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex gap-5 bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                  {step.icon}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-gray-200 min-h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-extrabold text-gray-900 text-base">{step.title}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${step.badgeColor}`}>
                    {step.badge}
                  </span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
              <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400 text-sm font-black shrink-0">
                {step.number}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What Verified means */}
      <div className="bg-gray-50 border-y border-gray-100 py-14">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">
                What the ✅ badge means
              </h2>
              <div className="space-y-3">
                {[
                  'The landlord\'s government-issued ID has been reviewed',
                  'Their identity matches the documents submitted',
                  'Their claim to the property has been checked',
                  'Their listing complies with our content policy',
                  'They agreed to LIVAREX\'s landlord code of conduct',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-gray-600 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-900 mb-2">Always inspect before paying</h3>
                  <p className="text-amber-700 text-sm leading-relaxed">
                    Verified status dramatically reduces scam risk, but we still strongly recommend booking a physical inspection before transferring any money. Use our free inspection booking tool on every property page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-8 text-center">Common questions</h2>
        <div className="space-y-4">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="border border-gray-100 rounded-2xl p-6 bg-white">
              <h3 className="font-bold text-gray-900 mb-2 text-sm">{q}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="bg-gray-950 py-14">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
              <h3 className="text-xl font-extrabold text-white mb-2">Find a verified home</h3>
              <p className="text-gray-400 text-sm mb-5">Browse listings from ID-verified landlords across Lagos and beyond.</p>
              <Link href="/listings" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm">
                Browse properties <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
              <h3 className="text-xl font-extrabold text-white mb-2">List your property</h3>
              <p className="text-gray-400 text-sm mb-5">Join 108+ verified landlords reaching serious tenants — free to list, no agent fees.</p>
              <Link href="/landlord/register" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all text-sm">
                Become a verified landlord <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

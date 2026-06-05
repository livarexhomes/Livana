import { Link } from 'wouter'
import { ShieldCheck, MessageCircle, Sparkles, ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'

const benefits = [
  { icon: ShieldCheck, title: 'Free Property Listings', description: 'Add your properties to LIVAREX with no listing fees and no subscription charges.' },
  { icon: MessageCircle, title: 'Verified Landlord Badge', description: 'Show renters that you are a trusted landlord with full identity verification.' },
  { icon: ClipboardList, title: 'Direct Tenant Enquiries', description: 'Receive leads straight from renters without agents or additional middlemen.' },
  { icon: Sparkles, title: 'Dashboard Management', description: 'Manage listings, view enquiries, and track performance from one place.' },
  { icon: CheckCircle2, title: 'WhatsApp Integration', description: 'Landlords connect directly with tenants on WhatsApp for faster responses.' },
]

const steps = [
  { title: 'Submit NIN', description: 'Provide your national identity number so we can begin verification.' },
  { title: 'Upload Government ID', description: 'Share a valid ID document to confirm your identity.' },
  { title: 'Verification Review', description: 'Our team reviews your submission and verifies your landlord profile.' },
  { title: 'Approved Badge', description: 'Once approved, you receive the verified landlord badge on your profile.' },
  { title: 'Publish Listings', description: 'Start publishing properties and connect with serious tenants.' },
]

export default function ForLandlordsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />
      <main className="flex-1 pt-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <section className="grid lg:grid-cols-[1fr_480px] gap-16 items-center py-20">
            <div>
              <p className="text-blue-600 uppercase tracking-[0.24em] font-bold text-sm mb-4">For Landlords</p>
              <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-950 tracking-tight leading-tight mb-6">
                Reach serious tenants without paying agent fees
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl leading-relaxed mb-8">
                List your properties for free, earn a verified landlord badge, and close deals faster with direct tenant enquiries through WhatsApp.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/partners" className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  Start listing <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/faq" className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 transition-all">
                  Read FAQs
                </Link>
              </div>
            </div>
            <div className="rounded-[2rem] overflow-hidden bg-gradient-to-br from-blue-900 via-slate-950 to-slate-900 text-white p-10 shadow-2xl">
              <div className="mb-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-3xl bg-white/10 mb-4">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <p className="text-sm uppercase tracking-[0.3em] text-blue-300 font-bold mb-3">Verified landlords</p>
                <p className="text-base leading-relaxed text-slate-200">
                  Join Nigeria’s verified property marketplace and connect with qualified renters directly.
                </p>
              </div>
              <div className="grid gap-4">
                {benefits.map(item => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="rounded-3xl bg-white/5 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-200">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-white font-semibold">{item.title}</h3>
                      </div>
                      <p className="text-sm text-blue-100 leading-relaxed">{item.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="py-20 border-t border-gray-100">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-blue-600 uppercase tracking-[0.24em] font-bold text-sm mb-4">Verification Process</p>
              <h2 className="text-4xl font-extrabold text-gray-950 tracking-tight mb-4">Become a verified landlord in 5 simple steps</h2>
              <p className="text-gray-600 leading-relaxed">Our verification path is clear, secure, and built to make tenants trust your listings immediately.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-gray-200 p-8 hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-center w-12 h-12 rounded-3xl bg-blue-600 text-white font-bold mb-5">{index + 1}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

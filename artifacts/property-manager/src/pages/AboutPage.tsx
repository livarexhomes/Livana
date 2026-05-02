import { Link } from 'wouter'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'

const values = [
  {
    title: 'Transparency',
    description: 'Every listing shows real-time availability so you always know what\'s actually open — no stale listings, no wasted trips.',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  },
  {
    title: 'Trust',
    description: 'Landlords go through an approval process before listing. Verified badges signal landlords who have been reviewed and confirmed.',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    title: 'Direct Contact',
    description: 'No middlemen. Every listing has a direct WhatsApp link to the landlord so you can ask questions and arrange viewings instantly.',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  },
  {
    title: 'Simplicity',
    description: 'Search, filter, and find — no account required to browse. Renters can contact landlords in one tap.',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
]

const steps = [
  { title: 'Landlord registers', description: 'A landlord creates an account and submits their profile for review.' },
  { title: 'Admin approves', description: 'Our team reviews the application and approves legitimate landlords.' },
  { title: 'Listings go live', description: 'Approved landlords add properties with photos, details, and availability.' },
  { title: 'Renters connect', description: 'Renters browse, filter, and contact landlords directly via WhatsApp.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient pt-24">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">About Livana</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
              Connecting renters with landlords they can trust
            </h1>
            <p className="text-lg text-blue-100/70 leading-relaxed max-w-xl">
              Livana is a platform built to make finding a home in Nigeria straightforward — real listings, real availability, real people.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Mission */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <div className="grid sm:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Our Mission</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-5 tracking-tight">Built to cut through the noise</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Finding a rental shouldn't mean sifting through outdated listings, chasing agents, or paying unnecessary fees. We built Livana to solve that.
            </p>
            <p className="text-gray-500 leading-relaxed mb-4">
              Every property on our platform comes from a landlord who has been reviewed and approved. Every listing shows live availability. Every enquiry goes directly to the property owner.
            </p>
            <p className="text-gray-900 font-semibold">
              No agents. No hidden fees. No guesswork.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Verified landlords', value: '100%' },
              { label: 'Direct contact', value: 'Always' },
              { label: 'Agent fees', value: '₦0' },
              { label: 'Real-time availability', value: 'Live' },
            ].map(stat => (
              <div key={stat.label} className="bg-blue-50 rounded-2xl p-6 text-center border border-blue-100 hover:border-blue-200 hover:bg-blue-100/50 transition-all">
                <p className="text-2xl font-extrabold text-blue-600">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Core Values</p>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">What we stand for</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map(v => (
              <div key={v.title} className="bg-white rounded-2xl border border-gray-100 p-7 space-y-4 hover:shadow-lg hover:border-blue-100 transition-all group">
                <div className="w-11 h-11 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-all">
                  {v.icon}
                </div>
                <h3 className="font-bold text-gray-900">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">The Process</p>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">How listings get on the platform</h2>
          <p className="text-gray-500 mt-3 max-w-md mx-auto">Every property goes through a simple but deliberate verification process.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-5 left-full w-full h-px bg-gradient-to-r from-blue-200 to-transparent z-0" style={{ width: 'calc(100% - 2rem)' }} />
              )}
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center mb-4 shadow-lg shadow-blue-600/25">
                  {i + 1}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl hero-gradient grid-pattern p-10 md:p-16 text-center">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">Ready to find your next home?</h2>
              <p className="text-blue-100/70 mb-10 max-w-md mx-auto text-base">Browse verified listings and connect directly with landlords.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/listings" className="px-7 py-3.5 bg-white text-blue-700 font-bold rounded-2xl hover:bg-blue-50 transition-all text-sm shadow-xl">
                  Browse Listings
                </Link>
                <Link href="/contact" className="px-7 py-3.5 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all border border-white/15 text-sm">
                  Get in Touch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

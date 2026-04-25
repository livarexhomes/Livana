import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About — Property Manager',
  description: 'Learn how Property Manager connects renters with verified landlords for a transparent, hassle-free experience.',
}

const values = [
  {
    title: 'Transparency',
    description: 'Every listing shows real-time availability so you always know what\'s actually open — no stale listings, no wasted trips.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    title: 'Trust',
    description: 'Landlords go through an approval process before listing. Verified badges signal landlords who have been reviewed and confirmed.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Direct contact',
    description: 'No middlemen. Every listing has a direct WhatsApp link to the landlord so you can ask questions and arrange viewings instantly.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    title: 'Simplicity',
    description: 'Search, filter, and find — no account required to browse. Renters can contact landlords in one tap.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
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
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
              Connecting renters with landlords they can trust
            </h1>
            <p className="text-lg text-indigo-200 leading-relaxed">
              Property Manager is a platform built to make finding a home straightforward — real listings, real availability, real people.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our mission</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Finding a rental shouldn&apos;t mean sifting through outdated listings, chasing agents, or paying unnecessary fees. We built Property Manager to cut through the noise.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Every property on our platform comes from a landlord who has been reviewed and approved. Every listing shows live availability. Every inquiry goes directly to the person who owns the property.
            </p>
            <p className="text-gray-600 leading-relaxed">
              No agents. No hidden fees. No guesswork.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Verified landlords', value: '100%' },
              { label: 'Direct contact', value: 'Always' },
              { label: 'Agent fees', value: '$0' },
              { label: 'Real-time availability', value: 'Live' },
            ].map((stat) => (
              <div key={stat.label} className="bg-indigo-50 rounded-2xl p-5 text-center">
                <p className="text-2xl font-bold text-indigo-700">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">What we stand for</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  {v.icon}
                </div>
                <h3 className="font-semibold text-gray-900">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works for landlords */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900">How listings get on the platform</h2>
          <p className="text-sm text-gray-500 mt-2">Every property goes through a simple but deliberate process</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="hidden lg:block flex-1 h-px bg-gray-200" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to find your next home?</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Browse verified listings and connect directly with landlords — no account needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/listings"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">
              Browse listings
            </Link>
            <Link href="/contact"
              className="px-6 py-3 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-colors">
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

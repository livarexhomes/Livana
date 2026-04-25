import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact — Property Manager',
  description: 'Get in touch with the Property Manager team. We\'re here to help renters and landlords.',
}

const contactOptions = [
  {
    title: 'For renters',
    description: 'Having trouble finding a property or contacting a landlord?',
    action: 'Browse listings',
    href: '/listings',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    title: 'For landlords',
    description: 'Want to list your property or need help with your account?',
    action: 'Landlord portal',
    href: '/landlord/login',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

const faqs = [
  {
    q: 'How do I contact a landlord?',
    a: 'Every listing has a "Contact on WhatsApp" button that opens a direct chat with the landlord — no account needed.',
  },
  {
    q: 'Are all landlords verified?',
    a: 'Yes. Every landlord goes through an approval process before their listings appear on the platform. Landlords with a verified badge have been additionally reviewed.',
  },
  {
    q: 'How do I list my property?',
    a: 'Register as a landlord, wait for approval (usually within 24 hours), then add your listings from your dashboard.',
  },
  {
    q: 'Is there a fee to use the platform?',
    a: 'No. Browsing listings is completely free for renters. Listing properties is free for landlords.',
  },
  {
    q: 'What does the availability status mean?',
    a: '"Available" means the property is open for enquiries. "Taken" means it\'s no longer available. "Coming Soon" means it will be available shortly. "Under Negotiation" means the landlord is in discussions with a prospective tenant.',
  },
  {
    q: 'My landlord account was rejected — what do I do?',
    a: 'Use the contact form below to reach out and we\'ll review your application.',
  },
]

export default function ContactPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Get in touch</h1>
            <p className="text-gray-500 leading-relaxed">
              Have a question or need help? We&apos;re here for both renters and landlords.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left: form + quick links */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick options */}
            <div className="grid sm:grid-cols-2 gap-4">
              {contactOptions.map((opt) => (
                <div key={opt.title} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    {opt.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{opt.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                  <Link href={opt.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                    {opt.action} →
                  </Link>
                </div>
              ))}
            </div>

            {/* Contact form */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Send us a message</h2>
              <form className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                    <input type="text" name="name" required placeholder="Your name"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" name="email" required placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">I am a…</label>
                  <select name="role"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="renter">Renter</option>
                    <option value="landlord">Landlord</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                  <input type="text" name="subject" required placeholder="How can we help?"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea name="message" required rows={5} placeholder="Tell us more…"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
                </div>

                <button type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Send message
                </button>

                <p className="text-xs text-center text-gray-400">
                  We typically respond within 1–2 business days.
                </p>
              </form>
            </div>
          </div>

          {/* Right: FAQ */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Frequently asked questions</h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <details key={faq.q} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer text-sm font-medium text-gray-900 list-none">
                    {faq.q}
                    <svg className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

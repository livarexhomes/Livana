import { useState } from 'react'
import { ArrowRight, ChevronDown, Mail, Phone, MessageCircle } from 'lucide-react'
import { Link } from 'wouter'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'

const faqs = [
  { q: 'How do I contact a landlord?', a: 'Every listing displays a direct WhatsApp contact button that opens a chat with the landlord. No agent, no middleman.' },
  { q: 'Are all landlords verified?', a: 'Yes. Every landlord completes our verification process before their listing goes live. Only verified landlords receive the badge.' },
  { q: 'How do I list my property?', a: 'Register as a landlord, submit your details for review, and once approved you can publish properties from your dashboard.' },
  { q: 'Is there a fee to use LIVAREX?', a: 'No. Browsing is free for renters and listing is free for landlords. We do not charge agent commissions or hidden fees.' },
  { q: 'My landlord account was rejected — what now?', a: 'Reach out to support via contact@livarex.com.ng or WhatsApp. We will review your application and guide you through the next steps.' },
  { q: 'Can I list commercial properties?', a: 'Yes. LIVAREX supports residential, commercial, lease, and off-plan listings.' },
]

export default function FaqPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />
      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-16 items-center mb-16">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest mb-4">
                FAQ
              </span>
              <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-950 tracking-tight leading-tight mb-6">
                Frequently Asked Questions
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
                Get quick answers about contacting landlords, listing your property, verification, agent fees, and how LIVAREX protects every user.
              </p>
            </div>
            <div className="rounded-[2rem] bg-blue-950 text-white p-8 shadow-2xl">
              <p className="text-sm uppercase tracking-[0.24em] text-blue-200 mb-4">Still need help?</p>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold">Email</p>
                  <a href="mailto:support@livarex.com.ng" className="text-blue-100 hover:text-white">support@livarex.com.ng</a>
                </div>
                <div>
                  <p className="font-semibold">WhatsApp</p>
                  <a href="https://wa.me/2347060528437" target="_blank" rel="noreferrer" className="text-blue-100 hover:text-white">+234 706 052 8437</a>
                </div>
                <div>
                  <p className="font-semibold">Office</p>
                  <p className="text-blue-100">Joju, Sango Ota, Ogun State</p>
                </div>
              </div>
              <div className="mt-8">
                <Link href="/contact" className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-blue-900 font-semibold hover:bg-blue-100 transition-all">
                  Contact support <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {faqs.map((faq, index) => (
              <div key={faq.q} className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left text-gray-900 text-base font-semibold"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 pt-0 text-gray-600 leading-relaxed border-t border-gray-200">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

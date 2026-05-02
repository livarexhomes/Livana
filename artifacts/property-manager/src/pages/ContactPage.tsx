import { useState } from 'react'
import { Link } from 'wouter'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import { createClient, isSupabaseConfigured } from '../lib/supabase'

const faqs = [
  { q: 'How do I contact a landlord?', a: 'Every listing has a "Contact on WhatsApp" button that opens a direct chat with the landlord — no account needed.' },
  { q: 'Are all landlords verified?', a: 'Yes. Every landlord goes through an approval process before their listings appear on the platform.' },
  { q: 'How do I list my property?', a: 'Register as a landlord, wait for approval (usually within 24 hours), then add your listings from your dashboard.' },
  { q: 'Is there a fee to use the platform?', a: 'No. Browsing listings is completely free for renters. Listing properties is free for landlords.' },
  { q: 'My landlord account was rejected — what do I do?', a: 'Use the contact form to reach out and we\'ll review your application.' },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', role: 'renter', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) { setError('Platform is not configured yet.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('contact_messages').insert(form)
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-white placeholder-gray-400"

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient pt-24">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="max-w-xl">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">Support</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">Get in touch</h1>
            <p className="text-blue-100/70 text-lg leading-relaxed">Have a question or need help? We're here for both renters and landlords.</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 flex-1">
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6 space-y-3 hover:border-blue-200 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">For Renters</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Having trouble finding a property?</p>
                </div>
                <Link href="/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Browse listings →
                </Link>
              </div>
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 space-y-3 hover:border-blue-100 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-lg shadow-black/15">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">For Landlords</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Want to list your property?</p>
                </div>
                <Link href="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
                  Landlord portal →
                </Link>
              </div>
            </div>

            {/* Form */}
            {success ? (
              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/25">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">Message sent!</p>
                  <p className="text-sm text-gray-500 mt-1.5">We typically respond within 1–2 business days.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 sm:p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Send us a message</h2>
                {error && <p className="mb-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
                      <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your name" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                      <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@example.com" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">I am a…</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      className={inputClass}>
                      <option value="renter">Renter</option>
                      <option value="landlord">Landlord</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                    <input type="text" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="How can we help?" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
                    <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Tell us more…" className={`${inputClass} resize-none`} />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40">
                    {loading ? 'Sending…' : 'Send Message'}
                  </button>
                  <p className="text-xs text-center text-gray-400">We typically respond within 1–2 business days.</p>
                </form>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div
                  key={faq.q}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-100 transition-all shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-gray-900 text-left"
                  >
                    {faq.q}
                    <svg
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Contact info card */}
            <div className="bg-gray-950 rounded-2xl p-6 mt-6 space-y-4">
              <h3 className="text-white font-bold text-sm">Direct Contact</h3>
              {[
                { icon: '📍', text: 'Lagos, Nigeria' },
                { icon: '✉️', text: 'support@livana.ng' },
                { icon: '📞', text: '+234 800 000 0000' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-3 text-gray-400 text-sm">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

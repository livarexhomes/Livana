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
  { q: 'My landlord account was rejected — what do I do?', a: 'Use the contact form below to reach out and we\'ll review your application.' },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', role: 'renter', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) { setError('Platform is not configured yet.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await (supabase.from('contact_messages').insert(form) as unknown as Promise<{ error: Error | null }>)
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Get in touch</h1>
            <p className="text-gray-500 leading-relaxed">Have a question or need help? We're here for both renters and landlords.</p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex-1">
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#6b9e6e]/10 text-[#4a7f4d] flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">For renters</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Having trouble finding a property?</p>
                </div>
                <Link href="/listings" className="inline-flex items-center gap-1 text-sm font-medium text-[#6b9e6e] hover:text-[#4a7f4d] transition-colors">Browse listings →</Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#6b9e6e]/10 text-[#4a7f4d] flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">For landlords</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Want to list your property?</p>
                </div>
                <Link href="/login" className="inline-flex items-center gap-1 text-sm font-medium text-[#6b9e6e] hover:text-[#4a7f4d] transition-colors">Landlord portal →</Link>
              </div>
            </div>

            {success ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center gap-4 min-h-[200px] text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Message sent!</p>
                  <p className="text-sm text-gray-500 mt-1">We typically respond within 1–2 business days.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
                <h2 className="text-base font-semibold text-gray-900 mb-5">Send us a message</h2>
                {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                      <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your name" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@example.com" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">I am a…</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]">
                      <option value="renter">Renter</option>
                      <option value="landlord">Landlord</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                    <input type="text" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="How can we help?" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                    <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Tell us more…" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e] resize-none" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 bg-[#6b9e6e] hover:bg-[#4a7f4d] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                    {loading ? 'Sending…' : 'Send message'}
                  </button>
                  <p className="text-xs text-center text-gray-400">We typically respond within 1–2 business days.</p>
                </form>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Frequently asked questions</h2>
            <div className="space-y-3">
              {faqs.map(faq => (
                <details key={faq.q} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer text-sm font-medium text-gray-900 list-none">
                    {faq.q}
                    <svg className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

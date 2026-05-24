import { useState } from 'react'
import { Link } from 'wouter'
import { Mail, Phone, MapPin, MessageCircle, ArrowRight, CheckCircle, Clock, ChevronDown, Instagram, Twitter, Facebook, Linkedin } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import { createClient, isSupabaseConfigured } from '../lib/supabase'

const faqs = [
  { q: 'How do I contact a landlord?', a: 'Every listing has a "Contact on WhatsApp" button that opens a direct chat with the landlord — no account needed. You can ask questions and arrange viewings instantly.' },
  { q: 'Are all landlords verified?', a: 'Yes. Every landlord goes through our review and approval process before any of their listings go live on the platform. Verified badges are only awarded to landlords we\'ve confirmed.' },
  { q: 'How do I list my property?', a: 'Register as a landlord, submit your details for review, and once approved (usually within 24 hours), you can add unlimited listings from your dashboard.' },
  { q: 'Is there a fee to use LIVAREX?', a: 'No — browsing listings is completely free for renters. Listing properties is also free for landlords. We will never charge agent fees.' },
  { q: 'My landlord account was rejected — what now?', a: 'Use the contact form below to reach out and include your registered email. Our team will review your application and respond within 1–2 business days.' },
  { q: 'Can I list commercial properties?', a: 'Yes. LIVAREX supports residential, commercial, and off-plan property listings. Select the appropriate type when creating your listing from the landlord dashboard.' },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', role: 'renter', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient()
        const { error: err } = await supabase.from('contact_messages').insert(form)
        if (err) throw new Error(err.message)
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try emailing us directly.')
    }
    setLoading(false)
  }

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white placeholder-gray-400 text-gray-900"

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* ── HERO — dark ── */}
      <section className="bg-gray-950 pt-28 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/15 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Contact Us
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.06] tracking-tight mb-5 max-w-2xl">
            We'd love to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">hear from you.</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
            Whether you're a renter searching for a home, a landlord ready to list, or a developer with a project — we're here.
          </p>
        </div>
      </section>

      {/* ── CONTACT CARDS — white ── */}
      <section className="bg-white py-16 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Email */}
            <a
              href="mailto:support@livarex.ng"
              className="group bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg rounded-3xl p-6 flex flex-col gap-4 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/25 group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-0.5">Email Us</p>
                <p className="text-blue-600 text-sm font-semibold">support@livarex.ng</p>
                <p className="text-gray-400 text-xs mt-2">We reply within 1–2 business days</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-700 transition-colors mt-auto">
                Send email <ArrowRight className="w-3 h-3" />
              </span>
            </a>

            {/* Phone */}
            <a
              href="tel:+2348001234567"
              className="group bg-white border border-gray-100 hover:border-emerald-200 hover:shadow-lg rounded-3xl p-6 flex flex-col gap-4 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/25 group-hover:scale-105 transition-transform">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-0.5">Call Us</p>
                <p className="text-emerald-600 text-sm font-semibold">+234 800 123 4567</p>
                <p className="text-gray-400 text-xs mt-2">Mon–Fri, 9am–6pm WAT</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 group-hover:text-emerald-700 transition-colors mt-auto">
                Call now <ArrowRight className="w-3 h-3" />
              </span>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/2348001234567?text=Hi%20LIVAREX%2C%20I%20need%20some%20help!"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white border border-gray-100 hover:border-green-200 hover:shadow-lg rounded-3xl p-6 flex flex-col gap-4 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-lg shadow-green-500/25 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-0.5">WhatsApp</p>
                <p className="text-[#25D366] text-sm font-semibold">+234 800 123 4567</p>
                <p className="text-gray-400 text-xs mt-2">Fastest response — usually under an hour</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#25D366] group-hover:text-green-700 transition-colors mt-auto">
                Open WhatsApp <ArrowRight className="w-3 h-3" />
              </span>
            </a>

            {/* Location */}
            <a
              href="https://maps.google.com/?q=Victoria+Island+Lagos+Nigeria"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white border border-gray-100 hover:border-rose-200 hover:shadow-lg rounded-3xl p-6 flex flex-col gap-4 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/25 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-0.5">Visit Us</p>
                <p className="text-rose-600 text-sm font-semibold">Victoria Island, Lagos</p>
                <p className="text-gray-400 text-xs mt-2">By appointment only</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 group-hover:text-rose-700 transition-colors mt-auto">
                Get directions <ArrowRight className="w-3 h-3" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FORM + FAQ ── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-[1fr_420px] gap-10">

            {/* Left: Form */}
            <div>
              <div className="mb-8">
                <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-3">Send a Message</p>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">We read every message.</h2>
                <p className="text-gray-500 mt-2">Fill in the form and we'll get back to you within 1–2 business days.</p>
              </div>

              {success ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-14 flex flex-col items-center justify-center gap-5 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/30">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-900 text-xl">Message sent!</p>
                    <p className="text-gray-400 mt-2 text-sm max-w-xs">Thank you for reaching out. We'll reply to <span className="text-gray-700 font-semibold">{form.email}</span> within 1–2 business days.</p>
                  </div>
                  <button
                    onClick={() => { setSuccess(false); setForm({ name: '', email: '', role: 'renter', subject: '', message: '' }) }}
                    className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-semibold rounded-xl transition-all"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7 sm:p-9">
                  {error && (
                    <div className="mb-6 px-4 py-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                        <input
                          type="text" required value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Adebayo Okafor" className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address *</label>
                        <input
                          type="email" required value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="you@example.com" className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">I am a…</label>
                      <select
                        value={form.role}
                        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="renter">Renter looking for a property</option>
                        <option value="landlord">Landlord wanting to list</option>
                        <option value="developer">Property developer</option>
                        <option value="other">Other / General enquiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Subject *</label>
                      <input
                        type="text" required value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        placeholder="How can we help?" className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Message *</label>
                      <textarea
                        required rows={5} value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        placeholder="Tell us as much as you can — we want to give you the best possible answer…"
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</>
                      ) : (
                        <><Mail className="w-4 h-4" />Send Message</>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      We typically respond within 1–2 business days
                    </div>
                  </form>
                </div>
              )}

              {/* Social links */}
              <div className="mt-8 flex items-center gap-4">
                <p className="text-sm text-gray-400 font-medium">Also find us on:</p>
                {[
                  { Icon: Instagram, href: 'https://instagram.com/livarex.ng', label: 'Instagram', color: 'hover:text-pink-600' },
                  { Icon: Twitter,   href: 'https://twitter.com/livarex_ng',   label: 'Twitter / X', color: 'hover:text-sky-500' },
                  { Icon: Facebook,  href: 'https://facebook.com/livarex.ng',  label: 'Facebook', color: 'hover:text-blue-600' },
                  { Icon: Linkedin,  href: 'https://linkedin.com/company/livarex-ng', label: 'LinkedIn', color: 'hover:text-blue-700' },
                ].map(({ Icon, href, label, color }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={`w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 ${color} hover:border-gray-300 hover:shadow-sm transition-all`}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Right: FAQ + Quick info */}
            <div className="space-y-5">
              <div>
                <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-3">FAQ</p>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-5">Common questions</h2>
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
                        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq === i && (
                        <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dark info card */}
              <div className="bg-gray-950 rounded-3xl p-7 space-y-5">
                <h3 className="text-white font-bold text-base">Direct Contact</h3>
                {[
                  { Icon: Mail,    text: 'support@livarex.ng',  href: 'mailto:support@livarex.ng', label: 'Email' },
                  { Icon: Phone,   text: '+234 800 123 4567',  href: 'tel:+2348001234567', label: 'Phone' },
                  { Icon: MessageCircle, text: 'WhatsApp us now',  href: 'https://wa.me/2348001234567', label: 'WhatsApp' },
                  { Icon: MapPin,  text: 'Victoria Island, Lagos', href: 'https://maps.google.com/?q=Victoria+Island+Lagos', label: 'Location' },
                ].map(item => {
                  const Icon = item.Icon
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-400 text-sm hover:text-white transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/8 group-hover:bg-blue-600 flex items-center justify-center transition-all shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span>{item.text}</span>
                    </a>
                  )
                })}

                <div className="pt-2 border-t border-white/8">
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Mon–Fri · 9am–6pm West Africa Time
                  </p>
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-blue-600 rounded-3xl p-7 text-white">
                <h3 className="font-bold text-base mb-4">Quick Links</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Browse all listings', href: '/listings' },
                    { label: 'Register as a landlord', href: '/register' },
                    { label: 'About LIVAREX', href: '/about' },
                    { label: 'My account', href: '/user' },
                  ].map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between text-sm text-blue-100 hover:text-white py-1.5 transition-colors group"
                    >
                      {link.label}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAP STRIP — dark ── */}
      <section className="bg-gray-950 py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-2">Our Location</p>
              <h2 className="text-2xl font-extrabold text-white">Victoria Island, Lagos</h2>
              <p className="text-gray-400 text-sm mt-1">By appointment only — please reach out before visiting.</p>
            </div>
            <a
              href="https://maps.google.com/?q=Victoria+Island+Lagos+Nigeria"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/8 hover:bg-white/14 text-white text-sm font-semibold rounded-xl transition-all border border-white/10"
            >
              <MapPin className="w-4 h-4" />
              Open in Google Maps
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

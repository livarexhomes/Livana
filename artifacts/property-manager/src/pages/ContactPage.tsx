import { useState } from 'react'
import { Link } from 'wouter'
import { Mail, Phone, MapPin, MessageCircle, ArrowRight, CheckCircle, Clock, ChevronDown, Instagram, Twitter, Facebook, Linkedin, Send } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import { createClient, isSupabaseConfigured } from '../lib/supabase'

const faqs = [
  { q: 'How do I contact a landlord?', a: 'Every listing has a "Contact on WhatsApp" button that opens a direct chat with the landlord — no account needed.' },
  { q: 'Are all landlords verified?', a: 'Yes. Every landlord goes through our review process before listings go live. Verified badges are only awarded to landlords we\'ve confirmed.' },
  { q: 'How do I list my property?', a: 'Register as a landlord, submit your details for review, and once approved (usually within 24 hours), you can add listings from your dashboard.' },
  { q: 'Is there a fee to use LIVAREX?', a: 'No — browsing is completely free for renters. Listing is also free for landlords. We will never charge agent fees.' },
  { q: 'My landlord account was rejected — what now?', a: 'Use the contact form to reach out with your registered email. Our team will review and respond within 1–2 business days.' },
  { q: 'Can I list commercial properties?', a: 'Yes. LIVAREX supports residential, commercial, and off-plan listings. Select the appropriate type when creating your listing.' },
]

const channels = [
  { icon: Mail,          label: 'Email',     value: 'support@livarex.ng',   href: 'mailto:support@livarex.ng',  note: 'Reply within 1–2 business days', color: 'bg-blue-600',    shadow: 'shadow-blue-500/20',   ring: 'hover:ring-blue-200'   },
  { icon: Phone,         label: 'Phone',     value: '+234 800 123 4567',    href: 'tel:+2348001234567',         note: 'Mon–Fri, 9am–6pm WAT',           color: 'bg-emerald-600', shadow: 'shadow-emerald-500/20',ring: 'hover:ring-emerald-200'},
  { icon: MessageCircle, label: 'WhatsApp',  value: 'Chat with us',         href: 'https://wa.me/2348001234567?text=Hi%20LIVAREX%2C%20I%20need%20help!', note: 'Usually under an hour', color: 'bg-[#25D366]', shadow: 'shadow-green-500/20', ring: 'hover:ring-green-200' },
  { icon: MapPin,        label: 'Office',    value: 'Victoria Island, Lagos', href: 'https://maps.google.com/?q=Victoria+Island+Lagos+Nigeria', note: 'By appointment only', color: 'bg-rose-600', shadow: 'shadow-rose-500/20', ring: 'hover:ring-rose-200' },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', role: 'renter', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient()
        const { error: err } = await supabase.from('contact_messages').insert(form)
        if (err) throw new Error(err.message)
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please email us directly.')
    }
    setLoading(false)
  }

  const field = 'w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50 placeholder-gray-400 text-gray-900'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* ── HERO ── */}
      <section className="pt-24 pb-0 bg-white" style={{ marginTop: '80px' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-end pb-16 border-b border-gray-100">
            {/* Left */}
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Get in touch
              </span>
              <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-[1.05] tracking-tight mb-5">
                We'd love to<br />
                <span className="text-blue-600">hear from you.</span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed max-w-md">
                Whether you're a renter, landlord, or developer — our team is ready to help.
              </p>
            </div>
            {/* Right — channel cards */}
            <div className="grid grid-cols-2 gap-3">
              {channels.map(ch => {
                const Icon = ch.icon
                return (
                  <a key={ch.label} href={ch.href}
                    target={ch.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={`group bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3 transition-all hover:shadow-lg ring-2 ring-transparent ${ch.ring}`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${ch.color} shadow-lg ${ch.shadow} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4.5 h-4.5 text-white w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{ch.label}</p>
                      <p className="text-sm font-bold text-gray-900 leading-snug">{ch.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{ch.note}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-blue-600 transition-colors mt-auto">
                      Contact <ArrowRight className="w-3 h-3" />
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FORM + FAQ ── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-[1fr_400px] gap-10">

            {/* Form */}
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Send us a message</h2>
                <p className="text-gray-500 mt-2 text-sm">We read every message and reply within 1–2 business days.</p>
              </div>

              {success ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-14 flex flex-col items-center text-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/25">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-900 text-xl">Message sent!</p>
                    <p className="text-gray-400 mt-2 text-sm max-w-xs">
                      We'll reply to <span className="text-gray-700 font-semibold">{form.email}</span> within 1–2 business days.
                    </p>
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
                    <div className="mb-5 px-4 py-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Full Name *</label>
                        <input type="text" required value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Adebayo Okafor" className={field} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Email Address *</label>
                        <input type="email" required value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="you@example.com" className={field} />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">I am a…</label>
                        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={field}>
                          <option value="renter">Renter looking for a property</option>
                          <option value="landlord">Landlord wanting to list</option>
                          <option value="developer">Property developer</option>
                          <option value="other">Other / General enquiry</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Subject *</label>
                        <input type="text" required value={form.subject}
                          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                          placeholder="How can we help?" className={field} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Message *</label>
                      <textarea required rows={5} value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        placeholder="Tell us as much as you can — we want to give you the best possible answer…"
                        className={`${field} resize-none`} />
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <button type="submit" disabled={loading}
                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2">
                        {loading
                          ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</>
                          : <><Send className="w-4 h-4" />Send Message</>
                        }
                      </button>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        1–2 business days
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Socials */}
              <div className="mt-6 flex items-center gap-3">
                <p className="text-xs text-gray-400 font-medium">Follow us:</p>
                {[
                  { Icon: Instagram, href: 'https://instagram.com/livarex.ng',          label: 'Instagram' },
                  { Icon: Twitter,   href: 'https://twitter.com/livarex_ng',             label: 'Twitter'   },
                  { Icon: Facebook,  href: 'https://facebook.com/livarex.ng',            label: 'Facebook'  },
                  { Icon: Linkedin,  href: 'https://linkedin.com/company/livarex-ng',    label: 'LinkedIn'  },
                ].map(({ Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* FAQ + Quick links */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight mb-4">Common questions</h2>
                <div className="space-y-2">
                  {faqs.map((faq, i) => (
                    <div key={faq.q} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-100 transition-all shadow-sm">
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

              {/* Quick links */}
              <div className="bg-gray-900 rounded-2xl p-6 text-white">
                <h3 className="font-bold text-sm mb-4 text-white/70 uppercase tracking-wider">Quick Links</h3>
                <div className="space-y-1">
                  {[
                    { label: 'Browse all listings',     href: '/listings' },
                    { label: 'Register as a landlord',  href: '/partners' },
                    { label: 'About LIVAREX',           href: '/about'    },
                    { label: 'My account',              href: '/user'     },
                  ].map(link => (
                    <Link key={link.href} href={link.href}
                      className="flex items-center justify-between text-sm text-white/60 hover:text-white py-2 transition-colors group">
                      {link.label}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Office hours */}
              <div className="bg-blue-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-200" />
                  <h3 className="font-bold text-sm">Office Hours</h3>
                </div>
                <div className="space-y-2 text-sm text-blue-100">
                  <div className="flex justify-between"><span>Monday – Friday</span><span className="font-semibold text-white">9am – 6pm</span></div>
                  <div className="flex justify-between"><span>Saturday</span><span className="font-semibold text-white">10am – 2pm</span></div>
                  <div className="flex justify-between"><span>Sunday</span><span className="text-blue-300">Closed</span></div>
                </div>
                <p className="text-xs text-blue-200 mt-4">All times in West Africa Time (WAT)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

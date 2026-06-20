import { useState } from 'react'
import { Link } from '@/lib/navigation'
import { Mail, Phone, MapPin, MessageCircle, Globe, ArrowRight, CheckCircle, Clock, ChevronDown, Instagram, Twitter, Send } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'

const faqs = [
  { q: 'How do I contact a landlord?', a: 'Sign in to your tenant account, then use the "Request Inspection" or "WhatsApp" button on any listing. All messages go through Livarex — our team coordinates with the landlord and gets back to you.' },
  { q: 'Are all landlords verified?', a: 'Yes. Every landlord goes through our review process before listings go live. Verified badges are only awarded to landlords we\'ve confirmed.' },
  { q: 'How do I list my property?', a: 'Register as a landlord, submit your details for review, and once approved (usually within 24 hours), you can add listings from your dashboard.' },
  { q: 'Is there a fee to use Livarex?', a: 'No — browsing is completely free for renters. Listing is also free for landlords. We will never charge agent fees.' },
  { q: 'My landlord account was rejected — what now?', a: 'Use the contact form to reach out with your registered email. Our team will review and respond within 1–2 business days.' },
  { q: 'Can I list commercial properties?', a: 'Yes. Livarex supports residential, commercial, and off-plan listings. Select the appropriate type when creating your listing.' },
]

const channels = [
  { icon: Mail,          label: 'Email',     value: 'livarexhomes@gmail.com',      href: 'mailto:livarexhomes@gmail.com',   note: 'Reply within 1–2 business days',   accent: 'bg-blue-600',    glow: 'shadow-blue-500/25'    },
  { icon: MessageCircle, label: 'WhatsApp',  value: '+234 706 137 0742',            href: 'https://wa.me/2347061370742',     note: 'Livarex support on WhatsApp',      accent: 'bg-[#25D366]',   glow: 'shadow-green-500/25'   },
  { icon: Phone,         label: 'Phone',     value: '+234 706 137 0742',            href: 'tel:+2347061370742',              note: '24/7 available',                   accent: 'bg-emerald-600', glow: 'shadow-emerald-500/25' },
  { icon: MapPin,        label: 'Office',    value: 'Joju, Sango Ota, Ogun State', href: 'https://maps.google.com/?q=Joju+Sango+Ota+Ogun+State+Nigeria', note: 'Visit us in Ogun State', accent: 'bg-rose-600', glow: 'shadow-rose-500/25' },
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

  const field = 'w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white placeholder-gray-400 text-gray-900'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* ── HERO ── */}
      <section className="relative bg-gray-950 pt-32 pb-28 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '36px 36px' }} />
        <div className="absolute -top-40 right-0 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] bg-emerald-600/6 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">

            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-bold uppercase tracking-widest mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Get in Touch
              </div>
              <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
                Let's talk about<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">your property goals.</span>
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed mb-10">
                Whether you're searching for a home, looking to list your property, or just have questions — we're ready to help.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#contact-form" className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-xl shadow-blue-600/25">
                  Send a Message <ArrowRight className="w-4 h-4" />
                </a>
                <a href="tel:+2347061370742" className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/6 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-all border border-white/10">
                  <Phone className="w-4 h-4" /> Call Us
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10 pt-10 border-t border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">24/7 Support</p>
                    <p className="text-xs text-gray-500">Always available</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Clock className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Fast Response</p>
                    <p className="text-xs text-gray-500">Within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — channel cards */}
            <div className="grid grid-cols-2 gap-4">
              {channels.map(ch => {
                const Icon = ch.icon
                return (
                  <a key={ch.label} href={ch.href}
                    target={ch.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="group bg-white/5 border border-white/8 hover:bg-white/8 hover:border-white/15 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`w-12 h-12 rounded-xl ${ch.accent} flex items-center justify-center mb-5 shadow-lg ${ch.glow} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{ch.label}</p>
                    <p className="text-sm font-semibold text-white leading-snug mb-1">{ch.value}</p>
                    <p className="text-xs text-gray-600">{ch.note}</p>
                    <div className="flex items-center gap-1 text-xs font-semibold text-blue-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      Contact <ArrowRight className="w-3 h-3" />
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FORM + FAQ ── */}
      <section id="contact-form" className="bg-[#F8F8F6] py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-[1fr_380px] gap-10">

            {/* Form */}
            <div>
              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Direct message</p>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Send us a message</h2>
                <p className="text-gray-400 mt-2 text-sm">We read every message and reply within 1–2 business days.</p>
              </div>

              {success ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-14 flex flex-col items-center text-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/25">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-900 text-xl">Message sent!</p>
                    <p className="text-gray-400 mt-2 text-sm max-w-xs">We'll reply to <span className="text-gray-700 font-semibold">{form.email}</span> within 1–2 business days.</p>
                  </div>
                  <button onClick={() => { setSuccess(false); setForm({ name: '', email: '', role: 'renter', subject: '', message: '' }) }}
                    className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-semibold rounded-xl transition-all">
                    Send another message
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-10">
                  {error && (
                    <div className="mb-5 px-4 py-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name *</label>
                        <input type="text" required value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Adebayo Okafor" className={field} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address *</label>
                        <input type="email" required value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="you@example.com" className={field} />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">I am a…</label>
                        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={field}>
                          <option value="renter">Renter looking for a property</option>
                          <option value="landlord">Landlord wanting to list</option>
                          <option value="developer">Property developer</option>
                          <option value="other">Other / General enquiry</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subject *</label>
                        <input type="text" required value={form.subject}
                          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                          placeholder="How can we help?" className={field} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message *</label>
                      <textarea required rows={5} value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        placeholder="Tell us as much as you can — we want to give you the best possible answer…"
                        className={`${field} resize-none`} />
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <button type="submit" disabled={loading}
                        className="flex-1 py-4 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20">
                        {loading
                          ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</>
                          : <><Send className="w-4 h-4" />Send Message</>
                        }
                      </button>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                        <Clock className="w-3.5 h-3.5" /> 1–2 business days
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Socials */}
              <div className="mt-6 flex items-center gap-3">
                <p className="text-xs text-gray-400 font-medium">Follow us:</p>
                {[
                  { Icon: Instagram, href: 'https://instagram.com/livarex.ng', label: 'Instagram' },
                  { Icon: Twitter,   href: 'https://twitter.com/livarex_ng',   label: 'X'         },
                ].map(({ Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* FAQ */}
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight mb-4">Common questions</h2>
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
              <div className="bg-gray-950 rounded-2xl p-6 text-white">
                <h3 className="font-bold text-xs mb-4 text-white/50 uppercase tracking-widest">Quick Links</h3>
                <div className="space-y-0.5">
                  {[
                    { label: 'Browse all listings',    href: '/listings' },
                    { label: 'Register as a landlord', href: '/landlord/register' },
                    { label: 'About Livarex',          href: '/about'    },
                    { label: 'My account',             href: '/user'     },
                    { label: 'Terms of Service',       href: '/terms'    },
                    { label: 'Privacy Policy',         href: '/privacy-policy' },
                  ].map(link => (
                    <Link key={link.href} href={link.href}
                      className="flex items-center justify-between text-sm text-white/50 hover:text-white py-2.5 transition-colors group border-b border-white/5 last:border-0">
                      {link.label}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Office hours */}
              <div className="bg-blue-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-blue-200" />
                  <h3 className="font-bold text-sm">Office Hours</h3>
                </div>
                <div className="space-y-2.5 text-sm text-blue-100">
                  {[['Monday – Friday', '24 hrs'], ['Saturday', '24 hrs'], ['Sunday', '24 hrs']].map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center">
                      <span>{day}</span>
                      <span className="font-bold text-white text-xs px-2.5 py-1 bg-white/15 rounded-full">{hours}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-200/70 mt-4">All times in West Africa Time (WAT)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

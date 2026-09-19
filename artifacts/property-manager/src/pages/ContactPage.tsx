import * as React from 'react'
import { Link } from '@/lib/navigation'
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle,
  House,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  ArrowUpRight,
  ChevronDown,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'
import SEO from '@/components/SEO'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import {
  getPlatformSettings,
  getNotificationSettings,
  phoneToWaLink,
  phoneToTelLink,
  type PlatformSettings,
} from '@/lib/platform-settings'

const enquiryCategories = [
  {
    id: 'property',
    title: 'Property Enquiries',
    description: 'Need help finding a property or have a question about a listing?',
    action: 'Get Property Help',
    icon: House,
    role: 'Property enquiry',
    image:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'landlord',
    title: 'Landlord Support',
    description: 'Questions about verification, listings, or managing your property?',
    action: 'Landlord Help',
    icon: Building2,
    role: 'Landlord support',
    image:
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'account',
    title: 'Account Support',
    description: 'Need assistance with your LIVAREX account or platform experience?',
    action: 'Get Support',
    icon: UserCheck,
    role: 'Account support',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'general',
    title: 'General Enquiries',
    description: 'Partnerships, business enquiries, feedback, or anything else.',
    action: 'Contact Us',
    icon: BriefcaseBusiness,
    role: 'General enquiry',
    image:
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=900&q=80',
  },
]

const helpLinks = [
  {
    label: 'How landlord verification works',
    description: 'Learn how LIVAREX reviews landlords and listings.',
    href: '/about',
    icon: ShieldCheck,
  },
  {
    label: 'Listing a property',
    description: 'Start your landlord onboarding journey.',
    href: '/landlord/register',
    icon: Building2,
  },
  {
    label: 'Finding a property',
    description: 'Browse verified homes and apartments.',
    href: '/listings',
    icon: House,
  },
  {
    label: 'Frequently asked questions',
    description: 'Quick answers to common LIVAREX questions.',
    href: '#faq-panel',
    icon: MessageCircle,
  },
]

const faqs = [
  {
    q: 'How do I contact a landlord?',
    a: 'Sign in to your tenant account and use the Request Inspection or WhatsApp option on any listing. LIVAREX helps coordinate the conversation and keeps the process secure.',
  },
  {
    q: 'Are all landlords verified?',
    a: 'Yes. Every landlord goes through LIVAREX review before listings can move forward. Verified badges are only awarded to profiles that have met the required checks.',
  },
  {
    q: 'How do I list my property?',
    a: 'Register as a landlord, submit your property details, and complete the review process from your dashboard. Once approved, your listing can go live.',
  },
  {
    q: 'Can I list commercial properties?',
    a: 'Yes. LIVAREX supports residential, commercial, and off-plan listing categories depending on the property and the information provided.',
  },
]

export default function ContactPage() {
  const [platform, setPlatform] = React.useState<PlatformSettings | null>(null)
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    role: 'Property enquiry',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState('')
  const submitting = React.useRef(false)
  const [sentName, setSentName] = React.useState('')
  const [openFaq, setOpenFaq] = React.useState<number | null>(null)

  React.useEffect(() => {
    let active = true

    getPlatformSettings().then((settings) => {
      if (active) setPlatform(settings)
    }).catch(() => {
      // Keep the existing public contact fallbacks if settings cannot load.
    })

    return () => {
      active = false
    }
  }, [])

  const phone = platform?.phone || '+234 7061370742'
  const email = platform?.email || 'support@livarex.com.ng'
  const address = platform?.address?.trim() || '14 Bourdillon Road, Ikoyi, Lagos'

  const channels = [
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: phone,
      href: phoneToWaLink(phone),
      note: 'Fast questions and property enquiries',
      accent: 'bg-blue-600',
      glow: 'shadow-blue-500/10',
      action: 'Message Us',
      highlight: true,
    },
    {
      icon: Mail,
      label: 'Email',
      value: email,
      href: `mailto:${email}`,
      note: 'General and business enquiries',
      accent: 'bg-blue-600',
      glow: 'shadow-blue-500/25',
      action: 'Send Email',
      highlight: false,
    },
    {
      icon: Phone,
      label: 'Phone',
      value: phone,
      href: phoneToTelLink(phone),
      note: 'Speak with the LIVAREX team',
      accent: 'bg-blue-600',
      glow: 'shadow-blue-500/10',
      action: 'Call Us',
      highlight: false,
    },

  ]

  function chooseCategory(role: string) {
    if (submitting.current) return
    setSuccess(false)
    setError('')
    setForm(current => ({ ...current, role }))
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('contact-form')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    window.requestAnimationFrame(() => document.getElementById('contact-name')?.focus({ preventScroll: true }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting.current) return
    setError('')
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      subject: form.subject.trim() || form.role,
      message: form.message.trim(),
    }
    if (!payload.name || !payload.email || !payload.message) {
      setError('Please enter your name, email address and message.')
      return
    }
    if (!isSupabaseConfigured()) {
      setError('The contact form is temporarily unavailable. Please reach us by email, WhatsApp or phone.')
      return
    }
    submitting.current = true
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: insertError } = await supabase.from('contact_messages').insert(payload)
      if (insertError) throw insertError

      // Receipt depends on the saved message, not the best-effort email notification.
      setSentName(payload.name)
      setSuccess(true)
      setForm({ name: '', email: '', role: 'Property enquiry', subject: '', message: '' })
      void (async () => {
        try {
          const notif = await getNotificationSettings()
          await fetch('/api/send-support-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'contact', adminEmail: notif.adminEmail,
              userName: payload.name, userEmail: payload.email,
              subject: payload.subject, message: payload.message, channel: 'Contact form',
            }),
          })
        } catch {
          // The message is already saved; notification failure must not invite a duplicate submission.
        }
      })()
    } catch {
      setError('We could not confirm that your message was received. Your details are still here. Please try again or contact us directly.')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  const field =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100'

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="Contact LIVAREX — Get Help with Your Property Search"
        description="Reach the LIVAREX team by email, WhatsApp or phone. Our team is here to help with property enquiries, landlord support, and general questions."
        url="/contact"
      />

      <PublicNavbar />

      <style>{`
        .lv-contact section[id] { scroll-margin-top: 100px; }
        .lv-contact a:focus-visible, .lv-contact button:focus-visible { outline: 3px solid #2563eb; outline-offset: 4px; }
        @media(prefers-reduced-motion:reduce) { .lv-contact * { transition:none!important; animation:none!important; scroll-behavior:auto!important; } }
      `}</style>
      <main className="lv-contact">
        <section className="relative overflow-hidden bg-slate-950 pt-24 pb-20 text-white sm:pt-28 lg:pt-32">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)', backgroundSize: '34px 34px' }} />
          <div className="absolute -left-16 top-20 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-[34rem] w-[34rem] rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Contact LIVAREX
                </p>

                <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
                  Let’s Help You Move Forward.
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
                  Whether you’re searching for a home, listing a property, or need help with your LIVAREX account, our team is here to point you in the right direction.
                </p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-100">
                  <Sparkles className="h-4 w-4 text-blue-300" />
                  Property support. Landlord assistance. General enquiries.
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="#contact-form"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500"
                  >
                    Send a Message
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href={phoneToTelLink(phone)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                  >
                    <Phone className="h-4 w-4" />
                    Call Us
                  </a>
                </div>
              </div>

              <div className="relative">
                <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
                  <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-3 shadow-[0_26px_80px_-28px_rgba(14,116,144,0.75)]">
                    <img
                      src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
                      alt="Modern residential property exterior"
                      className="h-[22rem] w-full rounded-[1.2rem] object-cover sm:h-[27rem]"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                      <img
                        src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80"
                        alt="Modern apartment interior"
                        className="h-36 w-full rounded-[1rem] object-cover sm:h-44"
                      />
                    </div>

                    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                      <img
                        src="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80"
                        alt="Modern residential balcony exterior"
                        className="h-36 w-full rounded-[1rem] object-cover sm:h-44"
                      />
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-5 left-5 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 shadow-xl shadow-slate-950/20 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Property Support</p>
                  <p className="mt-1 text-sm font-semibold text-white">Here when you need us.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* <section className="border-b border-slate-100 bg-white py-10 md:py-14" aria-labelledby="enquiry-title">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">How Can We Help?</p><h2 id="enquiry-title" className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Start with what brings you here.</h2></div><p className="text-sm text-slate-500">Choose your enquiry type.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {enquiryCategories.map(({ id, title, role, icon: Icon }) => <button key={id} type="button" disabled={loading} aria-pressed={form.role === role} onClick={() => chooseCategory(role)} className={`flex min-h-20 items-center gap-3 rounded-xl border px-4 py-4 text-left transition-colors disabled:opacity-60 ${form.role === role ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}><Icon className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="flex-1 text-sm font-semibold">{title}</span><ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></button>)}
            </div>
          </div>
        </section> */}

        <section id="contact-form" className="border-y border-slate-100 bg-[#f5f8fd] py-14 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.3)] lg:grid-cols-[0.8fr_1.2fr]">
              <div className="min-w-0 p-6 sm:p-8 lg:col-start-2 lg:row-start-1 lg:p-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Send a Message</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  Tell Us What You Need.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                  Share a few details and the LIVAREX team can direct your enquiry appropriately.
                </p>

                {success ? (
                  <div role="status" aria-live="polite" className="mt-8 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-10">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-emerald-600/20">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold text-slate-950">Message Sent.</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Thanks, {sentName || 'there'}. Your message has been received and the LIVAREX team will review it.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSuccess(false)}
                      className="mt-6 inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8 space-y-6" aria-busy={loading}>
                    {error && (
                      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-slate-700">
                          Full Name *
                        </label>
                        <input
                          required
                          type="text"
                          id="contact-name" name="name" disabled={loading} autoComplete="name" value={form.name}
                          onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                          placeholder="Adebayo Okafor"
                          className={field}
                        />
                      </div>

                      <div>
                        <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-slate-700">
                          Email Address *
                        </label>
                        <input
                          required
                          type="email"
                          id="contact-email" name="email" disabled={loading} autoComplete="email" value={form.email}
                          onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                          placeholder="you@example.com"
                          className={field}
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="contact-role" className="mb-2 block text-sm font-medium text-slate-700">
                          I’m contacting LIVAREX about *
                        </label>
                        <div className="relative"><select
                          id="contact-role" name="role" disabled={loading} value={form.role}
                          onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
                          className={`${field} appearance-none pr-10`}
                        >
                          <option value="Property enquiry">Property enquiry</option>
                          <option value="Landlord support">Landlord support</option>
                          <option value="Listing verification">Listing verification</option>
                          <option value="Account support">Account support</option>
                          <option value="Partnership / business">Partnership / business</option>
                          <option value="General enquiry">General enquiry</option>
                        </select><ChevronDown className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-slate-500" aria-hidden="true" /></div>
                      </div>

                      <div>
                        <label htmlFor="contact-subject" className="mb-2 block text-sm font-medium text-slate-700">
                          Property / Listing Reference
                        </label>
                        <input
                          type="text"
                          id="contact-subject" name="subject" disabled={loading} value={form.subject}
                          onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
                          placeholder="Optional — listing ID, address or reference"
                          className={field}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-slate-700">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={6}
                        id="contact-message" name="message" disabled={loading} value={form.message}
                        onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                        placeholder="Tell us as much as you can so we can point you in the right direction."
                        maxLength={5000} className={`${field} min-h-40 resize-y`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              <aside className="relative flex min-w-0 flex-col overflow-hidden bg-[#123d93] p-6 text-white sm:p-8 lg:col-start-1 lg:row-start-1 lg:p-9">
                <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full border-[36px] border-white/5" aria-hidden="true" />
                <div className="relative">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10"><MessageCircle className="h-6 w-6" aria-hidden="true" /></span>
                  <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200">Direct Contact</p>
                  <h3 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em]">A conversation.<br />A clearer next step.</h3>
                  <p className="mt-4 max-w-xs text-sm leading-7 text-blue-100">Prefer to reach us directly? Choose the channel that works for you.</p>
                  <div className="mt-8 divide-y divide-white/15">
                    {channels.map(({label,value,href,note,icon:Icon}) => <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="group flex items-start gap-3 py-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-white/20"><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-blue-200">{label}</span><span className="mt-1 block break-words text-sm font-semibold text-white">{value}</span><span className="mt-1 block text-xs leading-5 text-blue-100">{note}</span></span><ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-blue-200" aria-hidden="true" /></a>)}
                  </div>
                </div>
                <div className="relative mt-auto border-t border-white/15 pt-6"><p className="text-xs font-semibold text-white">Property enquiries. Landlord support. Account help.</p><p className="mt-2 text-xs leading-6 text-blue-100">Share your listing reference when you have one to help us understand your enquiry.</p></div>
              </aside>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 md:py-20" aria-labelledby="office-title">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="relative overflow-hidden rounded-[24px] bg-slate-100">
              <img src="https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1400&q=80" alt="Residential architecture" loading="lazy" className="h-64 w-full object-cover md:absolute md:inset-0 md:h-full" />
              <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-slate-950/10 via-slate-950/10 to-slate-950/40 md:block" />
              <div className="relative p-4 md:flex md:min-h-[420px] md:items-center md:justify-end md:p-8 lg:p-10">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-950/5 md:w-[420px] sm:p-8"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><MapPin className="h-5 w-5" aria-hidden="true" /></span><p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Our Location</p><h2 id="office-title" className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Visit LIVAREX</h2><p className="mt-4 text-base leading-7 text-slate-600">{address}</p><a href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700">Get Directions<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Quick Help</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                You May Find Your Answer Here.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {helpLinks.map(({ href, icon: Icon, label, description }) => {
                const content = <><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-4 w-4" aria-hidden="true" /></span><h3 className="mt-4 text-base font-semibold text-slate-950">{label}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">Learn more <ArrowRight className="h-4 w-4" aria-hidden="true" /></span></>
                const card = 'block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-200 hover:bg-blue-50/30'
                return href.startsWith('#') ? <a key={label} href={href} className={card}>{content}</a> : <Link key={label} href={href} className={card}>{content}</Link>
              })}
            </div>
          </div>
        </section>

        <section id="faq-panel" className="border-t border-slate-100 bg-[#f7f9fc] py-14 md:py-20" aria-labelledby="faq-title">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Questions We Hear Often</p><h2 id="faq-title" className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-4xl">Frequently Asked<br />Questions</h2><p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">A few answers to help you take the next step.</p><a href="#contact-form" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-blue-600">Still have a question?<ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div>
            <div className="rounded-[20px] border border-slate-200 bg-white px-5 sm:px-7">
              {faqs.map((faq, index) => <div key={faq.q} className="border-b border-slate-100 last:border-0">
                <button type="button" id={`contact-faq-trigger-${index}`} aria-expanded={openFaq === index} aria-controls={`contact-faq-${index}`} onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex min-h-20 w-full items-center justify-between gap-4 py-5 text-left"><span className="text-sm font-semibold leading-6 text-slate-900 sm:text-base">{faq.q}</span><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${openFaq === index ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>{openFaq === index ? <Minus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}</span></button>
                <div id={`contact-faq-${index}`} role="region" aria-labelledby={`contact-faq-trigger-${index}`} hidden={openFaq !== index} className="max-w-xl pb-6 pr-6 text-sm leading-7 text-slate-600">{faq.a}</div>
              </div>)}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 py-16 text-white">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80"
              alt="Modern property exterior"
              className="h-full w-full object-cover opacity-30"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1f3a]/90 via-[#0b1f3a]/80 to-[#0b1f3a]/70" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200">Need Help?</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">
                  Let’s Help You Move Forward.
                </h2>
                <p className="mt-3 max-w-2xl text-base text-slate-200">
                  Whether you’re searching for a property, listing one, or need support, LIVAREX is here to help.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/listings"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-500"
                >
                  Browse Properties
                </Link>
                <Link
                  href="/landlord/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10"
                >
                  List Your Property
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

import { useEffect, useState } from 'react'
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
  const [platform, setPlatform] = useState<PlatformSettings | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Property enquiry',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    getPlatformSettings().then((settings) => {
      if (active) setPlatform(settings)
    })

    return () => {
      active = false
    }
  }, [])

  const phone = platform?.phone || '+234 7061370742'
  const email = platform?.email || 'support@livarex.com.ng'
  const address = platform?.address?.trim()

  const channels = [
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: phone,
      href: phoneToWaLink(phone),
      note: 'Fast questions and property enquiries',
      accent: 'bg-[#25D366]',
      glow: 'shadow-green-500/25',
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
      accent: 'bg-emerald-600',
      glow: 'shadow-emerald-500/25',
      action: 'Call Us',
      highlight: false,
    },
    {
      icon: MapPin,
      label: 'Office',
      value: address || 'Lagos, Nigeria',
      href: address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : '#',
      note: address ? 'Visit us in person' : 'Office details available in settings',
      accent: 'bg-rose-600',
      glow: 'shadow-rose-500/25',
      action: address ? 'Get Directions' : 'Location',
      highlight: false,
    },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = {
        ...form,
        subject: form.subject.trim() || form.role,
      }

      if (isSupabaseConfigured()) {
        const supabase = createClient()
        const { error: err } = await supabase.from('contact_messages').insert({
          name: payload.name,
          email: payload.email,
          role: payload.role,
          subject: payload.subject,
          message: payload.message,
        })

        if (err) throw new Error(err.message)

        const notif = await getNotificationSettings()
        fetch('/api/send-support-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'contact',
            adminEmail: notif.adminEmail,
            userName: payload.name,
            userEmail: payload.email,
            subject: payload.subject,
            message: payload.message,
            channel: 'Contact form',
          }),
        }).catch(() => {
          // Non-fatal best-effort notification.
        })
      }

      setSuccess(true)
      setForm({ name: '', email: '', role: 'Property enquiry', subject: '', message: '' })
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again or email us directly.')
    } finally {
      setLoading(false)
    }
  }

  const field =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100'

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="Contact LIVAREX — Get Help with Your Property Search"
        description="Reach the LIVAREX team by email, WhatsApp or phone. Our team is here to help with property enquiries, landlord support, and general questions."
        url="/contact"
      />

      <PublicNavbar />

      <main>
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

        <section className="border-b border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">How Can We Help?</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                Choose the option that best matches your enquiry.
              </h2>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {enquiryCategories.map((category) => {
                const Icon = category.icon

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, role: category.role }))
                      document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 text-left transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-[0_18px_40px_-22px_rgba(37,99,235,0.45)]"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white">
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all group-hover:border-blue-200 group-hover:text-blue-600">
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>

                      <h3 className="mt-5 text-lg font-extrabold text-slate-950">{category.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{category.description}</p>

                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                        {category.action}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>

                    <div className="border-t border-slate-200 bg-slate-100/60">
                      <img src={category.image} alt={category.title} className="h-24 w-full object-cover" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section id="contact-form" className="bg-[#f7f7f5] py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.34)] sm:p-8 lg:p-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Send a Message</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  Tell Us What You Need.
                </h2>
                <p className="mt-3 max-w-xl text-base text-slate-600">
                  Share a few details and the LIVAREX team can direct your enquiry appropriately.
                </p>

                {success ? (
                  <div className="mt-8 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-10">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black text-slate-950">Message Sent.</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Thanks, {form.name || 'there'}. Your message has been received and the LIVAREX team will review it.
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
                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    {error && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Full Name *
                        </label>
                        <input
                          required
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                          placeholder="Adebayo Okafor"
                          className={field}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Email Address *
                        </label>
                        <input
                          required
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                          placeholder="you@example.com"
                          className={field}
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          I’m contacting LIVAREX about *
                        </label>
                        <select
                          value={form.role}
                          onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
                          className={field}
                        >
                          <option value="Property enquiry">Property enquiry</option>
                          <option value="Landlord support">Landlord support</option>
                          <option value="Listing verification">Listing verification</option>
                          <option value="Account support">Account support</option>
                          <option value="Partnership / business">Partnership / business</option>
                          <option value="General enquiry">General enquiry</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Property / Listing Reference
                        </label>
                        <input
                          type="text"
                          value={form.subject}
                          onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
                          placeholder="Optional — listing ID, address or reference"
                          className={field}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={6}
                        value={form.message}
                        onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                        placeholder="Tell us as much as you can so we can point you in the right direction."
                        className={`${field} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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

              <aside className="space-y-6">
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.34)]">
                  <div className="relative h-60 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
                      alt="Modern residential property exterior"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-slate-900/10" />
                    <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-slate-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200 backdrop-blur-sm">
                      Need help? Reach us directly.
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Direct Contact</p>
                    <h3 className="mt-3 text-2xl font-black tracking-[-0.05em] text-slate-950">
                      Prefer to reach us directly?
                    </h3>

                    <div className="mt-6 space-y-3">
                      {channels.map((channel) => {
                        const Icon = channel.icon

                        return (
                          <a
                            key={channel.label}
                            href={channel.href}
                            target={channel.href.startsWith('http') ? '_blank' : undefined}
                            rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            className={`group flex items-center gap-3 rounded-2xl border p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50 ${channel.highlight ? 'border-green-200 bg-green-50/60' : 'border-slate-200 bg-slate-50'}`}
                          >
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${channel.accent} text-white shadow-lg ${channel.glow}`}>
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-bold text-slate-900">{channel.label}</p>
                                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                  {channel.action}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{channel.note}</p>
                              <p className="mt-1 truncate text-sm font-semibold text-slate-900">{channel.value}</p>
                            </div>

                            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
                          </a>
                        )
                      })}
                    </div>

                    {address && (
                      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Office</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{address}</p>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
                        >
                          Get directions
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="bg-white py-2">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50">
              <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
                <div className="relative h-full min-h-[280px] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80"
                    alt="Elegant residential compound exterior"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 to-slate-900/10" />
                </div>

                <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Visit LIVAREX</p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">
                    Visit LIVAREX
                  </h3>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Location</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{address || '14 Bourdillon Road, Ikoyi, Lagos'}</p>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(address || '14 Bourdillon Road, Ikoyi, Lagos')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex w-fit items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500"
                  >
                    Get Directions
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Quick Help</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                You May Find Your Answer Here.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {helpLinks.map(({ href, icon: Icon, label, description }) => (
                <div
                  key={label}
                  className="group flex h-full flex-col justify-between rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-[0_18px_40px_-22px_rgba(37,99,235,0.45)]"
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-4 w-4" />
                    </div>

                    {href.startsWith('#') ? (
                      <a href={href} className="mt-4 block text-base font-extrabold text-slate-950">
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className="mt-4 block text-base font-extrabold text-slate-950">
                        {label}
                      </Link>
                    )}
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
                  </div>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                    Learn more
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq-panel" className="border-t border-slate-200 bg-[#f7f7f5] py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Questions We Hear Often</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-4 sm:p-6">
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div key={faq.q} className="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                        className="flex w-full items-center justify-between gap-4 py-2 text-left"
                      >
                        <span className="text-base font-semibold text-slate-900">{faq.q}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                          {openFaq === index ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </div>
                      </button>

                      {openFaq === index && (
                        <div className="pt-3 text-sm leading-relaxed text-slate-600">{faq.a}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.34)]">
                <img
                  src="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80"
                  alt="Modern residential balcony exterior"
                  className="h-full min-h-[320px] w-full object-cover"
                />
              </div>
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

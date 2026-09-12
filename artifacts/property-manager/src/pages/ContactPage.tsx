import { useEffect, useState } from 'react'
import { Link } from '@/lib/navigation'
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle,
  ChevronDown,
  House,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
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
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'landlord',
    title: 'Landlord Support',
    description: 'Questions about verification, listings, or managing your property?',
    action: 'Landlord Help',
    icon: Building2,
    role: 'Landlord support',
    image:
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'account',
    title: 'Account Support',
    description: 'Need assistance with your LIVAREX account or platform experience?',
    action: 'Get Support',
    icon: UserCheck,
    role: 'Account support',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'general',
    title: 'General Enquiries',
    description: 'Partnerships, business enquiries, feedback, or anything else.',
    action: 'Contact Us',
    icon: BriefcaseBusiness,
    role: 'General enquiry',
    image:
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80',
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
        <section className="relative overflow-hidden bg-[#f5f7fb] pb-20 pt-24 text-slate-900 sm:pt-28 lg:pt-32">
          <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(30,64,175,0.14) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-200/60 blur-3xl" />
          <div className="absolute right-0 top-0 h-[30rem] w-[30rem] rounded-full bg-sky-200/40 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Contact LIVAREX
                </p>

                <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-6xl">
                  Here When You Need Us.
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                  Whether you’re looking for a property, managing a listing, or need help with your account, LIVAREX is here to help.
                </p>

                <div className="mt-8 flex flex-wrap gap-2">
                  {['Property enquiries', 'Landlord support', 'General assistance'].map((item) => (
                    <div
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="#contact-form"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-500"
                  >
                    Send a Message
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href={phoneToTelLink(phone)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-200 hover:text-blue-700"
                  >
                    <Phone className="h-4 w-4" />
                    Call Us
                  </a>
                </div>
              </div>

              <div className="relative">
                <div className="relative mx-auto max-w-[620px]">
                  <div className="absolute left-6 top-6 z-20 rounded-full border border-blue-200 bg-white/90 px-4 py-2 shadow-[0_18px_40px_-18px_rgba(59,130,246,0.45)] backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Property support</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">made simple.</p>
                  </div>

                  <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_40px_90px_-35px_rgba(15,23,42,0.28)]">
                    <img
                      src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
                      alt="Modern residential property exterior"
                      className="h-[25rem] w-full rounded-[1.35rem] object-cover sm:h-[32rem]"
                    />
                  </div>

                  <div className="absolute -bottom-3 right-4 z-10 w-[42%] overflow-hidden rounded-[1.5rem] border border-white bg-white p-2 shadow-[0_30px_55px_-28px_rgba(15,23,42,0.45)]">
                    <img
                      src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80"
                      alt="Modern apartment interior"
                      className="h-36 w-full rounded-[1rem] object-cover sm:h-44"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Start With What You Need</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                Choose the path that best matches your enquiry.
              </h2>
            </div>

            <div className="mt-12 space-y-4">
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
                    className="group block w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 text-left transition-all duration-200 hover:border-blue-200 hover:bg-white hover:shadow-[0_26px_60px_-30px_rgba(14,116,144,0.35)]"
                  >
                    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[auto_1fr_auto_auto] lg:items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="text-xl font-extrabold text-slate-950">{category.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{category.description}</p>
                      </div>

                      <div className="hidden lg:block">
                        <p className="text-sm font-semibold text-blue-600">{category.action}</p>
                      </div>

                      <div className="flex items-center justify-between gap-4 lg:justify-end">
                        <p className="text-sm font-semibold text-blue-600 lg:hidden">{category.action}</p>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all group-hover:border-blue-200 group-hover:text-blue-600">
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 bg-slate-100/60 px-4 py-3 sm:px-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-20 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <img src={category.image} alt={category.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Livarex property focus
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section id="contact-form" className="bg-[#f7f7f5] py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div className="pt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Send a Message</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  Tell Us What You Need.
                </h2>

                <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
                  Share a few details and LIVAREX will direct your enquiry to the right place.
                </p>

                <p className="mt-6 text-sm text-slate-500">
                  Clear details help us respond more effectively.
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.34)] sm:p-8 lg:p-10">
                {success ? (
                  <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-10">
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
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Full Name
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
                          Email Address
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
                          Enquiry Type
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
                        Message
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
                          Send Enquiry
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-6 sm:py-8">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50">
              <div className="grid gap-0 md:grid-cols-4">
                {channels.map((channel) => {
                  const Icon = channel.icon

                  return (
                    <a
                      key={channel.label}
                      href={channel.href}
                      target={channel.href.startsWith('http') ? '_blank' : undefined}
                      rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className={`group relative p-5 text-left transition-all hover:bg-white ${channel.highlight ? 'bg-green-50/70' : 'bg-slate-50'} ${channel.label === 'Office' ? '' : 'border-r border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${channel.accent} text-white shadow-lg ${channel.glow}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{channel.action}</span>
                      </div>

                      <p className="mt-4 text-sm font-bold text-slate-900">{channel.label}</p>
                      <p className="mt-2 text-sm text-slate-600">{channel.note}</p>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{channel.value}</p>

                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                        {channel.label === 'WhatsApp' ? 'Message Us' : channel.label === 'Email' ? 'Send Email' : channel.label === 'Phone' ? 'Call Us' : 'Get Directions'}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </a>
                  )
                })}
              </div>
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
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Quick Help</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  Find Answers Before You Reach Out.
                </h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
                  Some of the most common questions already have straightforward answers.
                </p>
              </div>

              <div className="space-y-4">
                {helpLinks.map(({ href, icon: Icon, label, description }, index) => (
                  <div key={label} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <span className="text-xs font-bold">0{index + 1}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Icon className="h-4 w-4 text-blue-600" />
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Resource</p>
                          </div>
                          <h3 className="mt-2 text-xl font-extrabold text-slate-950">{label}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
                        </div>
                      </div>

                      {href.startsWith('#') ? (
                        <a href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                          View FAQs
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      ) : (
                        <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                          Learn More
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.34)]">
                <img
                  src="https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80"
                  alt="Modern residential building exterior"
                  className="h-full min-h-[320px] w-full object-cover"
                />
              </div>

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
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {openFaq === index && (
                        <div className="pt-3 text-sm leading-relaxed text-slate-600">{faq.a}</div>
                      )}
                    </div>
                  ))}
                </div>
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
          <div className="absolute inset-0 bg-slate-950/75" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200">Need More Help?</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">
                  Start the Conversation.
                </h2>
                <p className="mt-3 max-w-2xl text-base text-slate-200">
                  Whether you’re finding a home or listing one, LIVAREX is here to help you move forward.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#contact-form"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-500"
                >
                  Send a Message
                </a>
                <Link
                  href="/listings"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10"
                >
                  Browse Properties
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

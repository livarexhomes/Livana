import { useState, useEffect } from 'react'
import {
  HelpCircle, ChevronDown, ChevronUp, MessageSquare, Mail,
  Phone, BookOpen, Video, ExternalLink, Search,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const FAQS = [
  {
    q: 'How do I approve a new landlord registration?',
    a: 'Go to Clients → find the landlord with a "Pending" badge → click "Approve →" at the bottom of their card. Their account will immediately become active and they can start listing properties.',
  },
  {
    q: 'How do I feature a property on the homepage?',
    a: 'Navigate to Properties, find the listing, and toggle the "Feature" button on the property card. Featured properties appear prominently in search results and on the homepage.',
  },
  {
    q: 'How can I change a property\'s status?',
    a: 'On the Admin Properties page, each card shows the property status. Use the status dropdown (Available, Taken, Coming Soon, Under Negotiation) to update it instantly.',
  },
  {
    q: 'Can I export a list of all landlords?',
    a: 'Currently, data can be exported directly from your Supabase dashboard. Native CSV export from the admin panel is on the roadmap for a future release.',
  },
  {
    q: 'How do I reject a landlord account?',
    a: 'On the Clients page, pending landlords show an "Approve →" link. To reject, open the landlord\'s record in Supabase and update their status to "rejected", or contact support to enable reject buttons.',
  },
  {
    q: 'How is revenue data calculated on the dashboard?',
    a: 'The revenue chart currently uses indicative estimates based on listing count and average market rates. To connect real transaction data, integrate a payment gateway such as Paystack or Flutterwave.',
  },
  {
    q: 'Who can access the admin panel?',
    a: 'Only users with the "admin" role in the database can access /admin routes. Role assignment is managed directly in your Supabase users table under the role column.',
  },
  {
    q: 'How do I add more admin users?',
    a: 'Register a new account through the normal sign-up flow, then update that user\'s role to "admin" in the Supabase dashboard. No code changes are required.',
  },
]

const DOCS = [
  { title: 'Getting Started Guide',    icon: BookOpen, href: '#', desc: 'Set up your platform from scratch' },
  { title: 'Landlord Onboarding',      icon: BookOpen, href: '#', desc: 'How to approve and manage landlords' },
  { title: 'Property Management',      icon: BookOpen, href: '#', desc: 'Listing rules, statuses, and features' },
  { title: 'Video Walkthrough',        icon: Video,    href: '#', desc: 'Full admin panel tour (12 min)' },
  { title: 'API Reference',            icon: ExternalLink, href: '#', desc: 'Supabase schema and edge functions' },
  { title: 'Release Notes',            icon: ExternalLink, href: '#', desc: 'What\'s new in LIVAREX v2' },
]

export default function AdminHelp() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [ticket, setTicket] = useState({ subject: '', message: '', priority: 'normal' })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
  }, [])

  const filteredFaqs = FAQS.filter(f =>
    !search.trim() ||
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => { setSubmitted(false); setTicket({ subject: '', message: '', priority: 'normal' }) }, 4000)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gray-100 shrink-0">
            <div className="px-4 md:px-8 py-5 max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Help center</p>
                <h1 className="mt-2 text-3xl font-extrabold text-slate-950 tracking-tight">Help & Support</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">Find answers, documentation, and direct support for your admin workflow.</p>
              </div>
              <div className="rounded-3xl bg-slate-50 border border-slate-200 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Need help?</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">We’re here for you</p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-4 md:p-6">
              <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
                <section className="space-y-5">
                  <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.18)]">
                    <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr] lg:items-center">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Get support</p>
                        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">Support that helps you move faster</h2>
                        <p className="mt-3 text-sm leading-6 text-slate-500">Browse frequently asked questions, explore docs, or submit a ticket to reach our team directly.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          { label: 'Average response', value: '5 min' },
                          { label: 'Support channels', value: '3 options' },
                          { label: 'Ticket SLA', value: '24 hrs' },
                        ].map(item => (
                          <div key={item.label} className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
                            <p className="mt-2 text-xl font-semibold text-slate-950">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { icon: MessageSquare, title: 'Live Chat', desc: 'Quick replies during business hours', accent: 'bg-blue-600' },
                      { icon: Mail, title: 'Email Support', desc: 'support@livarex.com', accent: 'bg-violet-600' },
                      { icon: Phone, title: 'Phone Support', desc: '+234 800 548 2621', accent: 'bg-emerald-600' },
                    ].map(c => {
                      const Icon = c.icon
                      return (
                        <div key={c.title} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                          <div className={`w-11 h-11 rounded-3xl ${c.accent} flex items-center justify-center text-white mb-4`}>
                            <Icon className="w-5 h-5" strokeWidth={1.7} />
                          </div>
                          <p className="text-sm font-semibold text-slate-950">{c.title}</p>
                          <p className="mt-2 text-sm text-slate-500 leading-relaxed">{c.desc}</p>
                          <button type="button" className="mt-4 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">
                            Contact
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <HelpCircle className="w-5 h-5 text-blue-600" />
                      <h2 className="text-base font-bold text-slate-950">Frequently Asked Questions</h2>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-5">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search FAQs"
                        className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 bg-transparent focus:outline-none" />
                    </div>
                    <div className="space-y-3">
                      {filteredFaqs.length === 0 ? (
                        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center text-sm text-slate-500">No FAQs match your search.</div>
                      ) : filteredFaqs.map((faq, i) => (
                        <div key={i} className="rounded-[26px] border border-slate-100 overflow-hidden">
                          <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-white text-left hover:bg-slate-50 transition">
                            <p className="text-sm font-semibold text-slate-900">{faq.q}</p>
                            {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </button>
                          {openFaq === i && (
                            <div className="px-5 pb-4 pt-3 bg-slate-50 text-sm text-slate-600 leading-relaxed">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <aside className="space-y-5">
                  <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <h2 className="text-base font-bold text-slate-950">Documentation</h2>
                    </div>
                    <div className="space-y-3">
                      {DOCS.map(doc => {
                        const Icon = doc.icon
                        return (
                          <a key={doc.title} href={doc.href}
                            className="group flex items-start gap-3 rounded-3xl border border-slate-100 p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-950 group-hover:text-blue-600 transition-colors">{doc.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{doc.desc}</p>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <h2 className="text-base font-bold text-slate-950">Submit a Ticket</h2>
                    </div>
                    {submitted ? (
                      <div className="rounded-3xl bg-emerald-50 p-6 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
                          <MessageSquare className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="font-semibold text-slate-950">Ticket submitted successfully!</p>
                        <p className="mt-2 text-sm text-slate-500">Our team will contact you within 24 hours.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Subject</label>
                          <input required value={ticket.subject} onChange={e => setTicket(t => ({ ...t, subject: e.target.value }))}
                            placeholder="What do you need help with?"
                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Priority</label>
                          <select value={ticket.priority} onChange={e => setTicket(t => ({ ...t, priority: e.target.value }))}
                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
                            <option value="low">Low — general question</option>
                            <option value="normal">Normal — something's not working</option>
                            <option value="high">High — data at risk</option>
                            <option value="urgent">Urgent — platform is down</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Message</label>
                          <textarea required rows={5} value={ticket.message} onChange={e => setTicket(t => ({ ...t, message: e.target.value }))}
                            placeholder="Tell us more about the issue..."
                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                        </div>
                        <button type="submit"
                          className="w-full rounded-3xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition-colors">
                          Submit Ticket
                        </button>
                      </form>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

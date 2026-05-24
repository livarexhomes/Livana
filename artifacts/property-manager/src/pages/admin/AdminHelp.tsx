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
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-5 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Help & Support</h1>
              <p className="text-sm text-gray-400 mt-0.5">Answers, documentation, and direct support</p>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6 max-w-4xl">

            {/* ── Contact Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: MessageSquare, title: 'Live Chat', sub: 'Avg. response: 5 min', cta: 'Start chat', color: 'bg-blue-600' },
                { icon: Mail,          title: 'Email Support', sub: 'support@livarex.com', cta: 'Send email', color: 'bg-violet-600' },
                { icon: Phone,         title: 'Phone', sub: '+234 800 548 2621', cta: 'Call now', color: 'bg-emerald-600' },
              ].map(c => {
                const Icon = c.icon
                return (
                  <div key={c.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                    <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{c.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                    </div>
                    <button type="button" className="mt-auto w-full py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      {c.cta}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* ── FAQ ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-gray-900">Frequently Asked Questions</h2>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 mb-5">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search FAQs..." className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
              </div>
              <div className="space-y-2">
                {filteredFaqs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No FAQs match your search.</p>
                ) : filteredFaqs.map((faq, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-semibold text-gray-800">{faq.q}</p>
                      {openFaq === i
                        ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3 bg-slate-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* ── Documentation ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-gray-900">Documentation</h2>
                </div>
                <div className="space-y-2">
                  {DOCS.map(d => {
                    const Icon = d.icon
                    return (
                      <a key={d.title} href={d.href}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-blue-600" strokeWidth={1.7} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{d.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{d.desc}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0 mt-1" />
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* ── Support Ticket ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-gray-900">Submit a Ticket</h2>
                </div>
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="font-bold text-gray-900">Ticket submitted!</p>
                    <p className="text-sm text-gray-400 mt-1">We'll respond within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Subject</label>
                      <input required value={ticket.subject} onChange={e => setTicket(t => ({ ...t, subject: e.target.value }))}
                        placeholder="Brief description of your issue"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Priority</label>
                      <select value={ticket.priority} onChange={e => setTicket(t => ({ ...t, priority: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                        <option value="low">Low — general question</option>
                        <option value="normal">Normal — something's not working</option>
                        <option value="high">High — data at risk</option>
                        <option value="urgent">Urgent — platform is down</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Message</label>
                      <textarea required rows={4} value={ticket.message} onChange={e => setTicket(t => ({ ...t, message: e.target.value }))}
                        placeholder="Describe the issue in detail..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none" />
                    </div>
                    <button type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
                      Submit Ticket
                    </button>
                  </form>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

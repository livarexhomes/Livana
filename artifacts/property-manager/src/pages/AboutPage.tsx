import { Link } from '@/lib/navigation'
import { ArrowRight, CheckCircle, Shield, Users, Zap, Eye, TrendingUp, Building2, Heart, Globe, MapPin } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'

const stats = [
  { value: '2,400+', label: 'Active Listings', sub: 'Across Nigeria' },
  { value: '850+',   label: 'Verified Landlords', sub: 'KYC approved' },
  { value: '36',     label: 'Cities Covered', sub: 'And growing' },
  { value: '₦0',     label: 'Agent Fees', sub: 'Always free' },
]

const values = [
  { icon: Shield, title: 'Verified First', desc: 'Every landlord is reviewed and approved before a single listing goes live. No exceptions. No shortcuts.', accent: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/30' },
  { icon: Eye,    title: 'Radical Transparency', desc: 'Real prices. Real availability. Real people. We remove the opacity that makes Nigerian property search frustrating.', accent: 'from-violet-500 to-violet-600', glow: 'shadow-violet-500/30' },
  { icon: Users,  title: 'Livarex as Middleman', desc: 'All communication between tenants and landlords is coordinated by Livarex — making every interaction safe and structured.', accent: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/30' },
  { icon: Zap,    title: 'Speed Matters', desc: 'Good properties move fast. We built Livarex to help renters act quickly and landlords fill vacancies without delay.', accent: 'from-amber-500 to-amber-600', glow: 'shadow-amber-500/30' },
]

const team = [
  { name: 'Shorinmade Ibrahim', role: 'CEO & Co-Founder',    bio: 'Former real estate agent who spent 8 years watching good tenants get scammed. Built Livarex to fix it.', initials: 'SI', accent: 'from-blue-500 to-blue-700' },
  { name: 'Seidu Tesleem',      role: 'CTO & Co-Founder',    bio: 'Full-stack engineer and product thinker. Obsessed with making complex things feel simple and fast.', initials: 'ST', accent: 'from-violet-500 to-violet-700' },
  { name: 'Micheal Kolawole',   role: 'Head of Operations',  bio: 'Runs the landlord verification engine and ensures every listing on the platform meets our standards.', initials: 'MK', accent: 'from-emerald-500 to-emerald-700' },
  { name: 'Spacze',             role: 'Head of Growth',      bio: 'Connects landlords and renters. Grew our Lagos coverage from 40 listings to 1,200 in under 18 months.', initials: 'SP', accent: 'from-rose-500 to-rose-700' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* ── HERO ── */}
      <section className="relative bg-gray-950 pt-32 pb-28 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '36px 36px' }} />
        <div className="absolute -top-40 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              About Livarex
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-[4.5rem] font-extrabold text-white leading-[1.04] tracking-tight mb-7">
              Building the trust in Nigerian<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-violet-400">real estate we wished existed.</span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mb-10">
              Livarex was founded to eliminate agent exploitation, fake listings, and property scams — creating a transparent marketplace where every landlord is verified and every interaction is safe.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/listings" className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40">
                Browse Listings <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/6 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-all border border-white/10 hover:border-white/20">
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">
            {stats.map(s => (
              <div key={s.label} className="px-8 py-10 text-center first:pl-0 last:pr-0">
                <p className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-1">{s.value}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORY ── */}
      <section className="bg-white py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-5">Our Story</p>
              <h2 className="text-4xl md:text-[2.75rem] font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
                Built to eliminate agent fees and fake listings.
              </h2>
              <div className="space-y-5 text-gray-500 leading-relaxed text-[15px]">
                <p>Livarex was founded after experiencing firsthand the frustrations of finding a home in Nigeria. After spending months searching for a two-bedroom apartment in Lagos and paying multiple agent fees, promising deals repeatedly fell through due to fake listings and unreliable intermediaries.</p>
                <p>That experience revealed a bigger problem — a rental market filled with hidden fees, unverified landlords, and limited transparency. Livarex was created to change that by coordinating all tenant-landlord communication through a trusted platform, so every interaction is safe.</p>
                <p>Today, Livarex is helping Nigerians discover verified properties across multiple cities, removing unnecessary middlemen and making property search simpler, safer, and more transparent.</p>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-[2rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] aspect-[4/3]">
                <img src="https://images.unsplash.com/photo-1560472355-536de3962603?w=900&q=80" alt="Livarex property marketplace" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white font-bold text-lg">Nigeria's Verified Property Marketplace</p>
                  <p className="text-blue-300 text-sm mt-1">All communication handled by Livarex</p>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-blue-600 text-white rounded-2xl px-5 py-4 shadow-2xl shadow-blue-600/40">
                <Building2 className="w-6 h-6 mb-1.5 text-blue-200" />
                <p className="text-3xl font-extrabold leading-none">36</p>
                <p className="text-blue-200 text-xs mt-1 font-medium">Cities Covered</p>
              </div>
              <div className="absolute -bottom-5 -left-5 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">100% Verified</p>
                    <p className="text-xs text-gray-400">All landlords KYC approved</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="bg-gray-950 py-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">What We Stand For</p>
            <h2 className="text-4xl font-extrabold text-white tracking-tight mb-3">Our core values</h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">These aren't aspirations on a wall. They're the decisions we make every single day.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map(v => {
              const Icon = v.icon
              return (
                <div key={v.title} className="group relative bg-white/[0.04] border border-white/8 rounded-3xl p-7 hover:bg-white/[0.07] hover:border-white/15 transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
                  <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${v.accent} flex items-center justify-center mb-5 shadow-lg ${v.glow} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-base mb-3 relative">{v.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed relative">{v.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="bg-white py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-4">The People</p>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Meet the team</h2>
            <p className="text-gray-400 max-w-md mx-auto text-sm leading-relaxed">Small team. Big mission. Everyone here has felt the problem we're solving.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map(m => (
              <div key={m.name} className="group relative bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-xl rounded-3xl p-7 transition-all duration-300 text-center overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-3xl" style={{ background: `linear-gradient(to right, var(--tw-gradient-stops))` }} />
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${m.accent} flex items-center justify-center text-white text-xl font-extrabold mx-auto mb-5 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                  {m.initials}
                </div>
                <h3 className="text-gray-900 font-bold text-base">{m.name}</h3>
                <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mt-1.5 mb-3">{m.role}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY LIVAREX ── */}
      <section className="bg-gray-950 py-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-5">Why Livarex</p>
              <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-8">
                Verified homes.<br />Trusted process.
              </h2>
              <div className="space-y-4">
                {[
                  'Every landlord completes identity verification before listings go live.',
                  'Every listing is manually reviewed and approved by the Livarex team.',
                  'All tenant-landlord communication is coordinated by Livarex.',
                  'Every property is tied to a verified, real identity.',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3.5">
                    <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-blue-400" />
                    </div>
                    <span className="text-gray-400 text-sm leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Globe,      label: '36 Cities',      sub: 'Across Nigeria',       from: 'from-blue-500/15',    border: 'border-blue-500/20',   text: 'text-blue-400' },
                { icon: Shield,     label: '100% Verified',  sub: 'Landlord rate',        from: 'from-emerald-500/15', border: 'border-emerald-500/20',text: 'text-emerald-400' },
                { icon: TrendingUp, label: '₦0 Fees',        sub: 'Always free to browse',from: 'from-violet-500/15',  border: 'border-violet-500/20', text: 'text-violet-400' },
                { icon: Heart,      label: '4.9/5 Rating',   sub: 'Average user review',  from: 'from-rose-500/15',    border: 'border-rose-500/20',   text: 'text-rose-400' },
              ].map(card => {
                const Icon = card.icon
                return (
                  <div key={card.label} className={`bg-gradient-to-br ${card.from} border ${card.border} rounded-2xl p-6 hover:scale-[1.03] transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${card.text} mb-4`} />
                    <p className={`font-extrabold text-white text-xl`}>{card.label}</p>
                    <p className="text-gray-500 text-xs mt-1">{card.sub}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest mb-7">
            <MapPin className="w-3 h-3" /> Find Your Home
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-5 leading-tight">
            Find your next home —<br />the honest way.
          </h2>
          <p className="text-gray-500 text-lg mb-10 leading-relaxed">
            Join thousands of Nigerians who found their home without a single agent fee.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/listings" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-blue-600/25 hover:shadow-blue-600/40 text-sm">
              Browse Listings <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl transition-all text-sm">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

import { Link } from 'wouter'
import { ArrowRight, CheckCircle, Shield, Users, Zap, Eye, TrendingUp, Building2, Heart, Globe } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'

const stats = [
  { value: '2,400+', label: 'Active Listings' },
  { value: '850+', label: 'Verified Landlords' },
  { value: '36', label: 'Cities Covered' },
  { value: '₦0', label: 'Agent Fees' },
]

const values = [
  {
    icon: Shield,
    title: 'Verified First',
    desc: 'Every landlord is reviewed and approved before a single listing goes live. No exceptions. No shortcuts.',
    bg: 'bg-blue-600',
  },
  {
    icon: Eye,
    title: 'Radical Transparency',
    desc: 'Real prices. Real availability. Real people. We remove the opacity that makes Nigerian property search so frustrating.',
    bg: 'bg-violet-600',
  },
  {
    icon: Users,
    title: 'Direct Connection',
    desc: 'No middlemen sitting between you and the landlord. One tap on WhatsApp and you\'re talking to the property owner directly.',
    bg: 'bg-emerald-600',
  },
  {
    icon: Zap,
    title: 'Speed Matters',
    desc: 'Good properties move fast. We built LIVAREX to help renters act quickly and landlords fill vacancies without delay.',
    bg: 'bg-amber-600',
  },
]

// const milestones = [
//   { year: '2022', title: 'The Problem Was Personal', desc: 'Our founder spent three months and paid two agents to find a 2-bedroom in Lagos. Both deals fell through. The idea for LIVAREX was born out of that frustration.' },
//   { year: '2023', title: 'Building the Foundation', desc: 'We quietly onboarded our first 50 verified landlords across Lagos and Abuja, testing every assumption about what renters actually needed.' },
//   { year: '2023', title: 'First 1,000 Listings', desc: 'By the end of our beta, we had over 1,000 active listings with zero agent fees and a landlord verification rate of 100%.' },
//   { year: '2024', title: 'Expanding Nationally', desc: 'LIVAREX expanded to Port Harcourt, Ibadan, Kano, and 32 more cities, making us the most geographically diverse verified property platform in Nigeria.' },
//   { year: '2025', title: 'Off-Plan & Developments', desc: 'We introduced the Projects marketplace, allowing developers to showcase off-plan developments to a pre-qualified audience of serious buyers.' },
//   { year: '2026', title: 'Today & Beyond', desc: 'With 2,400+ active listings and 850+ verified landlords, LIVAREX is Nigeria\'s most trusted property platform. We\'re just getting started.' },
// ]

const team = [
  { name: 'Shorinmade Ibrahim', role: 'CEO & Co-Founder', bio: 'Former real estate agent who spent 8 years watching good tenants get scammed. Built LIVAREX to fix it.', initials: 'SI', color: 'bg-blue-600' },
  { name: 'Seidu Tesleem', role: 'CTO & Co-Founder', bio: 'Full-stack engineer and product thinker. Obsessed with making complex things feel simple.', initials: 'ST', color: 'bg-violet-600' },
  { name: 'Micheal Kolawole', role: 'Head of Operations', bio: 'Runs the landlord verification engine and ensures every listing on the platform meets our standards.', initials: 'MK', color: 'bg-emerald-600' },
  { name: 'Spacze', role: 'Head of Growth', bio: 'Connects landlords and renters. Grew our Lagos coverage from 40 listings to 1,200 in under 18 months.', initials: 'SP', color: 'bg-rose-600' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* ── HERO — dark ── */}
      <section className="bg-gray-950 pt-28 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/15 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              About LIVAREX
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-7">
              Building Trust in Nigerian Real Estate<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">we wished existed.</span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mb-10">
              LIVAREX was founded to eliminate agent exploitation, fake listings, and property scams by creating a transparent marketplace where renters and buyers connect directly with verified landlords.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/listings" className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25">
                Browse Listings <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/8 hover:bg-white/12 text-white text-sm font-semibold rounded-xl transition-all border border-white/10">
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS — white ── */}
      <section className="bg-white py-16 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-1">{s.value}</p>
                <p className="text-sm text-gray-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORY — white ── */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-4">
                Our Story
              </p>

              <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
                Built to eliminate agent fees and fake listings.
              </h2>

              <div className="space-y-5 text-gray-600 leading-relaxed">
                <p>
                  LIVAREX was founded after experiencing firsthand the frustrations
                  of finding a home in Nigeria. After spending months searching for a
                  two-bedroom apartment in Lagos and paying multiple agent fees,
                  promising deals repeatedly fell through due to fake listings and
                  unreliable intermediaries.
                </p>

                <p>
                  That experience revealed a bigger problem — a rental market filled
                  with hidden fees, unverified landlords, and limited transparency.
                  LIVAREX was created to change that by connecting renters and buyers
                  directly with verified landlords through a trusted digital
                  marketplace.
                </p>

                <p>
                  Today, LIVAREX is helping Nigerians discover verified properties
                  across multiple cities while removing unnecessary middlemen and
                  making property search simpler, safer, and more transparent.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
                <img
                  src="https://images.unsplash.com/photo-1560472355-536de3962603?w=900&q=80"
                  alt="Property marketplace in Nigeria"
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white font-bold text-lg">
                    Nigeria's Verified Property Marketplace
                  </p>

                  <p className="text-blue-300 text-sm">
                    Connecting renters directly with verified landlords
                  </p>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-5 -right-5 bg-blue-600 text-white rounded-2xl p-5 shadow-2xl shadow-blue-600/30">
                <Building2 className="w-7 h-7 mb-1" />
                <p className="text-2xl font-extrabold leading-none">36</p>
                <p className="text-blue-200 text-xs mt-0.5">Cities Covered</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES — dark ── */}
      <section className="bg-gray-950 py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-4">What We Stand For</p>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">Our core values</h2>
            <p className="text-gray-400 mt-3 max-w-lg mx-auto">These aren't aspirations on a wall. They're the decisions we make every day.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map(v => {
              const Icon = v.icon
              return (
                <div key={v.title} className="bg-white/5 border border-white/8 rounded-3xl p-7 hover:bg-white/8 transition-all group">
                  <div className={`w-12 h-12 ${v.bg} rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-base mb-3">{v.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── TIMELINE — white ── */}
      {/* <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-4">Our Journey</p>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">How we got here</h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-600 via-blue-300 to-transparent hidden md:block" />
            <div className="space-y-10">
              {milestones.map((m, i) => (
                <div key={m.year + i} className="md:flex items-start gap-8">
                  <div className="hidden md:flex flex-col items-center shrink-0 w-16">
                    <div className="w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-lg shadow-blue-600/25 mt-1.5 z-10" />
                  </div>
                  <div className="flex-1 bg-gray-50 hover:bg-blue-50/40 border border-gray-100 hover:border-blue-100 rounded-2xl p-6 transition-all">
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full mb-3">{m.year}</span>
                    <h3 className="text-gray-900 font-bold text-lg mb-2">{m.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section> */}

      {/* ── TEAM — dark ── */}
      <section className="bg-gray-950 py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-violet-400 font-bold text-sm uppercase tracking-widest mb-4">The People</p>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">Meet the team</h2>
            <p className="text-gray-400 mt-3 max-w-md mx-auto">Small team. Big mission. Everyone who works here has felt the problem we're solving.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map(m => (
              <div key={m.name} className="bg-white/5 border border-white/8 rounded-3xl p-6 hover:bg-white/8 transition-all text-center group">
                <div className={`w-16 h-16 ${m.color} rounded-2xl flex items-center justify-center text-white text-lg font-extrabold mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform`}>
                  {m.initials}
                </div>
                <h3 className="text-white font-bold">{m.name}</h3>
                <p className="text-blue-400 text-xs font-semibold mt-1 mb-3">{m.role}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY LIVANA — white ── */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-4">Why LIVAREX</p>
              <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
                Verified Homes. Trusted Connections
              </h2>
              <div className="space-y-4">
                {[
                  'Every landlord completes identity verification before listings go live.',
                  'Every landlord verified before any listing goes live.',
                  'Direct WhatsApp contact.',
                  'Every property is tied to a verified identity.',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Globe, label: '2 Cities', sub: 'Across Nigeria', color: 'bg-blue-50 text-blue-600' },
                { icon: Shield, label: '100% Verified', sub: 'Landlord rate', color: 'bg-emerald-50 text-emerald-600' },
                { icon: TrendingUp, label: '₦0 Fees', sub: 'Always free to browse', color: 'bg-violet-50 text-violet-600' },
                { icon: Heart, label: '4.9/5 Rating', sub: 'Average user review', color: 'bg-rose-50 text-rose-600' },
              ].map(card => {
                const Icon = card.icon
                return (
                  <div key={card.label} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
                    <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="font-extrabold text-gray-900 text-lg">{card.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{card.sub}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA — dark ── */}
      <section className="bg-gray-950 py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <p className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-5">Ready?</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-5">
            Find your next home — the honest way.
          </h2>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            Join thousands of Nigerians who found their home without a single agent fee.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/listings" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-blue-600/30 text-sm">
              Browse Listings <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/8 hover:bg-white/12 text-white font-semibold rounded-2xl transition-all border border-white/10 text-sm">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

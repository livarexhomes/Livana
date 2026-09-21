import * as React from 'react'
import { Link } from '@/lib/navigation'
import { ArrowRight, ArrowUpRight, Building2, CheckCircle2, Compass, Eye, FileText, HeartHandshake, Home, MessageSquare, ShieldCheck, Target, UserCheck } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'
import SEO from '@/components/SEO'



const ongoingReviewItems = [
  {
    title: 'Request Information',
    description: 'Additional information or documentation may be requested where necessary.',
  },
  {
    title: 'Review Reports',
    description: 'Reports submitted about a listing may trigger further review.',
  },
  {
    title: 'Investigate Inconsistencies',
    description: 'Suspicious, inaccurate or conflicting information may be investigated.',
  },
  {
    title: 'Suspend When Necessary',
    description: 'A listing may be temporarily placed on hold or suspended while an issue is reviewed.',
  },
]


const values = [
  { title: 'Trust, built into the process', description: 'Identity verification and listing review come before publication. Trust starts with knowing who is behind a property.', icon: ShieldCheck },
  { title: 'Clarity over confusion', description: 'Clear property information and a defined process help landlords and prospective tenants understand what comes next.', icon: Eye },
  { title: 'People, connected directly', description: 'We put the landlord-to-tenant relationship at the centre of the experience, with space for direct questions and conversations.', icon: HeartHandshake },
  { title: 'Ownership of your decisions', description: 'Landlords manage their property information and rental decisions. Tenants choose the spaces that fit their needs.', icon: Compass },
]
const pillars = [
  { title: 'Verified identity', description: 'We establish who landlords are before they can complete the listing process.', icon: UserCheck },
  { title: 'Reviewed properties', description: 'Property listings go through defined LIVAREX review and verification checks.', icon: FileText },
  { title: 'Direct connections', description: 'Prospective tenants can connect directly with approved landlords.', icon: MessageSquare },
]
const landlordBenefits = ['List your property free', 'Reach genuine prospective tenants', 'Verified landlord profile', 'No agents involved', 'No agent commission', 'Manage your property your way']
const sectionLinks = [
  { id: 'our-story', label: 'Our purpose' },
  { id: 'mission', label: 'Mission & vision' },
  { id: 'our-values', label: 'Our values' },
  { id: 'verification', label: 'Trust & verification' },
  { id: 'who-we-serve', label: 'Who we serve' },
]
const container = 'mx-auto max-w-7xl px-5 sm:px-8'
const eyebrow = 'text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600'
const heading = 'text-3xl font-semibold leading-[1.12] tracking-[-0.045em] text-slate-950 sm:text-4xl lg:text-[44px]'
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4'
const bodyCopy = 'text-[15px] leading-7 text-slate-600'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className={eyebrow}>{children}</p>
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SEO title="About LIVAREX — Nigeria's Verified Property Marketplace" description="Meet LIVAREX: our purpose, values and approach to landlord verification, property review and direct connections in Nigeria's rental market." url="/about" />
      <PublicNavbar />
      <style>{`
        .livarex-about section[id] { scroll-margin-top: 110px; }
        .livarex-about a:focus-visible { outline: 3px solid #2563eb; outline-offset: 5px; }
        @media (prefers-reduced-motion: reduce) {
          .livarex-about *, .livarex-about *::before, .livarex-about *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
        }
      `}</style>
      <main className="livarex-about">
        {/* WHO WE ARE */}
        <section className="relative overflow-hidden bg-white pt-[55px]" aria-labelledby="about-title">
          <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-blue-50 blur-3xl" aria-hidden="true" />
          <div className={`${container} relative py-12 md:py-16 lg:py-20`}>
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                  <span className="h-3.5 w-3.5 rounded-full bg-blue-600" aria-hidden="true" /> About LIVAREX
                </div>
                <h1 id="about-title" className="mt-6 max-w-2xl text-[42px] font-semibold leading-[1.06] tracking-[-0.055em] sm:text-5xl lg:text-[64px]">
                  A place to live.<br />A connection<br /><span className="text-blue-600">you can build on.</span>
                </h1>
                <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">
                  LIVAREX is a Nigerian property marketplace connecting prospective tenants with verified landlords and verify property listings.
                </p>
                <p className="mt-3 max-w-lg text-[15px] leading-7 text-slate-600">We bring verification, clearer information and direct connections into a decision that matters: finding your next home.</p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href="/listings?type=rent" className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 ${focus}`}>
                    Explore Properties <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <a href="#our-story" className={`inline-flex min-h-12 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-700 hover:text-blue-600 ${focus}`}>Get to know LIVAREX <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
                </div>
              </div>
              <figure className="relative min-w-0 pb-7">
                <div className="overflow-hidden rounded-[24px] bg-slate-100">
                  <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80" alt="Bright apartment interior with a living area and natural light" width={800} height={900} fetchPriority="high" className="h-[360px] w-full object-cover sm:h-[460px] lg:h-[500px]" />
                </div>
                <figcaption className="relative mx-4 -mt-14 flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.25)] sm:mx-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Home className="h-6 w-6" aria-hidden="true" /></span>
                  <div><p className="text-base font-semibold tracking-tight">More than a property search.</p><p className="mt-1 text-sm text-slate-500">A clearer path to your next chapter.</p></div>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <nav className="border-y border-slate-100 bg-slate-50/60" aria-label="About page sections">
          <div className={`${container} flex flex-wrap gap-x-7 gap-y-1 py-3`}>
            {sectionLinks.map(({ id, label }) => <a key={id} href={`#${id}`} className={`inline-flex min-h-11 items-center rounded-md text-xs font-semibold text-slate-600 transition-colors hover:text-blue-600 sm:text-sm ${focus}`}>{label}</a>)}
          </div>
        </nav>

        {/* PURPOSE — avoid inventing a founding date or company history. */}
        <section id="our-story" className="py-16 md:py-20" aria-labelledby="purpose-title">
          <div className={`${container} grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20`}>
            <div><SectionLabel>Why we exist</SectionLabel><h2 id="purpose-title" className={`${heading} mt-4`}>A property search<br />should start with<br /><span className="text-blue-600">greater clarity.</span></h2></div>
            <div className="lg:pt-2">
              <p className="text-xl font-medium leading-8 tracking-tight text-slate-800">Behind every listing is a landlord. Behind every search is someone looking for a place to call home.</p>
              <p className={`${bodyCopy} mt-5`}>Unclear information, uncertainty about who is behind a listing and too many people in the middle can make that connection harder than it needs to be. LIVAREX exists to make the rental journey more transparent and direct.</p>
              <p className={`${bodyCopy} mt-4`}>Our approach brings landlord identity verification and property review into the listing process, then gives prospective tenants a way to connect directly with approved landlords. The aim is simple: clearer information, better conversations and more confidence in the next step.</p>
              <div className="mt-7 flex items-center gap-3 border-t border-slate-100 pt-6 text-sm font-semibold text-blue-700"><Building2 className="h-5 w-5" aria-hidden="true" />Built around the Nigerian rental experience.</div>
            </div>
          </div>
        </section>

        {/* MISSION & VISION */}
        <section id="mission" className={`${container} pb-16 md:pb-20`} aria-label="Our mission and vision">
          <div className="grid gap-5 md:grid-cols-2">
            <article className="relative overflow-hidden rounded-2xl bg-blue-600 p-7 text-white sm:p-9">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[30px] border-white/5" aria-hidden="true" />
              <div className="relative"><Target className="h-7 w-7 text-blue-100" aria-hidden="true" /><p className="mt-7 text-xs font-semibold uppercase tracking-[0.17em] text-blue-100">Our mission</p><h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.035em]">Make renting clearer,<br />more direct and more trusted.</h2><p className="mt-5 max-w-lg text-[15px] leading-7 text-blue-50">To connect prospective tenants and landlords through verified identities, reviewed property information and direct communication.</p></div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7 sm:p-9"><Compass className="h-7 w-7 text-blue-600" aria-hidden="true" /><p className="mt-7 text-xs font-semibold uppercase tracking-[0.17em] text-blue-600">Our vision</p><h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.035em]">A better rental experience,<br />for both sides of the door.</h2><p className={`${bodyCopy} mt-5`}>We envision a property marketplace in Nigeria built on better information, verified participants and direct communication — giving both tenants and landlords greater confidence in every rental decision.</p></article>
          </div>
        </section>

        {/* VALUES */}
        <section id="our-values" className="border-y border-slate-100 bg-[#f8fafc] py-16 md:py-20" aria-labelledby="values-title">
          <div className={container}>
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><SectionLabel>What guides us</SectionLabel><h2 id="values-title" className={`${heading} mt-4`}>Our values.<br /><span className="text-slate-500">Visible in the experience.</span></h2></div><p className={`${bodyCopy} max-w-sm`}>The principles we want every listing, conversation and decision on LIVAREX to reflect.</p></div>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {values.map(({ title, description, icon: Icon }, index) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="text-xs font-semibold text-slate-400" aria-hidden="true">0{index + 1}</span></div><h3 className="mt-6 text-lg font-semibold leading-6 tracking-tight">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p></article>)}
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section id="verification" className="py-16 md:py-20" aria-labelledby="trust-title">
          <div className={`${container} grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20`}>
            <div><SectionLabel>Trust & verification</SectionLabel><h2 id="trust-title" className={`${heading} mt-4`}>We verify<br />before we connect.</h2><p className={`${bodyCopy} mt-5`}>Renting shouldn't begin with uncertainty. LIVAREX introduces verification before landlords and properties are presented to prospective tenants.</p><a href="#how-it-works" className={`mt-5 inline-flex min-h-11 items-center gap-3 rounded-md text-sm font-semibold text-blue-600 ${focus}`}>See the listing process <ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {pillars.map(({ title, description, icon: Icon }, index) => <article key={title} className={`flex gap-4 p-6 sm:p-7 ${index > 0 ? 'border-t border-slate-100' : ''}`}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><h3 className="text-lg font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{description}</p></div></article>)}
            </div>
          </div>
        </section>

        {/* BOTH AUDIENCES */}
        <section id="who-we-serve" className="bg-[#f5f8fd] py-16 md:py-20" aria-labelledby="audience-title">
          <div className={container}>
            <SectionLabel>Who we serve</SectionLabel><h2 id="audience-title" className={`${heading} mt-4`}>Two sides of a rental.<br /><span className="text-blue-600">One clearer connection.</span></h2>
            <div className="mt-9 grid gap-5 lg:grid-cols-2">
              <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Home className="h-6 w-6" aria-hidden="true" /></span><h3 className="mt-5 text-2xl font-semibold tracking-tight">For prospective tenants</h3><p className={`${bodyCopy} mt-3`}>Find reviewed property listings, understand the details and connect directly with approved landlords about a place that could be yours.</p><ul className="mt-6 space-y-4">{['Explore reviewed property listings', 'Connect directly with approved landlords', 'Ask questions before deciding', 'Tell us what you need through a property request'].map(item => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />{item}</li>)}</ul><div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-7"><Link href="/listings?type=rent" className={`inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-blue-600 ${focus}`}>Browse Properties <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link href="/property-request" className={`inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-slate-600 ${focus}`}>Request a property <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div></article>
              <article className="flex flex-col rounded-2xl border border-blue-100 bg-blue-50/50 p-6 sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white"><Building2 className="h-6 w-6" aria-hidden="true" /></span><h3 className="mt-5 text-2xl font-semibold tracking-tight">For landlords</h3><p className={`${bodyCopy} mt-3`}>Why list with LIVAREX?</p><p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-blue-700">Sign up for free <ArrowRight className="h-4 w-4" aria-hidden="true" /> Get verified</p><ul className="mt-6 space-y-4">{landlordBenefits.map(item => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />{item}</li>)}</ul><div className="mt-auto pt-7"><Link href="/landlord/register" className={`inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-blue-600 ${focus}`}>List Your Property <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></article>
            </div>
          </div>
        </section>

        

        {/* ONGOING ACCOUNTABILITY */}
        <section className="border-t border-slate-100 bg-slate-50 py-16 md:py-20" aria-labelledby="review-title">
          <div className={`${container} grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16`}>
            <div><SectionLabel>Ongoing review</SectionLabel><h2 id="review-title" className={`${heading} mt-4`}>Trust doesn't end<br />when a listing<br />goes live.</h2><p className={`${bodyCopy} mt-5`}>LIVAREX may continue reviewing listings after approval to help maintain accurate and reliable marketplace information.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">{ongoingReviewItems.map(({ title, description }, index) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-6"><span className="text-xs font-bold text-blue-600" aria-hidden="true">0{index + 1}</span><h3 className="mt-4 text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{description}</p></article>)}</div>
          </div>
        </section>
        <section className="relative overflow-hidden bg-blue-600 py-16 md:py-20 lg:py-24">
          <img
            src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80"
            alt="Modern residential apartment exterior at dusk"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,60,140,0.90),rgba(30,64,175,0.72),rgba(37,99,235,0.82))]" />

          <div className="relative mx-auto max-w-[1280px] px-5 text-center sm:px-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-100">READY TO GET STARTED?</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-5xl lg:text-6xl">
              List With Confidence. Rent With Greater Trust.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-blue-100 md:text-lg">
              Join a marketplace built around verification and direct landlord-to-tenant connections.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/landlord/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-blue-700 shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-50"
              >
                List Your Property
              </Link>
              <Link
                href="/listings?type=rent"
                className="inline-flex items-center justify-center rounded-2xl border border-blue-300 bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/5"
              >
                Browse Properties
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-blue-100">
              {["Verified listings", "Direct connections", "No unnecessary agent fees"].map((item) => (
                <div key={item} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

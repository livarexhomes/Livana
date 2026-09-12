import { useState, type KeyboardEvent } from 'react'
import { Link } from '@/lib/navigation'
import { ArrowRight, Building2, CheckCircle2, FileText, Home, MapPin, ShieldCheck, Sparkles, UserCheck, Users } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'
import SEO from '@/components/SEO'

const trustCards = [
  {
    title: 'Verified Identity',
    description: 'We establish who landlords are before they can complete the listing process.',
    icon: UserCheck,
  },
  {
    title: 'Reviewed Properties',
    description: 'Property listings go through defined LIVAREX review and verification checks.',
    icon: ShieldCheck,
  },
  {
    title: 'Direct Connections',
    description: 'Prospective tenants can connect directly with approved landlords.',
    icon: Users,
  },
]

const verificationSteps = [
  {
    id: 'identity',
    number: '01',
    title: 'Identity Verification',
    description:
      'Every landlord begins with identity verification. LIVAREX confirms essential identity information before a landlord can proceed through the listing process.',
    extraText:
      'We review the information supplied and confirm that it is sufficient to establish a real, accountable landlord profile.',
    checklist: ['Full legal name', 'Phone number', 'Government-issued identification such as NIN or driver\'s licence', 'Other information reasonably required to establish identity'],
    status: 'Identity Check Complete',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    image:
      'https://img.magnific.com/premium-photo/confidentagent-guidingdreamhome-professionalism_882186-26698.jpg',
    overlayTitle: 'Profile Verified',
    overlayText: 'Identity and account details are confirmed before listing.',
  },
  {
    id: 'ownership',
    number: '02',
    title: 'Ownership Verification & Listing Review',
    description:
      'Landlords provide information or documentation showing ownership or legal authority to list a property.',
    extraText:
      'Depending on the property and circumstances, LIVAREX may review relevant property, ownership or authorization documents before approving the listing.',
    checklist: ['Ownership / authority documentation', 'Property information', 'Listing details', 'Submitted images'],
    status: 'Ownership Review In Progress',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    image:
      'https://img.magnific.com/premium-photo/photo-cheerful-man-realtor-man-realtor-house-man-realtor-suit-man-realtor_474717-131571.jpg?w=900',
    overlayTitle: 'Document Review',
    overlayText: 'Property ownership and listing details are checked for accuracy.',
  },
  {
    id: 'property',
    number: '03',
    title: 'Property Verification',
    description:
      'Where applicable, LIVAREX may physically verify the property.',
    extraText:
      'We confirm that the property exists at the stated location and reasonably matches the listing information provided.',
    checklist: ['The property exists at the stated location', 'The property reasonably matches the listing', 'The property is available for rent', 'Images and descriptions reasonably represent the property'],
    status: 'Property Checked',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    image:
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    overlayTitle: 'Property Verified',
    overlayText: 'The listing is checked against the real property at the stated location.',
  },
  {
    id: 'cross-check',
    number: '04',
    title: 'Information Cross-Check',
    description:
      'We compare information supplied by the landlord with information gathered during verification.',
    extraText:
      'If significant inconsistencies are identified, the listing may be placed on hold until the issue is resolved.',
    checklist: ['Landlord information', 'LIVAREX review', 'Cross-check', 'Match or further review'],
    status: 'Cross-Check Review',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    image:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
    overlayTitle: 'Data Cross-Checked',
    overlayText: 'Details are compared and inconsistencies are flagged early.',
  },
  {
    id: 'approval',
    number: '05',
    title: 'Verification Approval',
    description:
      'Once the required checks have been completed successfully, the landlord and property may be approved for listing.',
    extraText:
      'A Verified badge communicates that the listing has passed LIVAREX\'s defined verification checks.',
    checklist: ['Verification completed', 'Approved listing status', 'Verified badge enabled', 'Ongoing monitoring'],
    status: 'Approved',
    badgeClass: 'bg-blue-600 text-white border-blue-600',
    image:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
    overlayTitle: 'LIVAREX Verified',
    overlayText: 'Approved listings can be presented with added confidence and trust.',
  },
]

const landlordSteps = [
  {
    number: '01',
    title: 'Identity Verified',
    description: 'Create your account and complete landlord verification.',
    icon: UserCheck,
  },
  {
    number: '02',
    title: 'Create Your Listing',
    description: 'Add photos, rent, location and property details.',
    icon: FileText,
  },
  {
    number: '03',
    title: 'LIVAREX Review',
    description: 'Your listing goes through the required review process.',
    icon: ShieldCheck,
  },
  {
    number: '04',
    title: 'Meet Prospective Tenants',
    description: 'Approved listings become visible to people searching.',
    icon: Users,
  },
  {
    number: '05',
    title: 'Complete the Rental',
    description: 'Proceed directly with the tenant, with LIVAREX support where applicable.',
    icon: Home,
  },
]

const benefits = [
  {
    title: 'Free to Start',
    description: 'List without an upfront listing fee.',
    icon: CheckCircle2,
  },
  {
    title: 'Direct',
    description: 'Speak with prospective tenants directly.',
    icon: Users,
  },
  {
    title: 'Verified',
    description: 'Build trust with your LIVAREX profile.',
    icon: ShieldCheck,
  },
  {
    title: 'No Agent Commission',
    description: 'Reduce unnecessary intermediary costs.',
    icon: FileText,
  },
  {
    title: 'Reach Active Seekers',
    description: 'Get discovered by people actively searching.',
    icon: MapPin,
  },
  {
    title: 'Manage Your Way',
    description: 'Keep control of your listing and rental process.',
    icon: Building2,
  },
]

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

export default function AboutPage() {
  const [activeStep, setActiveStep] = useState(0)

  const currentStep = verificationSteps[activeStep]

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const moveStep = (direction: number) => {
    setActiveStep((prev) => {
      const next = prev + direction
      return (next + verificationSteps.length) % verificationSteps.length
    })
  }

  const handleStepKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault()
      moveStep(1)
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault()
      moveStep(-1)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ scrollBehavior: 'smooth' }}>
      <SEO
        title="About LIVAREX — Nigeria's Verified Property Marketplace"
        description="Learn how LIVAREX verifies listings and connects prospective tenants directly with landlords through a transparent, trust-first marketplace."
        url="/about"
      />
      <PublicNavbar />

      <main>
        <section className="relative overflow-hidden bg-white pt-[88px]">
          <div className="absolute inset-x-0 top-0 h-px bg-slate-200" />
          <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-blue-100 blur-3xl" />
          <div className="absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-[#eff6ff] blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="mb-5 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  NIGERIA'S VERIFIED PROPERTY MARKETPLACE
                </p>

                <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-5xl md:text-6xl">
                  Find Property With More Confidence.
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                  LIVAREX connects prospective tenants with verified landlords and reviewed property listings — helping create a more transparent and direct rental experience.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/listings?type=rent"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    Explore Verified Properties
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => scrollToSection('verification')}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    How Verification Works
                  </button>
                </div>

                <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-600">
                  {['Verified Landlords', 'Reviewed Listings', 'Direct Connections'].map((item) => (
                    <div key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[2rem] border border-slate-200 bg-[#f7f9fc] p-3 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.32)]">
                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                    <div className="relative">
                      <img
                        src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80"
                        alt="Modern 2 bedroom apartment in Lekki"
                        className="h-64 w-full object-cover sm:h-72"
                      />
                      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 backdrop-blur-sm">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        VERIFIED
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-slate-950">Modern 2 Bedroom Apartment</h2>
                          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span>Lekki, Lagos</span>
                          </div>
                        </div>
                        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                          Verified Landlord
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {['Identity Verified ✓', 'Property Reviewed ✓', 'Listing Approved ✓'].map((item) => (
                          <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-700">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f9fc] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">TRUST & VERIFICATION</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">
                  We verify before we connect.
                </h2>
                <p className="mt-4 text-xl font-medium text-slate-700 md:text-2xl">
                  Renting shouldn't begin with uncertainty.
                </p>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                  LIVAREX introduces verification before landlords and properties are presented to prospective tenants.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    { title: 'Verified Identity', sentence: 'We confirm who the landlord is before a listing can move forward.', icon: UserCheck },
                    { title: 'Reviewed Properties', sentence: 'Every listing is checked for consistency, quality and marketplace readiness.', icon: ShieldCheck },
                    { title: 'Direct Connections', sentence: 'Prospective tenants can connect directly with approved landlords.', icon: Users },
                  ].map(({ title, sentence, icon: Icon }) => (
                    <div key={title} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-950">{title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{sentence}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.32)]">
                  <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
                    <img
                      src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
                      alt="Modern residential apartment exterior"
                      className="h-[28rem] w-full object-cover sm:h-[34rem]"
                    />

                    <div className="absolute inset-x-4 bottom-4 rounded-[1.5rem] border border-white/60 bg-white/90 p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Verified Listing</p>
                          <p className="mt-1 text-base font-extrabold text-slate-950">Modern 2 Bedroom Apartment</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </div>
                      </div>
                    </div>

                    <div className="absolute left-5 top-5 rounded-2xl border border-blue-200 bg-white/90 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Identity Verified</p>
                    </div>

                    <div className="absolute right-5 top-5 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Property Reviewed</p>
                    </div>

                    <div className="absolute bottom-24 right-5 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700">Approved Listing</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">TRUST PILLARS</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                A better way to build trust in property listings.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {trustCards.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-[1.75rem] border border-slate-200 bg-[#f8fafc] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-blue-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="h-10 w-16 rounded-full bg-gradient-to-r from-blue-100 to-slate-100" />
                  </div>

                  <h3 className="mt-5 text-xl font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="verification" className="bg-[#f8fafc] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">LIVAREX VERIFICATION</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                How LIVAREX Verifies Landlords & Properties
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Every landlord and property goes through defined verification steps before approval.
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div
                role="tablist"
                aria-label="Verification steps"
                onKeyDown={handleStepKeyDown}
                className="flex flex-col gap-3"
              >
                {verificationSteps.map((step, index) => (
                  <button
                    key={step.id}
                    id={`verification-tab-${step.id}`}
                    type="button"
                    role="tab"
                    aria-selected={activeStep === index}
                    aria-controls={`verification-panel-${step.id}`}
                    onClick={() => setActiveStep(index)}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                      activeStep === index
                        ? 'border-blue-200 bg-blue-50 shadow-[0_10px_24px_-18px_rgba(37,99,235,0.8)]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">
                      {step.number}
                    </span>
                    <span>
                      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Step</span>
                      <span className="mt-1 block text-sm font-bold text-slate-900">{step.title}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div
                role="tabpanel"
                id={`verification-panel-${currentStep.id}`}
                aria-labelledby={`verification-tab-${currentStep.id}`}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_14px_34px_-28px_rgba(15,23,42,0.35)]"
              >
                <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="relative border-b border-slate-200 bg-slate-100 lg:border-b-0 lg:border-r">
                    <img
                      src={currentStep.image}
                      alt={currentStep.title}
                      className="h-72 w-full object-cover sm:h-80 lg:h-full"
                    />

                    <div className={`absolute left-4 top-4 inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${currentStep.badgeClass}`}>
                      {currentStep.status}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 rounded-[1.25rem] border border-white/70 bg-white/90 p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {currentStep.overlayTitle}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{currentStep.overlayText}</p>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{currentStep.number}</p>
                        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 md:text-3xl">
                          {currentStep.title}
                        </h3>
                      </div>
                    </div>

                    <p className="mt-5 text-base leading-relaxed text-slate-600">{currentStep.description}</p>
                    {currentStep.extraText && (
                      <p className="mt-3 text-sm leading-relaxed text-slate-500">{currentStep.extraText}</p>
                    )}

                    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                      {currentStep.checklist.map((item) => (
                        <li key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#eff6ff] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">WHAT VERIFIED MEANS</p>
                  <div className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    LIVAREX VERIFIED
                  </div>
                </div>

                <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                  What Does 'Verified' Mean?
                </h2>

                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  A Verified badge means the landlord or listing has successfully completed LIVAREX's defined verification checks.
                </p>

                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Verification increases transparency but should not be interpreted as an absolute guarantee of a landlord, property or transaction.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.32)]">
                <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80"
                    alt="Premium verified property listing card"
                    className="h-[22rem] w-full object-cover sm:h-[26rem]"
                  />

                  <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
                    <div className="rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 backdrop-blur-sm">
                      Verified
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700 backdrop-blur-sm">
                      Approved Landlord
                    </div>
                  </div>

                  <div className="absolute inset-x-4 bottom-4 rounded-[1.5rem] border border-white/70 bg-white/90 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Property Profile</p>
                        <p className="mt-1 text-base font-extrabold text-slate-950">Premium Apartment Listing</p>
                      </div>
                      <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                        Trusted
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">FOR LANDLORDS</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                From Sign-Up to Tenant — Five Simple Steps
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Create your account, verify your identity, list your property and connect directly with prospective tenants.
              </p>
            </div>

            <div className="mt-12 rounded-[2rem] border border-slate-200 bg-[#f8fafc] p-5 sm:p-6 lg:p-8">
              <div className="relative hidden lg:block">
                <div className="absolute left-10 right-10 top-7 h-px bg-slate-200" />
                <div className="grid gap-4 lg:grid-cols-5">
                  {landlordSteps.map((step) => {
                    const Icon = step.icon

                    return (
                      <div key={step.title} className="relative">
                        <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-white text-sm font-black text-blue-700">
                          {step.number}
                        </div>

                        <div className="mt-5 flex flex-col items-center text-center">
                          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Icon className="h-4 w-4" />
                          </div>
                          <h3 className="text-lg font-extrabold tracking-[-0.02em] text-slate-950">{step.title}</h3>
                          <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-slate-600">{step.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-4 lg:hidden">
                {landlordSteps.map((step) => {
                  const Icon = step.icon

                  return (
                    <div key={step.title} className="relative pl-10">
                      <div className="absolute bottom-0 left-0 top-0 w-px bg-slate-200" />
                      <div className="absolute left-[-0.15rem] top-5 h-3 w-3 rounded-full border border-blue-200 bg-blue-600" />

                      <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{step.number}</div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Icon className="h-4 w-4" />
                          </div>
                        </div>

                        <h3 className="mt-3 text-base font-extrabold text-slate-950">{step.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-16 md:py-20 lg:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="max-w-xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600">FOR LANDLORDS</p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
                  More Control. Fewer Middlemen.
                </h2>

                <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">
                  List your property, build trust through verification and connect directly with prospective tenants.
                </p>

                <div className="mt-6 inline-flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
                  <span>Sign up free</span>
                  <span className="text-slate-300">→</span>
                  <span>Get verified</span>
                  <span className="text-slate-300">→</span>
                  <span>Start listing</span>
                </div>

                <div className="mt-8">
                  <Link
                    href="/landlord/register"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-500"
                  >
                    List Your Property
                  </Link>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  {benefits.map((benefit) => {
                    const Icon = benefit.icon

                    return (
                      <div key={benefit.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-700 ring-1 ring-slate-200">
                            <Icon className="h-4 w-4" />
                          </div>

                          <div>
                            <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-900">
                              {benefit.title}
                            </h3>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">{benefit.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 p-2 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.4)]">
                  <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
                    <img
                      src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
                      alt="Modern residential property"
                      className="h-[22rem] w-full object-cover sm:h-[26rem] lg:h-[30rem]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-slate-950/5 to-transparent" />

                    <div className="absolute left-5 top-5 rounded-xl border border-white/80 bg-white/90 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Verified Landlord</p>
                    </div>

                    <div className="absolute right-5 top-5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Property Approved</p>
                    </div>

                    <div className="absolute bottom-5 left-5 rounded-xl border border-white/80 bg-white/90 px-3 py-2 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        Direct Tenant Connection
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                      <img
                        src="https://d101qgvxw5fp3p.cloudfront.net/site/99009331/assets/uploads/pageuploads/20191121093252-FemaleAgentSmilesOverHerShoulderWithBuyersInBackground.jpg"
                        alt="African female realtor smiling with buyers in a modern property setting"
                        className="h-28 w-full object-cover"
                      />
                    </div>
                    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                      <img
                        src="https://img.magnific.com/premium-photo/smiling-realtor-stands-front-beautiful-blue-house_14117-741147.jpg"
                        alt="African male realtor standing in front of a modern home"
                        className="h-28 w-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f9ff] py-16 md:py-20 lg:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="relative">
                <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.4)]">
                  <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
                    <img
                      src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80"
                      alt="Landlord and tenant reviewing a property"
                      className="h-[22rem] w-full object-cover sm:h-[26rem] lg:h-[30rem]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />

                    <div className="absolute left-4 top-4 rounded-xl border border-white/80 bg-white/90 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Property Review</p>
                    </div>

                    <div className="absolute right-4 top-4 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700">Trust & Safety</p>
                    </div>

                    <div className="absolute inset-x-4 bottom-4 rounded-[1.25rem] border border-white/70 bg-white/90 p-3 backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Listing Monitoring</p>
                          <p className="mt-1 text-base font-extrabold text-slate-950">Live review and quality checks</p>
                        </div>
                        <div className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                          Active
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 left-5 w-[42%] overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
                  <img
                    src="https://img.magnific.com/premium-photo/confidentagent-guidingdreamhome-professionalism_882186-26698.jpg"
                    alt="African male realtor guiding a home buying discussion"
                    className="h-24 w-full rounded-[0.85rem] object-cover"
                  />
                </div>

                <div className="absolute -right-2 top-10 w-[38%] overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
                  <img
                    src="https://d101qgvxw5fp3p.cloudfront.net/site/99009331/assets/uploads/pageuploads/20191121093252-FemaleAgentSmilesOverHerShoulderWithBuyersInBackground.jpg"
                    alt="African female realtor smiling with buyers in a modern property setting"
                    className="h-24 w-full rounded-[0.85rem] object-cover"
                  />
                </div>
              </div>

              <div className="max-w-xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600">ONGOING REVIEW</p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
                  Trust Doesn't End When a Listing Goes Live.
                </h2>
                <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">
                  LIVAREX may continue reviewing listings after approval to help maintain accurate and reliable marketplace information.
                </p>

                <div className="mt-8 relative pl-6">
                  <div className="absolute bottom-0 left-[0.6rem] top-0 w-px bg-slate-200" />

                  <div className="space-y-6">
                    {ongoingReviewItems.map((item, index) => (
                      <div key={item.title} className="relative pl-7">
                        <div className="absolute left-[-0.15rem] top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-[11px] font-black text-blue-700 ring-4 ring-[#f5f9ff]">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-950">{item.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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

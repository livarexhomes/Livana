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
    status: 'Documents Reviewed → Information Validated → Proceed',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
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
    status: 'Property Check Applied',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
    status: 'Cross-Check in Progress',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
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
    status: 'LIVAREX VERIFIED',
    badgeClass: 'bg-blue-600 text-white border-blue-600',
  },
]

const landlordSteps = [
  {
    title: 'Sign Up & Verify Your Identity',
    description:
      'Create your LIVAREX landlord account for free. Every landlord starts with verification. We confirm who you are before your property can appear on LIVAREX.',
  },
  {
    title: 'Create Your Property Listing',
    description:
      'Add your property\'s details, photos, location, rent and available features.',
  },
  {
    title: 'Property Review & Approval',
    description:
      'LIVAREX reviews the submitted property information and carries out the required verification checks before the listing goes live.',
  },
  {
    title: 'Connect Directly With Tenants',
    description:
      'Your approved property becomes visible to prospective tenants who can contact you through LIVAREX.',
  },
  {
    title: 'Complete the Rental',
    description:
      'You and the prospective tenant proceed directly, with LIVAREX providing the marketplace and transaction support where applicable.',
  },
]

const benefits = [
  {
    title: 'List for Free',
    description: 'List your property on LIVAREX without an upfront listing fee.',
  },
  {
    title: 'Reach Genuine Tenants',
    description: 'Put your property in front of prospective tenants actively searching.',
  },
  {
    title: 'Verified Profile',
    description: 'Build greater trust through your verified landlord profile.',
  },
  {
    title: 'Direct Connection',
    description: 'Connect directly with prospective tenants.',
  },
  {
    title: 'No Agent Commission',
    description: 'Reduce unnecessary agent involvement and commission.',
  },
  {
    title: 'Manage Your Property',
    description: 'Stay in control of your property and rental process.',
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
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">We verify before we connect.</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                Renting shouldn't begin with uncertainty.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                LIVAREX introduces verification before landlords and properties are presented to prospective tenants.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {trustCards.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.25)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="verification" className="py-16 md:py-20">
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
                className="rounded-[2rem] border border-slate-200 bg-[#f7f9fc] p-6 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.35)] sm:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{currentStep.number}</p>
                    <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 md:text-3xl">
                      {currentStep.title}
                    </h3>
                  </div>

                  <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${currentStep.badgeClass}`}>
                    {currentStep.status}
                  </div>
                </div>

                <p className="mt-5 text-base leading-relaxed text-slate-600">{currentStep.description}</p>
                {currentStep.extraText && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">{currentStep.extraText}</p>
                )}

                {currentStep.id === 'identity' && (
                  <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
                    Identity Check Complete
                  </div>
                )}

                {currentStep.id === 'ownership' && (
                  <div className="mt-8">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {['Documents Reviewed', 'Information Validated', 'Proceed'].map((label, index) => (
                        <div
                          key={label}
                          className={`rounded-2xl border p-4 text-center text-sm font-bold ${
                            index === 0
                              ? 'border-violet-200 bg-violet-50 text-violet-700'
                              : index === 1
                                ? 'border-slate-200 bg-white text-slate-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep.id === 'property' && (
                  <div className="mt-8 grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
                    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                      <img
                        src="https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80"
                        alt="Property verification review"
                        className="h-56 w-full object-cover"
                      />
                    </div>

                    <div className="flex items-center justify-center rounded-[1.5rem] border border-dashed border-blue-200 bg-blue-50 p-6">
                      <div className="text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                          <MapPin className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="mt-4 text-sm font-bold uppercase tracking-[0.14em] text-blue-700">Property Verified</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          LIVAREX can confirm the property exists at the stated location and is reasonably represented in the listing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep.id === 'cross-check' && (
                  <div className="mt-8 grid gap-4 md:grid-cols-5">
                    {['Landlord Information', 'LIVAREX Review', 'Cross-Check', 'Match', 'Further Review'].map((label, index) => (
                      <div
                        key={label}
                        className={`rounded-2xl border p-4 text-center text-xs font-bold uppercase tracking-[0.12em] ${
                          index === 0
                            ? 'border-slate-200 bg-white text-slate-700'
                            : index === 1
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : index === 2
                                ? 'border-violet-200 bg-violet-50 text-violet-700'
                                : index === 3
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                )}

                {currentStep.id === 'approval' && (
                  <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                        LIVAREX VERIFIED
                      </div>
                      <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                        A Verified badge communicates that the listing has passed LIVAREX's defined verification checks.
                      </p>
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
                        Verification improves transparency but does not constitute an absolute guarantee of a landlord, property or transaction.
                      </div>
                    </div>
                  </div>
                )}

                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {currentStep.checklist.map((item) => (
                    <li key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#eff6ff] py-16 md:py-20">
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">WHAT VERIFIED MEANS</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
              What Does 'Verified' Mean?
            </h2>

            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-blue-600/20">
                LIVAREX VERIFIED
              </div>
            </div>

            <p className="mt-6 text-base leading-relaxed text-slate-600">
              A Verified badge means the landlord or listing has successfully completed LIVAREX's defined verification checks.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Verification increases transparency but should not be interpreted as an absolute guarantee of a landlord, property or transaction.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">FOR LANDLORDS</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                List Your Property in Five Simple Steps
              </h2>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-5">
              {landlordSteps.map((step, index) => (
                <div key={step.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">0{index + 1}</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f9fc] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">FOR LANDLORDS</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                Your Property. Your Tenants. Your Control.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">Sign up free → Get verified → Start listing</p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)]">
                  <h3 className="text-xl font-extrabold text-slate-950">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{benefit.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/landlord/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500"
              >
                List Your Property — Free
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('verification')}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Learn About Verification
              </button>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                Verification Doesn't Stop After Approval.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                LIVAREX may continue reviewing listings even after they go live.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {ongoingReviewItems.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)]">
                  <h3 className="text-lg font-extrabold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-blue-600 py-16 md:py-20">
          <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
            <h2 className="text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
              Property Discovery Should Start With Trust.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-blue-100 md:text-lg">
              Join a marketplace designed around verified listings and direct landlord-to-tenant connections.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/listings?type=rent"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-blue-700 shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-50"
              >
                Find a Property
              </Link>
              <Link
                href="/landlord/register"
                className="inline-flex items-center justify-center rounded-2xl border border-blue-300 bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-500/80"
              >
                List Your Property
              </Link>
            </div>

            <p className="mt-6 text-sm font-medium text-blue-100">
              Verified listings • Direct landlord connections • No unnecessary agent fees
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

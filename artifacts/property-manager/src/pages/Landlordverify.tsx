import * as React from 'react'
import { Link } from '@/lib/navigation'
import { ArrowRight, ArrowUpRight, BadgeCheck, Building2, Check, CheckCircle2, ChevronDown, HousePlus, MapPin, MessageSquare, SearchCheck, ShieldCheck, Users, Handshake, CircleDollarSign, SlidersHorizontal } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'
import SEO from '@/components/SEO'
import './Landlordverify.css'

// Drop-in replacement for pages/Landlordverify.tsx. No additional packages required.
const propertyImage = "/landlordver.png"
const steps = [
    { title: "Sign up & verify your identity", description: "Create your LIVAREX landlord account for free, every landlord starts with verification. We confirm who you are before your property can appear on LIVAREX.", icon: ShieldCheck },
    { title: "Create your property listing", description: "Add your property's details, photos, location, rent and available features.", icon: HousePlus },
    { title: "Property review & approval", description: "LIVAREX reviews the submitted property information and verifies the listing before it goes live.", icon: SearchCheck },
    { title: "Connect directly with tenants", description: "Your approved property is shown to prospective tenants, who can contact you through LIVAREX.", icon: Users },
    { title: "Complete the rental", description: "You and the tenant proceed directly, with LIVAREX providing the platform and transaction support where applicable.", icon: Handshake },
]
const benefits = [
    { title: "Meet genuine tenants", description: "Connect with tenants who have been verified, so you know you're talking to real people looking for a real home.", badge: "Verified tenants", icon: Users },
    { title: "List without any fee", description: "There are no costs to list your property on LIVAREX. Create your listing and reach prospective tenants at no charge.", badge: "Free listing", icon: CircleDollarSign },
    { title: "No middle man", description: "Communicate directly with tenants through our platform. No intermediaries, just you and the tenant.", badge: "Direct contact", icon: Handshake },
    { title: "Get a verified badge", description: "Stand out with a verified badge that shows tenants your identity and property have been checked.", badge: "Trusted profile", icon: ShieldCheck },
    { title: "Your property, your rule", description: "You decide who to rent to, at what price, and on what terms. You're in full control of your property.", badge: "Full control", icon: SlidersHorizontal },
]
const verificationSteps = [
    {
        id: 'signup',
        number: '01',
        title: 'Sign up & verify your identity',
        description:
            'Create your LIVAREX landlord account for free, every landlord starts with verification. We confirm who you are before your property can appear on LIVAREX.',
    },
    {
        id: 'listing',
        number: '02',
        title: 'Create your property listing',
        description:
            "Add your property's details, photos, location, rent and available features.",
    },
    {
        id: 'review',
        number: '03',
        title: 'Property review & approval',
        description:
            'LIVAREX reviews the submitted property information and verifies the listing before it goes live.',
    },
    {
        id: 'connect',
        number: '04',
        title: 'Connect directly with tenants',
        description:
            'Your approved property is shown to prospective tenants, who can contact you through LIVAREX.',
    },
    {
        id: 'rental',
        number: '05',
        title: 'Complete the rental',
        description:
            'You and the tenant proceed directly, with LIVAREX providing the platform and transaction support where applicable.',
    },
]

const landlordVerificationProcess = [
  { title: "Account Registration", badge: "Required", description: "Landlords create a verified account with a valid email address and Nigerian phone number. OTP verification confirms the phone immediately.", icon: Users },
  { title: "Government ID Submission", badge: "Required", description: "Every landlord must upload a clear photo of one government-issued ID: NIN slip, international passport, driver's license, or voter's card.", icon: ShieldCheck },
  { title: "Manual Document Review", badge: "24–48 hrs", description: "Our verification team reviews every submission within 24–48 hours. We cross-check the ID details, confirm identity, and check against our fraud database.", icon: SearchCheck },
  { title: "Property Ownership Verification", badge: "Per listing", description: "For each listing, we review proof of ownership or legal authority to let (title deed, C of O, allocation letter, or estate agent authority). Landlords listing without proof are declined.", icon: HousePlus },
  { title: "Verified Badge Awarded", badge: "Ongoing", description: "Approved landlords receive the ✅ Verified badge on their profile and all their listings. This badge tells tenants: \"This person is real, their identity is confirmed, and their property claim has been checked.\"", icon: BadgeCheck },
]

const benefitIcons = [HousePlus, Users, BadgeCheck, Handshake, CircleDollarSign, SlidersHorizontal]

const faqs = [
    { q: 'Is it free to list my property?', a: 'Yes. Listing your property on LIVAREX is free. There is no listing fee. Your property will go through our verification and review process before it is published.' },
    { q: 'Why do I need landlord verification?', a: 'Identity verification helps establish a more trustworthy landlord profile. Complete the required verification and property review before your listing can be published.' },
    { q: 'Does my property go live immediately?', a: 'Your property becomes visible to prospective tenants once the required review and approval process is complete.' },
    { q: 'Do I still make the final rental decision?', a: 'Yes. You remain involved in the final rental process and make your own property decisions. LIVAREX provides platform support where applicable.' },
]

const container = 'mx-auto max-w-7xl px-5 sm:px-8'
const eyebrow = 'text-[10px] font-bold uppercase tracking-[0.15em] leading-relaxed text-blue-600'
const heading = 'text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl'
const bodyCopy = 'text-sm leading-7 text-slate-600 md:text-base'


function StartLink({ children = 'List your property', light = false }: { children?: React.ReactNode; light?: boolean }) {
    return <Link href="/landlord/register" className={`lv-button ${light ? 'lv-button-white' : 'lv-button-primary'}`}>{children}<ArrowUpRight size={18} aria-hidden="true" /></Link>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className={eyebrow}>{children}</p>
}

function ProcessGuide() {
    return (
        <ol className="lv-process-cards">
            {steps.map(({ title, description, icon: Icon }, index) => (
                <li className="lv-process-card" key={title}>
                    <div className="lv-process-card-top">
                        <span className="lv-icon"><Icon size={23} aria-hidden="true" /></span>
                        <span className="lv-process-index">0{index + 1}</span>
                    </div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                </li>
            ))}
        </ol>
    )
}

export default function LandlordVerify() {
    return <div className="lv-page selection:bg-blue-100 selection:text-blue-950">
        <SEO title="List Your Property on LIVAREX" description="List your property for free, complete landlord verification and connect directly with prospective tenants on LIVAREX." url="/landlord" />
        <PublicNavbar />
        <main className="lv-main">
            <section className="lv-hero" aria-labelledby="lv-hero-title">
                <div className="lv-container lv-hero-grid">
                    <div className="lv-hero-copy">
                        <div className="lv-pill"><span />A better way to be a landlord</div>
                        <h1 id="lv-hero-title">Your property.<br />Your next tenant.<br /><em>Your terms.</em></h1>
                        <p className="lv-hero-description">A simpler way to list, get verified and connect directly with prospective tenants. All while keeping you in control.</p>
                        <div className="lv-actions"><StartLink /><a className="lv-text-link" href="#how-it-works">See how it works<ArrowRight size={17} aria-hidden="true" /></a></div>
                        <div className="lv-hero-assurance"><span><Check size={15} aria-hidden="true" />Free to list</span><span><Check size={15} aria-hidden="true" />Direct tenant contact</span></div>
                    </div>
                    <figure className="lv-property-figure">
                        <div className="lv-property-card">
                            <div className="lv-card-heading"><span><Building2 size={17} aria-hidden="true" />Your next chapter starts here</span><span className="lv-caption">LISTING PREVIEW</span></div>
                            <div className="lv-property-photo"><img src={propertyImage} alt="Contemporary white home with a landscaped outdoor space" width={700} height={620} fetchPriority="high" /><div className="lv-photo-shade" /><span className="lv-photo-tag"><ShieldCheck size={14} aria-hidden="true" />Made for property owners</span><div className="lv-photo-caption"><span>A SPACE WORTH DISCOVERING</span><h2>Make room for<br />your next tenant.</h2></div></div>
                            <div className="lv-property-info"><div><h3>Your property could be next</h3><span><MapPin size={14} aria-hidden="true" />Bring your location into the picture</span></div><span className="lv-property-arrow"><ArrowUpRight size={22} aria-hidden="true" /></span></div>
                        </div>
                        <div className="lv-floating-note"><span className="lv-note-icon"><BadgeCheck size={23} aria-hidden="true" /></span><div><strong>Build trust from day one</strong><span>Start with landlord verification</span></div></div>
                        <figcaption>Illustrative property preview</figcaption>
                    </figure>
                </div>
            </section>
             <section id="how-it-works" className="lv-section lv-container" aria-labelledby="lv-process-title">
                <div className="lv-section-heading"><h2 id="lv-process-title">How It Works</h2></div>
                <ProcessGuide />
            </section>
            <div className="lv-principles"><div className="lv-container lv-principles-grid"><p>Less friction.<br /><strong>More ownership.</strong></p><span><HousePlus aria-hidden="true" />Zero listing fee</span><span><ShieldCheck aria-hidden="true" />Verification before publication</span><span><MessageSquare aria-hidden="true" />Direct conversations</span></div></div>
            <section id="why-list-with-us" className="lv-benefits-section" aria-labelledby="lv-benefits-title">
                <div className="lv-container lv-section">
                    <div className="lv-value-heading">
                        <h2 id="lv-benefits-title">Why list with <span>LIVAREX?</span></h2>
                    </div>
                    <ol className="lv-benefits-list">
                        {benefits.map(({ title, description, badge, icon: Icon }, index) => (
                            <li key={title} className="lv-benefits-step">
                                <span className="lv-benefits-number">{index + 1}</span>
                                <div className="lv-benefits-card">
                                    <div className="lv-benefits-step-heading">
                                        <span className="lv-benefits-icon"><Icon size={22} aria-hidden="true" /></span>
                                        <h3>{title}</h3>
                                        <span className="lv-benefits-badge">{badge}</span>
                                    </div>
                                    <p>{description}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
            {/* Verification Process Section */}
            <section id="verification-process" className="lv-verification-process-section" aria-labelledby="lv-verification-title">
                <div className="lv-container">
                    <div className="lv-verification-intro">
                        <h2 id="lv-verification-title">How LIVAREX <span>Verifies Landlords</span></h2>
                        <p>Trust is at the heart of LIVAREX. Every landlord on LIVAREX goes through an identity verification process, while each property is reviewed before a listing goes live.</p>
                    </div>
                    <div className="lv-verification-grid">
                        <div className="lv-verification-card">
                            <div className="lv-verification-card-head">
                                <span className="lv-verification-card-icon">
                                    <Users size={20} aria-hidden="true" />
                                </span>
                                <span className="lv-verification-card-num">01</span>
                            </div>
                            <h4>Account Registration</h4>
                            <span className="lv-verification-card-badge">Required</span>
                            <p>Create a verified account with a valid email and Nigerian phone number. OTP verification confirms your phone immediately.</p>
                        </div>
                        <div className="lv-verification-card">
                            <div className="lv-verification-card-head">
                                <span className="lv-verification-card-icon">
                                    <ShieldCheck size={20} aria-hidden="true" />
                                </span>
                                <span className="lv-verification-card-num">02</span>
                            </div>
                            <h4>Government ID Submission</h4>
                            <span className="lv-verification-card-badge">Required</span>
                            <p>Upload a clear photo of your government-issued ID: NIN slip, passport, driver's license, or voter's card.</p>
                        </div>
                        <div className="lv-verification-card">
                            <div className="lv-verification-card-head">
                                <span className="lv-verification-card-icon">
                                    <SearchCheck size={20} aria-hidden="true" />
                                </span>
                                <span className="lv-verification-card-num">03</span>
                            </div>
                            <h4>Manual Document Review</h4>
                            <span className="lv-verification-card-badge">24–48 hrs</span>
                            <p>Our team reviews every submission within 24–48 hours, cross-checking ID details and screening against fraud databases.</p>
                        </div>
                        <div className="lv-verification-card">
                            <div className="lv-verification-card-head">
                                <span className="lv-verification-card-icon">
                                    <HousePlus size={20} aria-hidden="true" />
                                </span>
                                <span className="lv-verification-card-num">04</span>
                            </div>
                            <h4>Property Ownership Verification</h4>
                            <span className="lv-verification-card-badge">Per listing</span>
                            <p>For each property, we review documents showing ownership or legal authority to let the property. Listings are only approved when the required documentation meets our verification requirements.</p>
                        </div>
                        <div className="lv-verification-card lv-verification-card-featured">
                            <div className="lv-verification-card-head">
                                <span className="lv-verification-card-icon">
                                    <BadgeCheck size={20} aria-hidden="true" />
                                </span>
                                <span className="lv-verification-card-num">05</span>
                            </div>
                            <h4>Verified Badge Awarded</h4>
                            <span className="lv-verification-card-badge">Ongoing</span>
                            <p>Approved landlords receive the ✅ Verified badge on their profile and all listings, confirming their identity and property claim.</p>
                        </div>
                    </div>
                </div>
            </section>

           
            <section className="lv-container lv-section lv-control" aria-labelledby="lv-control-title"><div><span className="lv-eyebrow">CLARITY AT EVERY STAGE</span><h2 id="lv-control-title">A clear path.<br /><span>No guessing what’s next.</span></h2><p className="lv-body-copy">From identity verification to an approved listing, each stage has a purpose. You stay involved in the decisions that matter.</p><a className="lv-text-link" href="#how-it-works">Explore the listing process<ArrowRight size={17} aria-hidden="true" /></a></div><div className="lv-timeline-card"><div className="lv-timeline-heading"><span className="lv-icon"><Building2 size={21} aria-hidden="true" /></span><div><h3>Your listing journey</h3><p>An example of the path to publication</p></div></div><ol>{[{ title: 'Identity verification', text: 'Establish your landlord profile', icon: ShieldCheck }, { title: 'Property submission', text: 'Share the details that tenants need', icon: HousePlus }, { title: 'LIVAREX review', text: 'Complete the required approval process', icon: SearchCheck }, { title: 'Ready to be discovered', text: 'Approved listings become visible to tenants', icon: Users }].map(({ title, text, icon: Icon }, index) => <li key={title}><span className="lv-timeline-icon"><Icon size={19} aria-hidden="true" /></span><div><h4>{title}</h4><p>{text}</p></div><span className="lv-caption">0{index + 1}</span></li>)}</ol></div></section>
            {/* ONE PROCESS SECTION; NO TABS OR DUPLICATE IDS ooo*/}
            {/* <section id="signup-to-rental" className="py-16 md:py-20" aria-labelledby="process-title">
                <div className={container}>
                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><SectionLabel>From signup to rental</SectionLabel><h2 id="process-title" className={`${heading} mt-4`}>How It Works</h2></div><p className={`${bodyCopy} max-w-sm`}>A defined process for landlords, with verification before a property goes live.</p></div>
                    <ol className="mt-8 divide-y divide-slate-100 border-y border-slate-200">
                        {verificationSteps.map(step => <li key={step.id} className="grid gap-3 py-6 sm:grid-cols-[50px_1fr] sm:gap-5 lg:grid-cols-[50px_0.8fr_1.2fr]"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-blue-600">{step.number}</span><h3 className="text-lg font-semibold leading-7 tracking-tight sm:pt-1">{step.title}</h3><p className={`${bodyCopy} sm:col-start-2 lg:col-start-auto`}>{step.description}</p></li>)}
                    </ol>
                </div>
            </section> */}
            <section className="lv-container lv-faq-section" aria-labelledby="lv-faq-title"><div><span className="lv-eyebrow">A LITTLE MORE CLARITY</span><h2 id="lv-faq-title">Before you<br /><span>get started.</span></h2></div><div className="lv-faq-list">{faqs.map(({ q, a }) => <details key={q}><summary>{q}<ChevronDown size={19} aria-hidden="true" /></summary><p>{a}</p></details>)}</div></section>
            <section className="lv-container lv-cta-wrap" aria-labelledby="lv-cta-title"><div className="lv-cta"><div><span className="lv-eyebrow">YOUR PROPERTY. YOUR POSSIBILITIES.</span><h2 id="lv-cta-title">Your next tenant starts<br />with your first listing.</h2><p>Take the first step. We’ll guide you through the process.</p></div><div className="lv-cta-action"><StartLink light /><span>Zero listing fee.</span></div></div></section>
        </main>
        <Footer />
    </div>
}

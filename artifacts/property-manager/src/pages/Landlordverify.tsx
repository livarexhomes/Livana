import * as React from 'react'
import { Link } from '@/lib/navigation'
import { ArrowRight, ArrowUpRight, BadgeCheck, Building2, Check, ChevronDown, HousePlus, MapPin, MessageSquare, SearchCheck, ShieldCheck, Users, Handshake, CircleDollarSign, SlidersHorizontal } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'
import SEO from '@/components/SEO'

// Drop-in replacement for pages/Landlordverify.tsx. No additional packages required.
const propertyImage = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80'
const steps = [
    { title: "Sign up & verify your identity", description: "Create your LIVAREX landlord account for free, every landlord starts with verification. We confirm who you are before your property can appear on LIVAREX.", icon: ShieldCheck },
    { title: "Create your property listing", description: "Add your property's details, photos, location, rent and available features.", icon: HousePlus },
    { title: "Property review & approval", description: "LIVAREX reviews the submitted property information and verifies the listing before it goes live.", icon: SearchCheck },
    { title: "Connect directly with tenants", description: "Your approved property is shown to prospective tenants, who can contact you through LIVAREX.", icon: Users },
    { title: "Complete the rental", description: "You and the tenant proceed directly, with LIVAREX providing the platform and transaction support where applicable.", icon: Handshake },
]
const benefits = [
    "List your property free",
    "Reach genuine prospective tenants",
    "Verified landlord profile",
    "No agents involved",
    "No agent commission",
    "Manage your property your way"
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
  { title: "Property Ownership Confirmation", badge: "Per listing", description: "For each listing, we review proof of ownership or legal authority to let (title deed, C of O, allocation letter, or estate agent authority). Landlords listing without proof are declined.", icon: HousePlus },
  { title: "Verified Badge Awarded", badge: "Ongoing", description: "Approved landlords receive the ✅ Verified badge on their profile and all their listings. This badge tells tenants: \"This person is real, their identity is confirmed, and their property claim has been checked.\"", icon: BadgeCheck },
]

const benefitIcons = [HousePlus, Users, BadgeCheck, Handshake, CircleDollarSign, SlidersHorizontal]

const faqs = [
    { q: 'Is it free to list my property?', a: 'You can create a property listing without an upfront listing fee. Free listing refers to publishing your property; review any applicable service terms before completing a rental.' },
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
    return <div className="lv-page">
        <SEO title="List Your Property on LIVAREX" description="List your property for free, complete landlord verification and connect directly with prospective tenants on LIVAREX." url="/landlord" />
        <PublicNavbar />
        <style>{styles}</style>
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
            <div className="lv-principles"><div className="lv-container lv-principles-grid"><p>Less friction.<br /><strong>More ownership.</strong></p><span><HousePlus aria-hidden="true" />Zero listing fee</span><span><ShieldCheck aria-hidden="true" />Verification before publication</span><span><MessageSquare aria-hidden="true" />Direct conversations</span></div></div>
            <section id="how-it-works" className="lv-section lv-container" aria-labelledby="lv-process-title">
                <div className="lv-section-heading"><h2 id="lv-process-title">How It Works</h2></div>
                <ProcessGuide />
            </section>
            <section id="why-list-with-us" className="lv-benefits-section" aria-labelledby="lv-benefits-title">
                <div className="lv-container lv-section">
                    <div className="lv-value-heading">
                        <h2 id="lv-benefits-title">Why list with <span>LIVAREX?</span></h2>
                    </div>
                    <ol className="lv-verification-list">
                        {landlordVerificationProcess.map(({ title, badge, description, icon: Icon }, index) => (
                            <li key={title} className="lv-verification-step">
                                <span className="lv-verification-number">{index + 1}</span>
                                <div className="lv-verification-card">
                                    <div className="lv-verification-step-heading">
                                        <span className="lv-verification-icon"><Icon size={22} aria-hidden="true" /></span>
                                        <h3>{title}</h3>
                                        <span className="lv-verification-badge">{badge}</span>
                                    </div>
                                    <p>{description}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
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

const styles = `
.lv-page{background:#fff;color:#142039}.lv-main{--lv-blue:#2563eb;--lv-ink:#142039;--lv-muted:#607087;font-family:inherit;overflow:hidden}.lv-main *{box-sizing:border-box}.lv-main h1,.lv-main h2,.lv-main h3,.lv-main h4,.lv-main p,.lv-main figure{margin:0}.lv-main a{text-decoration:none}.lv-main button{font:inherit;cursor:pointer}.lv-main svg{flex-shrink:0}.lv-main a:focus-visible,.lv-main button:focus-visible,.lv-main summary:focus-visible{outline:3px solid #2563eb;outline-offset:5px}.lv-container{width:calc(100% - 64px);max-width:1184px;margin-inline:auto}.lv-hero{background:radial-gradient(ellipse at 85% 15%,#eff5ff,transparent 55%);padding:72px 0 55px}.lv-hero-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:64px;align-items:center}.lv-pill{display:inline-flex;align-items:center;gap:9px;border:1px solid #dce7fa;border-radius:99px;background:#f4f8ff;padding:8px 13px;font-size:12px;font-weight:600;color:#315892}.lv-pill>span{width:6px;height:6px;border-radius:100%;background:var(--lv-blue)}.lv-main h1{font-size:clamp(42px,4.6vw,65px);font-weight:650;line-height:1.08;letter-spacing:-.052em;margin-top:25px}.lv-main h1 em{color:var(--lv-blue);font-style:normal}.lv-hero-description{max-width:430px;font-size:16px;line-height:1.85;color:var(--lv-muted);margin-top:24px!important}.lv-actions{display:flex;align-items:center;flex-wrap:wrap;gap:24px;margin-top:30px}.lv-button{display:inline-flex;justify-content:center;align-items:center;gap:22px;min-height:49px;padding:14px 20px;border-radius:9px;font-size:14px;font-weight:650;transition:background .2s,box-shadow .2s}.lv-button-primary{background:var(--lv-blue);color:white;box-shadow:0 6px 16px #2563eb20}.lv-button-primary:hover{background:#1d4ed8;box-shadow:0 8px 24px #2563eb35}.lv-button-white{color:#1d4ed8;background:white}.lv-button-white:hover{background:#eff6ff}.lv-text-link{display:inline-flex;align-items:center;gap:12px;font-size:14px;font-weight:600;color:var(--lv-ink);min-height:44px}.lv-text-link:hover{color:var(--lv-blue)}.lv-hero-assurance{display:flex;flex-wrap:wrap;gap:20px;margin-top:24px;font-size:12px;color:var(--lv-muted)}.lv-hero-assurance span{display:flex;align-items:center;gap:6px}.lv-hero-assurance svg{color:var(--lv-blue)}.lv-property-figure{position:relative;min-width:0;padding-bottom:28px}.lv-property-card{border:1px solid #e0e7f0;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 24px 65px -35px #334e7866;transform:rotate(1deg)}.lv-card-heading{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:17px;font-size:11px;color:#52637a}.lv-card-heading>span:first-child{display:flex;gap:8px;align-items:center}.lv-caption{font-size:10px;letter-spacing:.09em;color:#69788d;font-weight:650}.lv-card-heading .lv-caption{font-size:9px;white-space:nowrap}.lv-property-photo{position:relative;height:360px;margin:0 9px;border-radius:10px;overflow:hidden;background:#e7edf7}.lv-property-photo img{width:100%;height:100%;object-fit:cover}.lv-photo-shade{position:absolute;inset:0;background:linear-gradient(0deg,#12243be0,transparent 75%)}.lv-photo-tag{position:absolute;top:16px;left:16px;display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:6px;background:#ffffffec;color:#294767;font-size:11px;font-weight:600}.lv-photo-caption{position:absolute;bottom:24px;left:24px;color:white}.lv-photo-caption>span{font-size:10px;font-weight:600;letter-spacing:.13em;color:#e3edfc}.lv-photo-caption h2{font-size:32px;line-height:1.12;letter-spacing:-.035em;margin-top:10px}.lv-property-info{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px}.lv-property-info h3{font-size:14px;font-weight:650}.lv-property-info div>span{display:flex;gap:5px;align-items:center;margin-top:7px;color:#69788d;font-size:11px}.lv-property-arrow{width:36px;height:36px;display:grid;place-items:center;background:#f1f6ff;color:var(--lv-blue);border-radius:100%}.lv-floating-note{position:absolute;left:-24px;bottom:7px;display:flex;align-items:center;gap:12px;padding:14px 20px;background:white;border:1px solid #e1e9f4;border-radius:12px;box-shadow:0 12px 30px -15px #334e784d}.lv-note-icon{display:grid;place-items:center;width:43px;height:43px;border-radius:10px;background:#eef5ff;color:var(--lv-blue)}.lv-floating-note strong{display:block;font-size:13px}.lv-floating-note div>span{display:block;margin-top:4px;font-size:11px;color:#69788d}.lv-property-figure figcaption{text-align:right;font-size:10px;color:#69788d;padding:13px 4px 0}.lv-principles{border-block:1px solid #e9edf4}.lv-principles-grid{display:grid;grid-template-columns:1fr 1fr 1.35fr 1fr;gap:25px;align-items:center;padding-block:25px}.lv-principles p{font-size:13px;line-height:1.6;color:#69788d}.lv-principles strong{color:#253950;font-weight:600}.lv-principles-grid>span{display:flex;gap:12px;align-items:center;font-size:12px;color:#52637a}.lv-principles svg{width:20px;height:20px;color:var(--lv-blue)}.lv-section{padding-block:80px}.lv-eyebrow{font-size:10px;line-height:1.6;letter-spacing:.15em;font-weight:700;color:#2563eb}.lv-main h2{font-weight:600}.lv-section-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-bottom:32px}.lv-section-heading h2,.lv-control h2,.lv-faq-section h2{font-size:clamp(30px,3.2vw,42px);line-height:1.15;letter-spacing:-.045em;margin-top:13px}.lv-section-heading h2 span,.lv-control h2 span,.lv-faq-section h2 span{color:#718097}.lv-section-heading>p{max-width:330px;color:var(--lv-muted);font-size:14px;line-height:1.8;padding-bottom:3px}.lv-benefits-section{background:#f7f9fc;border-block:1px solid #edf0f5}.lv-icon{width:43px;height:43px;display:grid;place-items:center;border-radius:11px;color:#2563eb;background:#f0f5ff;flex-shrink:0}.lv-control{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:80px}.lv-body-copy{font-size:15px;color:var(--lv-muted);line-height:1.9;max-width:420px;margin-block:21px!important}.lv-timeline-card{border:1px solid #e0e7f0;padding:26px;border-radius:15px;box-shadow:0 15px 40px -30px #334e7855}.lv-timeline-heading{display:flex;align-items:center;gap:13px;padding-bottom:23px;border-bottom:1px solid #edf0f5}.lv-timeline-heading h3{font-size:15px;font-weight:650}.lv-timeline-heading p{font-size:12px;color:var(--lv-muted);margin-top:5px}.lv-timeline-card ol{list-style:none;padding:23px 0 0;margin:0;display:grid;gap:25px}.lv-timeline-card li{display:flex;gap:14px;position:relative;align-items:center}.lv-timeline-card li:not(:last-child):after{content:'';position:absolute;left:18px;top:38px;height:26px;width:1px;background:#dce6f6}.lv-timeline-icon{height:37px;width:37px;border-radius:100%;border:1px solid #dce6f6;display:grid;place-items:center;color:#2563eb;flex-shrink:0}.lv-timeline-card li>div{flex:1}.lv-timeline-card h4{font-size:13px;font-weight:600}.lv-timeline-card li p{font-size:12px;line-height:1.6;color:var(--lv-muted);margin-top:3px}.lv-faq-section{border-top:1px solid #e9edf4;display:grid;grid-template-columns:.8fr 1.2fr;gap:60px;padding-block:60px 80px}.lv-faq-list details{border-bottom:1px solid #e5eaf2}.lv-faq-list summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:20px;cursor:pointer;font-size:14px;font-weight:600;padding:21px 0;min-height:60px}.lv-faq-list summary::-webkit-details-marker{display:none}.lv-faq-list summary svg{color:#718097;transition:transform .2s}.lv-faq-list details[open] summary svg{transform:rotate(180deg)}.lv-faq-list details p{font-size:14px;line-height:1.8;color:var(--lv-muted);padding-bottom:21px;max-width:550px}.lv-cta-wrap{padding-bottom:72px}.lv-cta{display:flex;align-items:center;justify-content:space-between;gap:36px;background:#153c91;color:white;border-radius:18px;padding:45px 48px;position:relative;overflow:hidden}.lv-cta .lv-eyebrow{color:#c1d7ff}.lv-cta h2{font-size:36px;letter-spacing:-.04em;line-height:1.14;margin-top:14px}.lv-cta p{font-size:14px;line-height:1.7;color:#d0def7;margin-top:15px}.lv-cta-action{display:flex;flex-direction:column;align-items:center;gap:13px;flex-shrink:0}.lv-cta-action>span{font-size:11px;color:#d0def7}.lv-main section[id]{scroll-margin-top:100px}
@media(min-width:1500px){.lv-hero{padding-top:85px;padding-bottom:65px}}
@media(max-width:1023px){.lv-hero-grid{gap:35px}.lv-main h1{font-size:48px}.lv-card-heading .lv-caption{display:none}.lv-property-photo{height:335px}.lv-actions{gap:14px}.lv-principles-grid{gap:18px;grid-template-columns:1fr 1fr}.lv-section{padding-block:60px}.lv-control{gap:40px}.lv-cta{padding:36px}.lv-cta h2{font-size:31px}}
@media(max-width:767px){.lv-container{width:calc(100% - 40px)}.lv-hero{padding:36px 0 30px}.lv-hero-grid{grid-template-columns:1fr;gap:35px}.lv-main h1{font-size:clamp(43px,8vw,60px)}.lv-hero-copy{max-width:560px}.lv-hero-description{max-width:510px}.lv-property-figure{width:100%;max-width:560px;margin-inline:auto!important}.lv-property-card{transform:none}.lv-property-photo{height:340px}.lv-floating-note{left:12px}.lv-property-figure figcaption{padding-top:54px}.lv-floating-note{bottom:33px}.lv-card-heading .lv-caption{display:inline}.lv-principles-grid{gap:20px;padding-block:23px}.lv-principles-grid>span{font-size:11px;gap:8px}.lv-section-heading{display:block;margin-bottom:26px}.lv-section-heading>p{margin-top:17px;max-width:480px}.lv-control{grid-template-columns:1fr;gap:30px}.lv-faq-section{grid-template-columns:1fr;gap:23px;padding-block:45px 55px}.lv-cta{align-items:flex-start;flex-direction:column;padding:30px;gap:26px}.lv-cta h2{font-size:32px}.lv-cta-action{align-items:flex-start}.lv-cta-wrap{padding-bottom:45px}}
@media(max-width:390px){.lv-container{width:calc(100% - 32px)}.lv-main h1{font-size:41px}.lv-card-heading .lv-caption{display:none}.lv-property-photo{height:300px}.lv-principles-grid{grid-template-columns:1fr}.lv-principles p br{display:none}.lv-principles strong{margin-left:5px}.lv-property-info div>span{font-size:10px}.lv-timeline-card{padding:20px}.lv-cta{padding:26px}.lv-cta h2{font-size:28px}}
@media(prefers-reduced-motion:reduce){.lv-main *{transition:none!important;animation:none!important;scroll-behavior:auto!important}}

.lv-process-cards{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px}
.lv-process-card{grid-column:span 2;border:1px solid #e1e7f0;border-radius:16px;padding:28px;background:#fff}
.lv-process-card:nth-child(-n+2){grid-column:span 3;background:#f7faff}
.lv-process-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px}
.lv-process-index{font-size:32px;line-height:1;font-weight:650;letter-spacing:-.05em;color:#a9bedf}
.lv-process-card h3{font-size:19px;font-weight:650;line-height:1.4;letter-spacing:-.02em}
.lv-process-card p{margin-top:12px;font-size:14px;line-height:1.85;color:var(--lv-muted)}
.lv-signup-line{display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:14px;color:#52637a;margin-top:16px!important}
.lv-signup-line svg{color:#2563eb}
.lv-approved-benefits{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.lv-approved-benefits li{display:flex;align-items:center;gap:14px;padding:25px 20px;min-height:106px;border:1px solid #e1e7f0;border-radius:13px;background:white}
.lv-approved-check{width:38px;height:38px;flex-shrink:0;display:grid;place-items:center;border-radius:100%;background:#eef5ff;color:#2563eb}
.lv-approved-benefits h3{font-size:15px;font-weight:600;line-height:1.5}
@media(max-width:1023px){.lv-process-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.lv-process-card,.lv-process-card:nth-child(-n+2){grid-column:auto}.lv-process-card:last-child{grid-column:1/-1}.lv-approved-benefits{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:767px){.lv-process-cards,.lv-approved-benefits{grid-template-columns:1fr}.lv-process-card{padding:24px}.lv-process-card:last-child{grid-column:auto}.lv-section-heading>.lv-button{margin-top:20px}.lv-approved-benefits li{min-height:88px}.lv-process-card-top{margin-bottom:20px}}

.lv-value-heading{display:flex;align-items:center;justify-content:space-between;gap:28px;margin-bottom:32px}
.lv-value-heading h2{font-size:clamp(30px,3.3vw,43px);line-height:1.15;letter-spacing:-.045em;max-width:460px}
.lv-value-heading h2>span{color:#2563eb}
.lv-value-onboarding{display:flex;align-items:center;gap:14px;color:#52637a;font-size:12px;font-weight:600;flex-wrap:wrap}
.lv-value-onboarding>span{display:flex;align-items:center;gap:9px}
.lv-value-onboarding>svg{color:#8ba2c5}
.lv-value-dot{width:27px;height:27px;display:grid;place-items:center;border-radius:50%;border:1px solid #dbe6f5;background:#fff;color:#2563eb;font-size:10px}
.lv-value-grid{display:grid;grid-template-columns:1.05fr 1fr 1fr;grid-template-rows:auto auto auto;gap:16px;margin:0;padding:0;list-style:none}
.lv-value-card{position:relative;min-width:0;overflow:hidden;background:#fff;border:1px solid #e1e8f2;border-radius:17px;padding:25px;transition:border-color .2s,box-shadow .2s}
.lv-value-card:hover{border-color:#abc6f6;box-shadow:0 12px 30px -22px #24478266}
.lv-value-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}
.lv-value-icon{display:grid;place-items:center;width:46px;height:46px;border:1px solid #e5edfa;border-radius:13px;background:#f5f8ff;color:#2563eb}
.lv-value-count{font-size:11px;font-weight:600;color:#8494aa;letter-spacing:.1em}
.lv-value-copy{display:flex;align-items:center;justify-content:space-between;gap:16px;position:relative;z-index:1}
.lv-value-copy h3{font-size:17px;font-weight:600;line-height:1.5;letter-spacing:-.02em;max-width:260px}
.lv-value-tick{width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:#eff5ff;color:#2563eb;flex-shrink:0}
.lv-value-featured{grid-row:span 3;display:flex;flex-direction:column;background:linear-gradient(145deg,#2563eb,#1746b4);color:white;border-color:#2563eb;padding:30px}
.lv-value-featured:before,.lv-value-featured:after{content:'';position:absolute;width:320px;height:320px;border:1px solid #ffffff18;border-radius:50%;right:-180px;top:75px;pointer-events:none}
.lv-value-featured:after{width:410px;height:410px;right:-225px;top:30px}
.lv-value-featured:hover{border-color:#2563eb}
.lv-value-featured .lv-value-icon{background:#ffffff13;border-color:#ffffff30;color:white}
.lv-value-featured .lv-value-count{color:#d4e2ff}
.lv-value-price{font-size:clamp(80px,8vw,116px);line-height:1;font-weight:600;letter-spacing:-.07em;margin-block:auto;padding-block:30px;position:relative;z-index:1}
.lv-value-featured .lv-value-copy{display:block}
.lv-value-featured h3{font-size:30px;line-height:1.15;letter-spacing:-.04em;max-width:230px;margin-bottom:27px}
.lv-value-featured .lv-button{width:100%;justify-content:space-between}
.lv-value-wide{grid-column:span 2;display:flex;align-items:center;gap:18px;min-height:102px;background:#eef4ff;border-color:#dce7fa}
.lv-value-wide .lv-value-top{margin:0}.lv-value-wide .lv-value-count{display:none}
.lv-value-wide .lv-value-copy{flex:1}.lv-value-wide .lv-value-copy h3{max-width:none}
.lv-value-wide .lv-value-tick{display:none}
.lv-value-sliders{display:flex;flex-direction:column;gap:12px;width:70px;flex-shrink:0;margin-inline:12px}
.lv-value-sliders i{display:block;height:2px;border-radius:5px;background:#c7d8f4;position:relative}
.lv-value-sliders i:after{content:'';position:absolute;top:-4px;width:10px;height:10px;background:#fff;border:2px solid #2563eb;border-radius:50%;left:20%}
.lv-value-sliders i:nth-child(2):after{left:65%}.lv-value-sliders i:nth-child(3):after{left:40%}
@media(max-width:1023px){.lv-value-heading{align-items:flex-start;flex-direction:column;gap:20px}.lv-value-grid{grid-template-columns:1fr 1fr}.lv-value-featured{grid-row:span 2}.lv-value-wide{grid-column:1/-1}.lv-value-card{padding:23px}.lv-value-copy h3{font-size:16px}.lv-value-featured h3{font-size:29px}}
@media(max-width:600px){.lv-value-grid{grid-template-columns:1fr;gap:12px}.lv-value-featured{grid-row:auto;min-height:350px}.lv-value-wide{grid-column:auto}.lv-value-price{font-size:86px;padding-block:24px}.lv-value-featured h3{max-width:none}.lv-value-card:not(.lv-value-featured){display:flex;align-items:center;gap:16px;min-height:110px;padding:21px}.lv-value-card:not(.lv-value-featured) .lv-value-top{margin:0}.lv-value-card:not(.lv-value-featured) .lv-value-count{display:none}.lv-value-card:not(.lv-value-featured) .lv-value-copy{flex:1}.lv-value-copy h3{font-size:15px}.lv-value-sliders{display:none}.lv-value-onboarding{gap:10px;font-size:11px}.lv-value-wide .lv-value-tick{display:grid}}



.lv-verification-list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:minmax(0,1.05fr) repeat(2,minmax(0,1fr));gap:20px}
.lv-verification-step{position:relative;min-width:0;overflow:hidden;border:1px solid #e0e7f1;border-radius:22px;padding:28px;background:#fff;box-shadow:0 3px 7px #18305403;transition:border-color .2s,box-shadow .2s}
.lv-verification-step:hover{border-color:#b9cef1;box-shadow:0 12px 32px -20px #1d4ed83b}
.lv-verification-number{position:absolute;right:26px;top:30px;font-size:12px;font-weight:650;color:#72849e;font-variant-numeric:tabular-nums}
.lv-verification-card{position:relative}
.lv-verification-step-heading{display:grid;grid-template-columns:minmax(0,1fr);justify-items:start;gap:13px}
.lv-verification-icon{display:grid;place-items:center;width:48px;height:48px;border:1px solid #e0eafe;border-radius:15px;background:linear-gradient(145deg,#fff,#eef4ff);color:#2563eb;margin-bottom:15px;box-shadow:0 3px 6px #2563eb06}
.lv-verification-step-heading h3{font-size:20px;font-weight:650;line-height:1.35;letter-spacing:-.03em;max-width:250px}
.lv-verification-badge{display:inline-flex;align-items:center;gap:6px;border:1px solid #e3e9f2;border-radius:7px;padding:5px 9px;background:#f8fafc;color:#52637a;font-size:10px;font-weight:650;line-height:1.5}
.lv-verification-badge:before{content:'';width:5px;height:5px;border-radius:50%;background:#7b91b3}
.lv-verification-card p{font-size:13px;line-height:1.85;color:#607087;margin-top:16px}
.lv-verification-step:first-child{grid-row:span 2;padding:34px;background:linear-gradient(155deg,#2864e8 0%,#1f50c0 60%,#163d98 100%);border-color:#285bce;color:white;display:flex;flex-direction:column;box-shadow:0 14px 34px -22px #1746b488}
.lv-verification-step:first-child:before{content:'';position:absolute;width:370px;height:370px;border:1px solid #ffffff17;border-radius:50%;right:-180px;bottom:-130px;box-shadow:0 0 0 38px #ffffff04,0 0 0 76px #ffffff04;pointer-events:none}
.lv-verification-step:first-child:after{content:'';position:absolute;left:34px;bottom:38px;width:104px;height:104px;border:1px solid #ffffff30;border-radius:24px;transform:rotate(-9deg);background:linear-gradient(135deg,#ffffff14,#ffffff03);box-shadow:10px 10px 0 -1px #ffffff07;pointer-events:none}
.lv-verification-step:first-child .lv-verification-card{z-index:1;padding-bottom:155px}
.lv-verification-step:first-child .lv-verification-number{font-size:112px;line-height:1;letter-spacing:-.07em;color:#ffffff18;top:auto;bottom:22px;right:28px}
.lv-verification-step:first-child .lv-verification-icon{background:#ffffff12;border-color:#ffffff30;color:white;width:58px;height:58px;margin-bottom:35px;box-shadow:inset 0 1px 0 #ffffff20}
.lv-verification-step:first-child h3{font-size:clamp(28px,2.6vw,36px);line-height:1.12;letter-spacing:-.045em}
.lv-verification-step:first-child .lv-verification-badge{background:#ffffff10;border-color:#ffffff30;color:#f0f5ff;margin-top:4px}
.lv-verification-step:first-child .lv-verification-badge:before{background:#b8d6ff}
.lv-verification-step:first-child p{color:#e1eaff;font-size:15px;line-height:1.9;margin-top:23px}
.lv-verification-step:nth-child(3) .lv-verification-badge{color:#936026;background:#fffbeb;border-color:#f5e5bb}
.lv-verification-step:nth-child(3) .lv-verification-badge:before{background:#d89e39}
.lv-verification-step:last-child{background:linear-gradient(135deg,#f4f8ff,#fff);border-color:#ccdcf7}
.lv-verification-step:last-child .lv-verification-icon{color:#1d4ed8;border-color:#cdddf9;background:#eaf2ff}
.lv-verification-step:last-child .lv-verification-badge{color:#237358;background:#f0faf5;border-color:#d4ecdf}
.lv-verification-step:last-child .lv-verification-badge:before{background:#359a73}
@media(max-width:1023px){.lv-verification-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.lv-verification-step{padding:25px}.lv-verification-step:first-child{grid-row:span 2;padding:28px}.lv-verification-step:last-child{grid-column:1/-1}.lv-verification-step:last-child .lv-verification-card{display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1.3fr);gap:28px;align-items:center}.lv-verification-step:last-child p{margin-top:0}}
@media(max-width:600px){.lv-verification-list{grid-template-columns:1fr;gap:14px}.lv-verification-step{padding:24px;border-radius:18px}.lv-verification-step:first-child{grid-row:auto;padding:26px}.lv-verification-step:first-child .lv-verification-card{padding-bottom:65px}.lv-verification-step:first-child .lv-verification-icon{margin-bottom:12px}.lv-verification-step:first-child h3{font-size:30px;max-width:none}.lv-verification-step:first-child:after{width:48px;height:48px;bottom:24px;left:26px;border-radius:12px}.lv-verification-step:first-child .lv-verification-number{font-size:78px;bottom:15px}.lv-verification-step:last-child{grid-column:auto}.lv-verification-step:last-child .lv-verification-card{display:block}.lv-verification-step:last-child p{margin-top:16px}.lv-verification-icon{margin-bottom:9px}.lv-verification-card p{font-size:14px}}
@media(prefers-reduced-motion:reduce){.lv-verification-step{transition:none}}
`

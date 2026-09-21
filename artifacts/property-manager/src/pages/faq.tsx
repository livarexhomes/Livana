import { useState } from 'react'
import { Link } from '@/lib/navigation'
import { Search, Plus, ArrowUpRight, ShieldCheck, MessageSquare } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'
import SEO from '@/components/SEO'

const categories = ['All questions', 'Verification', 'For landlords', 'Trust & safety'] as const
type Category = typeof categories[number]
// Verification topics paraphrased from the live /how-we-verify page on 21 September 2026.
// Landlord answers follow the supplied landlord page. Review policy wording when it changes.
const faqs = [
  { id: 'review', category: 'Verification', question: 'How long does verification take?', answer: 'Allow around 24–48 hours on business days for document review. An email is sent once your application has been reviewed.' },
  { id: 'identity', category: 'Verification', question: 'Why do I need landlord verification?', answer: 'Identity verification helps establish a more trustworthy landlord profile. Complete the required verification and property review before your listing can be published.' },
  { id: 'badge', category: 'Verification', question: 'Does a verified badge guarantee a property?', answer: 'The badge indicates checks on the landlord’s identity and property claim. It is not a guarantee; arrange an inspection before paying.' },
  { id: 'future', category: 'Verification', question: 'Are more verification checks planned?', answer: 'The verification page describes future NIN/BVN integration and face matching. These are planned upgrades, not checks currently offered.' },
  { id: 'free', category: 'For landlords', question: 'Is it free to list my property?', answer: 'You can create a property listing without an upfront listing fee. Free listing refers to publishing your property; review any applicable service terms before completing a rental.' },
  { id: 'live', category: 'For landlords', question: 'Does my property go live immediately?', answer: 'Your property becomes visible to prospective tenants once the required review and approval process is complete.' },
  { id: 'decision', category: 'For landlords', question: 'Do I still make the final rental decision?', answer: 'Yes. You remain involved in the final rental process and make your own property decisions. LIVAREX provides platform support where applicable.' },
  { id: 'fraud', category: 'Trust & safety', question: 'What happens when fraudulent documents are submitted?', answer: 'LIVAREX states that fraudulent submissions lead to permanent bans, with repeat offenders reported to the authorities.' },
  { id: 'report', category: 'Trust & safety', question: 'How can I report a suspicious listing?', answer: 'Use the listing’s report control to flag a concern. The verification page states that reports are reviewed within 24 hours and listings that breach policy are removed.' },
]

export default function FAQPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('All questions')
  const [openId, setOpenId] = useState<string | null>('review')
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const matches = (item: typeof faqs[number]) => words.every(word => (item.question + ' ' + item.answer).toLowerCase().includes(word))
  const results = faqs.filter(item => (category === 'All questions' || item.category === category) && matches(item))
  const focusStyle = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600'

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO title="Frequently Asked Questions — LIVAREX" description="Answers about LIVAREX landlord verification, property listings and reporting suspicious listings." url="/faq" />
      <PublicNavbar />
      <main className="pt-24">
        <header className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-br from-white to-blue-50 px-5 py-12 sm:px-8 md:py-16">
          <div className="relative mx-auto max-w-6xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">LIVAREX Help Centre</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-[-0.05em] sm:text-5xl lg:text-6xl">A little clarity.<br /><span className="text-blue-600">A lot more confidence.</span></h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">Your questions about listing, verification and finding your next home, answered.</p>
            <div className="mt-7 flex max-w-xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
              <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <label htmlFor="faq-search" className="sr-only">Search frequently asked questions</label>
              <input id="faq-search" type="search" placeholder="Search your question…" value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent py-4 text-base text-slate-900 outline-none placeholder:text-slate-500" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>Popular:</span>{['Verification', 'Free', 'Report'].map(term => <button type="button" key={term} onClick={() => { setQuery(term); setCategory('All questions'); setOpenId(null) }} className={'min-h-11 rounded-full px-3 hover:bg-white hover:text-blue-600 ' + focusStyle}>{term}</button>)}</div>
            <div aria-hidden="true" className="absolute right-8 top-12 hidden h-44 w-44 rotate-6 items-center justify-center rounded-[40px] border border-blue-100 bg-white/70 text-blue-600 shadow-xl shadow-blue-100/50 lg:flex"><ShieldCheck className="h-24 w-24" strokeWidth={1} /></div>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12 md:py-14">
          <aside>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Browse by topic</p>
            <nav aria-label="FAQ categories" className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-1">
              {categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => { setCategory(item); setOpenId(null) }} className={'flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left text-xs font-semibold transition-colors ' + (category === item ? 'border-blue-100 bg-blue-50 text-blue-700 ' : 'border-slate-100 bg-white text-slate-600 hover:bg-slate-50 ') + focusStyle}><span>{item}</span><span className="rounded-md bg-white px-1.5 py-0.5 text-[10px]">{faqs.filter(faq => (item === 'All questions' || faq.category === item) && matches(faq)).length}</span></button>)}
            </nav>
            <div className="mt-7 hidden rounded-2xl border border-slate-200 p-5 md:block">
              <MessageSquare className="h-6 w-6 text-blue-600" aria-hidden="true" /><h2 className="mt-4 text-base font-semibold">Let’s talk it through.</h2><p className="mt-2 text-xs leading-6 text-slate-500">Can’t find what you need? Get in touch with the LIVAREX team.</p><Link href="/contact" className={'mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-600 ' + focusStyle}>Contact Us <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </aside>
          <section aria-labelledby="faq-results-heading" className="min-w-0">
            <div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Frequently asked questions</p><h2 id="faq-results-heading" className="mt-2 text-2xl font-semibold tracking-tight">{category}</h2></div><span role="status" className="shrink-0 text-xs text-slate-500">{results.length} {results.length === 1 ? 'answer' : 'answers'}</span></div>
            <div className="border-t border-slate-200">
              {results.map(item => { const expanded = openId === item.id; return <article key={item.id} className="border-b border-slate-200"><h3><button type="button" id={'question-' + item.id} aria-expanded={expanded} aria-controls={'answer-' + item.id} onClick={() => setOpenId(expanded ? null : item.id)} className={'flex w-full items-center justify-between gap-4 py-6 text-left text-sm font-semibold leading-6 sm:text-base ' + (expanded ? 'text-blue-700 ' : 'text-slate-900 ') + focusStyle}><span>{item.question}</span><span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + (expanded ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500')}><Plus size={18} aria-hidden="true" className={expanded ? 'rotate-45' : ''} /></span></button></h3><div id={'answer-' + item.id} aria-labelledby={'question-' + item.id} hidden={!expanded} className="pb-6 pr-2 text-sm leading-7 text-slate-600 sm:pr-12"><p>{item.answer}</p></div></article> })}
            </div>
            {!results.length && <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center"><Search className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" /><h3 className="mt-4 font-semibold">No matching questions</h3><p className="mt-2 text-sm text-slate-500">Try a shorter search or browse all topics.</p><button type="button" onClick={() => { setQuery(''); setCategory('All questions'); setOpenId('review') }} className={'mt-5 min-h-11 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white ' + focusStyle}>Show all questions</button></div>}
            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5"><ShieldCheck className="hidden h-8 w-8 shrink-0 text-blue-600 sm:block" aria-hidden="true" /><div><h3 className="text-sm font-semibold">Understand the checks behind the badge.</h3><Link href="/how-we-verify" className={'mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-blue-600 ' + focusStyle}>Explore our verification process <ArrowUpRight size={17} aria-hidden="true" /></Link></div></div>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-slate-500"><span>Still have a question?</span><Link href="/contact" className={'inline-flex min-h-11 items-center gap-2 font-semibold text-blue-600 ' + focusStyle}>Contact Us <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

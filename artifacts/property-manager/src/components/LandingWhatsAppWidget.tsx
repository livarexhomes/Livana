import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowUpRight,
  Building2,
  Check,
  MessageCircle,
  MessageSquareText,
  X,
  ShieldCheck,
  Loader2,
  Sparkles,
  Clock,
  Send,
  Lock,
  Eye,
  Calendar,
  Home,
  Key,
  ChevronDown,
  UserCheck,
} from 'lucide-react'
import { phoneToWaLink } from '../lib/platform-settings'
import { generateReferenceCode, getWhatsAppPhoneNumber } from '../lib/whatsapp-config'

type TopicTab = {
  id: string
  label: string
  icon: typeof Home
  subject: string
  defaultPrompt: string
}

const TOPIC_TABS: TopicTab[] = [
  {
    id: 'buy_rent',
    label: 'Find Home',
    icon: Home,
    subject: 'Find a Home',
    defaultPrompt: 'Hi Livarex, I am looking for a 3-bedroom apartment in Lekki / Ikeja. My budget is around ₦4,000,000/yr.',
  },
  {
    id: 'tour',
    label: 'Book Tour',
    icon: Calendar,
    subject: 'Property Viewing Request',
    defaultPrompt: 'Hello, I would like to schedule an inspection for a property. Available dates: This Saturday afternoon.',
  },
  {
    id: 'list',
    label: 'List Asset',
    icon: Key,
    subject: 'List a Property',
    defaultPrompt: 'Hi team, I am a landlord/agent looking to list a residential property located in Victoria Island.',
  },
  {
    id: 'general',
    label: 'Enquiry',
    icon: MessageSquareText,
    subject: 'General Enquiry',
    defaultPrompt: 'Hello Livarex support, I have a question regarding your listing verification process.',
  },
]

const MAX_MESSAGE_LENGTH = 1000

type ContactForm = {
  name: string
  subject: string
  message: string
}

const EMPTY_FORM: ContactForm = { name: '', subject: TOPIC_TABS[0].subject, message: TOPIC_TABS[0].defaultPrompt }

export default function LandingWhatsAppWidget() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(TOPIC_TABS[0].id)
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingPhone, setLoadingPhone] = useState(true)
  const [whatsAppPhone, setWhatsAppPhone] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    setLoadingPhone(true)

    getWhatsAppPhoneNumber()
      .then(phone => {
        if (!active) return
        setWhatsAppPhone(phone)
        setLoadingPhone(false)
      })
      .catch(caughtError => {
        console.error('[LandingWhatsAppWidget] Could not load support number:', caughtError)
        if (!active) return
        setError('We could not load WhatsApp support. Please refresh and try again.')
        setLoadingPhone(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
    }, 150)

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [open])

  function handleTabChange(tab: TopicTab) {
    setActiveTab(tab.id)
    setForm(current => ({
      ...current,
      subject: tab.subject,
      message: current.message === '' || TOPIC_TABS.some(t => t.defaultPrompt === current.message) ? tab.defaultPrompt : current.message,
    }))
    setError(null)
  }

  function updateField(field: keyof ContactForm, value: string) {
    setForm(current => ({ ...current, [field]: value }))
    setError(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name.trim()
    const subject = form.subject.trim()
    const message = form.message.trim()

    if (!name || !subject || !message) {
      setError('Please fill in your name, subject, and message details.')
      return
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`Please keep your message under ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`)
      return
    }
    if (!whatsAppPhone) {
      setError('WhatsApp support is connecting. Please wait a moment.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const referenceCode = generateReferenceCode('general_enquiry')
      const whatsappMessage = [
        '*LIVAREX REAL ESTATE CONCIERGE*',
        '──────────────────────────',
        '',
        `*Client Name:* ${name}`,
        `*Inquiry Type:* ${subject}`,
        '',
        '*Client Message:*',
        message,
        '',
        `*Reference ID:* \`${referenceCode}\``,
        `*Source URL:* ${window.location.pathname}`,
        '',
        '_Sent securely via livarex.com.ng_',
      ].join('\n')

      const openedWindow = window.open('about:blank', '_blank')
      if (!openedWindow) {
        setError('Browser blocked pop-up! Please allow pop-ups for WhatsApp redirect.')
        setSubmitting(false)
        return
      }

      openedWindow.opener = null
      openedWindow.location.href = phoneToWaLink(whatsAppPhone, whatsappMessage)
      setOpen(false)
      setForm(EMPTY_FORM)
      setSubmitting(false)
    } catch (caughtError) {
      console.error('[LandingWhatsAppWidget] WhatsApp handoff failed:', caughtError)
      setError('Could not open WhatsApp automatically. Please try again.')
      setSubmitting(false)
    }
  }

  const isDisabled = submitting || loadingPhone || !whatsAppPhone

  return (
    <>
      <style>{`
        .wa-scroll { scrollbar-width: thin; scrollbar-color: rgba(100,116,139,.25) transparent; }
        .wa-scroll::-webkit-scrollbar { width: 4px; }
        .wa-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,.25); border-radius: 999px; }
        @keyframes wa-radar-ping {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        .wa-radar { animation: wa-radar-ping 2s infinite ease-out; }
      `}</style>

      {/* Floating Action Button (FAB) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Livarex Support"
          className="group fixed bottom-5 right-5 z-[9999] flex items-center gap-3 rounded-full border border-white/80 bg-slate-900/90 p-2 pr-5 text-xs font-bold text-white shadow-[0_20px_50px_rgba(15,23,42,0.3)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_25px_60px_rgba(15,23,42,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40"
        >
          {/* Avatar stack with pulse */}
          <div className="relative flex items-center">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md">
              <MessageCircle className="h-5 w-5 fill-white/20" />
              <span className="wa-radar absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400" />
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Online Now</span>
            </div>
            <span className="text-[13px] font-extrabold text-white">Chat with Livarex</span>
          </div>
          <ArrowUpRight className="ml-1 h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
        </button>
      )}

      {/* Main Glassmorphic Modal Sheet */}
      <section
        className={`fixed bottom-0 right-0 z-[9999] flex max-h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[32px] border border-white/80 bg-white/95 backdrop-blur-2xl shadow-[0_32px_100px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:bottom-6 sm:right-6 sm:max-h-[min(800px,calc(100dvh-48px))] sm:w-[calc(100vw-32px)] sm:rounded-[32px] ${
          open
            ? 'visible translate-y-0 opacity-100 scale-100'
            : 'invisible pointer-events-none translate-y-8 opacity-0 scale-[0.96]'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Livarex WhatsApp Assistant"
      >
        {/* Header Header Banner */}
        <div className="relative overflow-hidden bg-slate-950 px-6 pb-5 pt-6 text-white">
          {/* Subtle Ambient Mesh Glows */}
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

          {/* Header Controls */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-blue-400 backdrop-blur-md shadow-inner">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">LIVAREX REALTY</span>
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-extrabold text-blue-300 border border-emerald-500/20">
                    Concierge
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-white mt-0.5">How can we assist you?</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close widget"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Active Agents Avatar Indicator */}
          <div className="relative mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white ring-2 ring-slate-950">
                  <UserCheck className="h-3.5 w-3.5" />
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-slate-950">
                  <Sparkles className="h-3 w-3" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-200">Advisory Team Active</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <Clock className="h-3 w-3" />
              <span>~2 min reply</span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="wa-scroll flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Category Tabs */}
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Choose Service Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TOPIC_TABS.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 text-center transition-all duration-200 ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                        : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="text-[11px] font-extrabold">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Your Full Name</label>
              <input
                ref={nameInputRef}
                required
                autoComplete="name"
                maxLength={80}
                value={form.name}
                onChange={event => updateField('name', event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-950/5"
                placeholder="e.g. Tunde Balogun"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Inquiry Subject</label>
              <input
                required
                maxLength={120}
                value={form.subject}
                onChange={event => updateField('subject', event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-950/5"
                placeholder="What are you looking for?"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Message Details</label>
                <span className="text-[10px] font-semibold text-slate-400">
                  {form.message.length}/{MAX_MESSAGE_LENGTH}
                </span>
              </div>
              <textarea
                required
                rows={3}
                maxLength={MAX_MESSAGE_LENGTH}
                value={form.message}
                onChange={event => updateField('message', event.target.value)}
                className="min-h-[90px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-950/5"
                placeholder="Share your timeline, budget, or specific requirements..."
              />
            </div>
          </div>

          {/* Optional Live WhatsApp Format Preview Toggle */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex w-full items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-emerald-600" /> Preview Message Payload
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
            </button>

            {showPreview && (
              <div className="mt-2.5 rounded-xl bg-emerald-950/5 p-3 text-[10.5px] font-mono text-slate-700 whitespace-pre-wrap border border-emerald-900/10 leading-relaxed">
                *LIVAREX REAL ESTATE CONCIERGE*{'\n'}
                Name: {form.name || '[Your Name]'}{'\n'}
                Subject: {form.subject}{'\n'}
                Message: {form.message || '[Your Message]'}
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isDisabled}
            className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-950 px-5 text-xs font-black text-white shadow-xl shadow-slate-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-950/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <MessageSquareText className="h-4 w-4 text-emerald-400" />
            )}
            <span>
              {submitting
                ? 'Opening WhatsApp…'
                : loadingPhone
                ? 'Connecting Line…'
                : !whatsAppPhone
                ? 'Support Unavailable'
                : 'Continue to WhatsApp'}
            </span>
            <ArrowUpRight className="ml-auto h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
          </button>

          {/* Footer Lock Security Note */}
          <div className="flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold text-slate-400">
            <Lock className="h-3 w-3 text-slate-400" />
            <span>Secure 256-bit client handoff to official WhatsApp</span>
          </div>
        </form>
      </section>
    </>
  )
}
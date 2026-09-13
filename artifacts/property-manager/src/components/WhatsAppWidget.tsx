import { useEffect, useState } from 'react'
import { ArrowUpRight, MessageSquareText, X } from 'lucide-react'
import { useLocation } from '../lib/navigation'
import { createClient, getSupabaseImageUrl, isSupabaseConfigured } from '../lib/supabase'
import { phoneToWaLink } from '../lib/platform-settings'
import { generateReferenceCode, getWhatsAppPhoneNumber } from '../lib/whatsapp-config'

type PropertyContext = {
  id: string
  title: string
  city: string
  url: string
}

type FormState = {
  name: string
  subject: string
  description: string
}

const defaultForm: FormState = {
  name: '',
  subject: '',
  description: '',
}

export default function WhatsAppWidget() {
  const [location] = useLocation()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [propertyContext, setPropertyContext] = useState<PropertyContext | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let active = true

    const loadPropertyContext = async () => {
      const match = (location || '').match(/^\/listings\/([^/?#]+)/)
      if (!match || !isSupabaseConfigured()) {
        if (active) setPropertyContext(null)
        return
      }

      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('properties')
          .select('id, title, city, property_images(storage_path, is_cover, sort_order)')
          .eq('id', decodeURIComponent(match[1]))
          .maybeSingle()

        if (!active || !data) {
          setPropertyContext(null)
          return
        }

        const currentUrl = typeof window !== 'undefined'
          ? `${window.location.origin}${location}`
          : location || ''

        setPropertyContext({
          id: String(data.id),
          title: String(data.title ?? 'Property'),
          city: String(data.city ?? ''),
          url: currentUrl,
        })
      } catch {
        if (active) setPropertyContext(null)
      }
    }

    loadPropertyContext()

    return () => {
      active = false
    }
  }, [location, open])

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  function validateForm() {
    if (!form.name.trim()) return 'Please enter your name.'
    if (!form.subject.trim()) return 'Please enter a subject.'
    if (!form.description.trim()) return 'Please enter a brief description.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const name = form.name.trim()
      const subject = form.subject.trim()
      const description = form.description.trim()

      const messageParts = [
        'Hello LIVAREX,',
        '',
        `My name is ${name}.`,
        '',
        `Subject: ${subject}`,
        '',
        description,
        '',
        'Sent from the LIVAREX website.',
      ]

      if (propertyContext) {
        messageParts.push('', 'Property:')
        messageParts.push(propertyContext.title)
        messageParts.push(propertyContext.city)
        messageParts.push(propertyContext.url)
      }

      const message = messageParts.join('\n')
      const referenceCode = generateReferenceCode('general_enquiry')
      const phone = await getWhatsAppPhoneNumber()

      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient()
          await supabase.from('whatsapp_leads').insert({
            tenant_id: null,
            name,
            email: null,
            phone: null,
            enquiry_type: 'general_enquiry',
            property_id: propertyContext?.id ?? null,
            purpose: null,
            property_type: null,
            preferred_location: null,
            min_budget: null,
            max_budget: null,
            bedrooms: null,
            details: {
              subject,
              description,
            },
            message: description,
            source_page: location || null,
            reference_code: referenceCode,
            status: 'new',
          })
        } catch (leadError) {
          console.error('[WhatsAppWidget] Lead capture failed:', leadError)
        }
      }

      window.open(phoneToWaLink(phone, message), '_blank', 'noopener,noreferrer')
      setOpen(false)
      setForm(defaultForm)
    } catch (caughtError) {
      console.error('[WhatsAppWidget] handoff failed:', caughtError)
      setError('Something went wrong while preparing your WhatsApp message.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with LIVAREX on WhatsApp"
          className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 rounded-2xl border border-emerald-200 bg-[#25D366] px-3 py-3 text-sm font-bold text-white shadow-[0_18px_35px_rgba(37,211,102,0.35)] transition hover:bg-[#1ebc5b]"
        >
          <MessageSquareText className="h-4 w-4" />
          <span className="hidden sm:inline">Chat with us</span>
        </button>
      )}

      <div
        className={`fixed bottom-5 right-5 z-[9999] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] transition-all duration-300 ${open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-5'} w-[calc(100vw-24px)] max-w-[400px] max-h-[85vh]`}
        role="dialog"
        aria-modal="false"
        aria-label="Chat with LIVAREX"
      >
        <div className="flex h-full max-h-[85vh] flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">LIVAREX</p>
              <h3 className="mt-0.5 text-base font-black text-slate-900">Chat with LIVAREX</h3>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close widget"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">
              Tell us briefly what you need and continue the conversation with our team on WhatsApp.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Name *</span>
                <input
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                  placeholder="Your name"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Subject *</span>
                <input
                  value={form.subject}
                  onChange={e => updateField('subject', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                  placeholder="What is this about?"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Description *</span>
                <textarea
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                  placeholder="Tell us how we can help..."
                />
              </label>

              {propertyContext && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-slate-700">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Property context</p>
                  <p className="mt-2 font-semibold text-slate-900">{propertyContext.title}</p>
                  <p className="mt-1 text-slate-600">{propertyContext.city}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{propertyContext.url}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(37,211,102,0.28)] transition hover:bg-[#1ebc5b] disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {submitting ? 'Preparing WhatsApp…' : 'Continue on WhatsApp'}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

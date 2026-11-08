import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, Clock3, Eye, Loader2, MessageSquare, RefreshCw, UserRound, Users, Globe2, Search, MapPin, CalendarDays, ArrowUpRight } from 'lucide-react'
import { format, isValid } from 'date-fns'
import { createClient } from '../../lib/supabase'
import {
  getAdminVisitorActivity,
  getAdminVisitorProfile,
  getAdminSiteVisitorProfile,
  sendAdminVisitorMessage,
  type SiteVisitorFilters,
  type SiteVisitorActivity,
  type SiteVisitorProfile,
  type VisitorActivity,
  type VisitorProfile,
} from '../../lib/property-analytics'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { MobileSidebarProvider } from '../../components/ui/mobile-admin'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../../components/ui/dialog'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '../../components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Calendar } from '../../components/ui/calendar'

type Range = 7 | 30 | 90 | 'all'
type PropertyOption = { id: string; title: string; city: string }

function parseDate(value: string) {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return isValid(date) && format(date, 'yyyy-MM-dd') === value ? date : undefined
}

function DateFilter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = parseDate(value)
  const minDate = parseDate(min ?? '')
  const maxDate = parseDate(max ?? '')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayAllowed = (!minDate || today >= minDate) && (!maxDate || today <= maxDate)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${label}${selected ? `: ${format(selected, 'PPP')}` : ''}`}
          className="flex h-9 min-w-0 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs text-slate-700 shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 data-[state=open]:border-blue-400">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-blue-600" />
          <span className={selected ? 'truncate' : 'truncate text-slate-500'}>{selected ? format(selected, 'MMM d, yyyy') : label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-xl border-slate-200 bg-white p-2.5 shadow-[0_14px_32px_-14px_rgba(15,23,42,0.24),0_5px_12px_-7px_rgba(15,23,42,0.14)]">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? today}
          onSelect={date => {
            if (!date) return
            const next = format(date, 'yyyy-MM-dd')
            if ((!min || next >= min) && (!max || next <= max)) {
              onChange(next)
              setOpen(false)
            }
          }}
          disabled={date => Boolean((minDate && date < minDate) || (maxDate && date > maxDate))}
          className="p-2 [--cell-size:2.25rem]"
          classNames={{
            month: 'animate-in fade-in-0 duration-200',
            month_caption: 'flex h-9 w-full items-center justify-center px-9 text-sm font-semibold text-slate-900',
            caption_label: 'select-none font-semibold',
            button_previous: 'h-8 w-8 rounded-lg p-0 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30',
            button_next: 'h-8 w-8 rounded-lg p-0 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30',
            weekday: 'flex-1 select-none rounded-md text-[0.7rem] font-medium text-slate-400',
            day_button: 'rounded-lg transition-colors hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30',
            today: 'rounded-md text-blue-700 ring-1 ring-inset ring-blue-200 data-[selected=true]:ring-0',
          }}
        />
        <div className="flex items-center justify-between border-t border-slate-100 px-2 pt-2">
          <button type="button" onClick={() => { onChange(''); setOpen(false) }}
            disabled={!value} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
            Clear
          </button>
          <button type="button" onClick={() => { onChange(format(today, 'yyyy-MM-dd')); setOpen(false) }}
            disabled={!todayAllowed} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40">
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const rangeOptions: { label: string; value: Range }[] = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: 'All time', value: 'all' },
]

const interactionLabels: Record<string, string> = {
  impression: 'Property appeared in listings',
  detail_view: 'Viewed property details',
  unique_visitor: 'First visit to property',
  contact_admin_click: 'Contact Admin clicked',
  enquiry_initiated: 'Enquiry started',
}

const siteEventLabels: Record<string, string> = {
  page_view: 'Viewed page',
  navigation: 'Navigated to page',
  search: 'Searched properties',
  filter: 'Applied listing filters',
  login_page_view: 'Opened sign-in page',
  register_page_view: 'Opened registration page',
  login_attempt: 'Submitted sign-in form',
  register_attempt: 'Submitted registration form',
  cta_click: 'Clicked call to action',
  property_impression: 'Property appeared in listings',
  property_detail_view: 'Viewed property details',
  contact_admin_click: 'Clicked Contact Admin',
  enquiry_initiated: 'Started an enquiry',
}

function dateTime(value: string) {
  return format(new Date(value), 'd MMM yyyy, h:mm a')
}

function countryName(code: string | null) {
  if (!code) return 'Location unavailable'
  return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
}

function visitorLocation(visitor: Pick<SiteVisitorActivity, 'city' | 'region' | 'countryCode' | 'countryName'>) {
  const place = [visitor.city, visitor.region].filter(Boolean).join(', ')
  const country = visitor.countryName ?? countryName(visitor.countryCode)
  return [place, country === 'Location unavailable' ? null : country].filter(Boolean).join(', ') || 'Location unavailable'
}

function pageName(path: string | null) {
  if (!path) return 'No page recorded'
  if (path === '/') return 'Homepage'
  if (path === '/listings') return 'Property listings'
  if (/^\/listings\/[^/]+$/.test(path)) return 'Property details'
  const knownPages: Record<string, string> = {
    '/about': 'About Livarex',
    '/contact': 'Contact',
    '/login': 'Sign in',
    '/register': 'Registration',
    '/faq': 'Frequently asked questions',
  }
  if (knownPages[path]) return knownPages[path]
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1]?.replace(/[-_]/g, ' ') ?? path
}

function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <nav aria-label="Visitor list pagination" className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-700">
      <p className="text-xs text-slate-500">
        {total ? `${((page - 1) * pageSize + 1).toLocaleString()}–${Math.min(page * pageSize, total).toLocaleString()}` : '0'} of {total.toLocaleString()}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-[color,background-color,border-color,box-shadow] hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300">Previous</button>
        <span className="self-center text-xs tabular-nums text-slate-500 dark:text-slate-400">Page {page} of {pages}</span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pages}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-[color,background-color,border-color,box-shadow] hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300">Next</button>
      </div>
    </nav>
  )
}

function VisitorDialog({
  record,
  open,
  onOpenChange,
}: {
  record: VisitorActivity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [profile, setProfile] = useState<VisitorProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [deliveryStatus, setDeliveryStatus] = useState('')

  useEffect(() => {
    if (!open || !record) return
    let active = true
    setProfile(null)
    setError('')
    setMessage('')
    setDeliveryStatus('')
    setLoading(true)
    getAdminVisitorProfile(record.id).then(result => {
      if (active) setProfile(result)
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load visitor profile.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [open, record?.id])

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault()
    if (!record || !message.trim() || sending) return
    setSending(true)
    setError('')
    setDeliveryStatus('')
    try {
      const result = await sendAdminVisitorMessage(record.id, message.trim())
      setDeliveryStatus(result.conversationUpdated
        ? `Message ${result.deliveryStatus}. Conversation updated.`
        : 'Message sent, but the conversation status could not be updated.')
      setMessage('')
      setProfile(await getAdminVisitorProfile(record.id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto p-0 sm:w-full">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-12 text-left sm:px-6">
          <DialogTitle className="text-base">Visitor activity</DialogTitle>
          <DialogDescription>Restricted visitor information is recorded for audit purposes.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading visitor record…
          </div>
        ) : error && !profile ? (
          <p role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : profile ? (
          <div className="space-y-5 px-5 pb-5 sm:px-6">
            <section className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
                {profile.visitor.avatarUrl
                  ? <img src={profile.visitor.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <UserRound className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900">
                  {profile.visitor.name ?? 'Anonymous visitor'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {profile.visitor.registered ? 'Registered account' : 'Anonymous visitor'} · {profile.visitor.accountStatus}
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {profile.visitor.registered ? 'Registered' : 'Anonymous'}
              </span>
            </section>
            <section className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Property</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{profile.property.title}</p>
                  <p className="text-xs text-slate-500">{profile.property.city}</p>
                </div>
                <Clock3 className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                First interaction {dateTime(profile.firstSeenAt)} · Last {dateTime(profile.lastSeenAt)}
              </p>
              <ol className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {profile.interactions.map((interaction, index) => (
                  <li key={`${interaction.event_type}-${interaction.occurred_at}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-700">{interactionLabels[interaction.event_type] ?? interaction.event_type}</span>
                    <time className="shrink-0 text-slate-400">{dateTime(interaction.occurred_at)}</time>
                  </li>
                ))}
              </ol>
            </section>
            {profile.enquiries.length > 0 && (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800"><MessageSquare className="h-4 w-4" /> Related enquiries</h3>
                <div className="space-y-2">
                  {profile.enquiries.map(enquiry => (
                    <article key={enquiry.id} className="rounded-lg bg-slate-50 p-3">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{enquiry.message}</p>
                      <p className="mt-2 text-[10px] text-slate-400">{enquiry.status} · {dateTime(enquiry.created_at)}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800"><Users className="h-4 w-4" /> Communication history</h3>
              {profile.conversations.length ? (
                <div className="space-y-3">
                  {profile.conversations.map(conversation => (
                    <article key={`${conversation.type}-${conversation.id}`} className="rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
                        <p className="truncate text-xs font-semibold text-slate-700">{conversation.subject}</p>
                        <span className="shrink-0 text-[10px] text-slate-400">{conversation.status}</span>
                      </div>
                      <div className="max-h-40 space-y-2 overflow-y-auto p-3">
                        {conversation.messages.length ? conversation.messages.map((item, index) => (
                          <div key={`${item.created_at}-${index}`} className="rounded-md bg-slate-50 px-2.5 py-2">
                            <p className="whitespace-pre-wrap text-xs text-slate-700">{item.body}</p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              {item.sender_role ?? item.sender} · {dateTime(item.created_at)}
                              {((item.sender_role ?? item.sender) === 'admin') && ` · ${item.read_by_visitor ? 'Read' : 'Sent'}`}
                            </p>
                          </div>
                        )) : <p className="text-xs text-slate-400">No messages in this conversation yet.</p>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No prior support conversations.</p>}
            </section>

            {profile.visitor.registered && profile.visitor.messagingAllowed !== false && (
              <form onSubmit={sendMessage} className="border-t border-slate-100 pt-4">
                <label htmlFor="visitor-support-message" className="mb-2 block text-xs font-semibold text-slate-700">Message via Livarex support</label>
                <textarea id="visitor-support-message" value={message} onChange={event => setMessage(event.target.value)}
                  rows={3} maxLength={2000} placeholder="Write a support message…" className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p role="status" className="text-xs text-emerald-700">{deliveryStatus}</p>
                  <button type="submit" disabled={sending || !message.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    {sending ? 'Sending…' : 'Send message'}
                  </button>
                </div>
                {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
              </form>
            )}
            {profile.visitor.registered && profile.visitor.messagingAllowed === false && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">This visitor has opted out of administrator support messages.</p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function SiteVisitorDialog({
  record,
  open,
  onOpenChange,
}: {
  record: SiteVisitorActivity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [profile, setProfile] = useState<SiteVisitorProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!open || !record) return
    let active = true
    setProfile(null)
    setError('')
    setLoading(true)
    getAdminSiteVisitorProfile(record.id, page, 50).then(result => {
      if (active) setProfile(result)
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load site visitor details.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [open, record?.id, page])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto bg-white p-0 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:max-w-2xl">
        <SheetHeader className="border-b border-slate-100 bg-white px-5 py-5 pr-14 text-left dark:border-slate-700 dark:bg-slate-900 sm:px-7">
          <SheetTitle className="text-base text-slate-900 dark:text-slate-100">Anonymous visitor journey</SheetTitle>
          <SheetDescription className="text-slate-500 dark:text-slate-300">Pseudonymous activity only. This record is not linked to an account; profile access is audited.</SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading visitor details…
          </div>
        ) : error ? (
          <p role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : profile ? (
          <div className="space-y-5 px-5 pb-6 sm:px-7">
            <section className="flex items-start gap-3 pt-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <Globe2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{profile.visitor.label}</h2>
                <p className="mt-0.5 break-all font-mono text-[10px] text-slate-500 dark:text-slate-400">{record?.id}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{visitorLocation(profile.visitor)}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">Anonymous</span>
            </section>
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Tracked events', profile.visitor.totalEvents],
                ['Page views', profile.visitor.pageViews],
                ['First seen', dateTime(profile.visitor.firstSeenAt)],
                ['Last active', dateTime(profile.visitor.lastSeenAt)],
              ].map(([label, value]) => (
                <div key={String(label)} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                </div>
              ))}
            </section>
            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-950">
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Visitor origin</h3>
              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div><p className="text-slate-400">Traffic source</p><p className="mt-0.5 font-medium capitalize text-slate-700 dark:text-slate-200">{profile.visitor.trafficSource?.replace(/_/g, ' ') ?? 'Unknown'}</p></div>
                <div><p className="text-slate-400">Referring domain</p><p className="mt-0.5 break-all font-medium text-slate-700 dark:text-slate-200">{profile.visitor.referrerDomain ?? 'Direct or unavailable'}</p></div>
                <div><p className="text-slate-400">Landing page</p><p className="mt-0.5 break-all font-medium text-slate-700 dark:text-slate-200">{profile.visitor.landingPage ?? 'Unavailable'}</p></div>
                <div><p className="text-slate-400">Campaign</p><p className="mt-0.5 break-words font-medium text-slate-700 dark:text-slate-200">{[profile.visitor.utmSource, profile.visitor.utmMedium, profile.visitor.utmCampaign, profile.visitor.utmContent, profile.visitor.utmTerm].filter(Boolean).join(' / ') || 'None recorded'}</p></div>
                <div><p className="text-slate-400">Device</p><p className="mt-0.5 font-medium capitalize text-slate-700 dark:text-slate-200">{profile.visitor.deviceCategory ?? 'Unknown'}</p></div>
                <div><p className="text-slate-400">Browser / operating system</p><p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">{[profile.visitor.browser, profile.visitor.operatingSystem].filter(Boolean).join(' / ') || 'Unknown'}</p></div>
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Website journey</h3>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{profile.visitCount.toLocaleString()} retained events · chronological</p>
                </div>
                <span className="text-[10px] text-slate-400">Page {profile.page} · {Math.max(1, Math.ceil(profile.visitCount / profile.pageSize))}</span>
              </div>
              {profile.visitCount > 0 ? (
                <>
                <ol className="mt-4 space-y-0">
                  {profile.visits.map((visit, index) => (
                    <li key={`${visit.visited_at}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                      <span className="absolute bottom-0 left-[9px] top-5 w-px bg-slate-200 last:hidden dark:bg-slate-700" />
                      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                        <Activity className="h-2.5 w-2.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{siteEventLabels[visit.event_type] ?? visit.event_type}</p>
                          <time className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">{dateTime(visit.visited_at)}</time>
                        </div>
                        <p className="mt-1 text-[11px] font-medium capitalize text-slate-600 dark:text-slate-300">{pageName(visit.page_path)} <span className="font-normal text-slate-400">· {visit.page_path}</span></p>
                        {visit.property_id && <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">Property: {visit.property_title ?? visit.property_id}</p>}
                        {visit.event_metadata.control && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Action: {visit.event_metadata.control.replace(/_/g, ' ')}</p>}
                        {visit.event_metadata.destination && <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"><ArrowUpRight className="h-3 w-3" />{visit.event_metadata.destination}</p>}
                        {Array.isArray(visit.event_metadata.filterKeys) && visit.event_metadata.filterKeys.length > 0 && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Filters: {visit.event_metadata.filterKeys.join(', ')}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
                <Pagination page={profile.page} total={profile.visitCount} pageSize={profile.pageSize} onPageChange={setPage} />
                </>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">No website events are available yet. Events are collected after the latest tracking deployment.</p>
              )}
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export default function AdminVisitorActivity() {
  const [range, setRange] = useState<Range>(30)
  const [propertyId, setPropertyId] = useState('')
  const [propertyPage, setPropertyPage] = useState(1)
  const [sitePage, setSitePage] = useState(1)
  const [sitePageSize, setSitePageSize] = useState(20)
  const [visitorType, setVisitorType] = useState<'all' | 'anonymous' | 'registered'>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [trafficSource, setTrafficSource] = useState('')
  const [pagePath, setPagePath] = useState('')
  const [eventType, setEventType] = useState('')
  const [sortBy, setSortBy] = useState<'last_active' | 'first_seen' | 'events' | 'page_views'>('last_active')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [visitors, setVisitors] = useState<VisitorActivity[]>([])
  const [siteVisitors, setSiteVisitors] = useState<SiteVisitorActivity[]>([])
  const [siteVisitorCount, setSiteVisitorCount] = useState(0)
  const [siteVisitorTotal, setSiteVisitorTotal] = useState(0)
  const [propertyVisitorCount, setPropertyVisitorCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<VisitorActivity | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedSiteVisitor, setSelectedSiteVisitor] = useState<SiteVisitorActivity | null>(null)
  const [siteVisitorOpen, setSiteVisitorOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState<string>()
  const loadRequest = useRef(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    const requestId = ++loadRequest.current
    setLoading(true)
    setError('')
    try {
      const filters: SiteVisitorFilters = {
        search,
        location: locationFilter,
        trafficSource,
        pagePath,
        eventType,
        sortBy,
        from: fromDate,
        to: toDate,
        visitorType,
      }
      const result = await getAdminVisitorActivity(
        range, propertyId || undefined, propertyPage, sitePage, sitePageSize, filters,
      )
      if (requestId !== loadRequest.current) return
      setVisitors(result.visitors)
      setSiteVisitors(result.siteVisitors)
      setSiteVisitorCount(result.siteVisitorCount)
      setSiteVisitorTotal(result.siteVisitorTotal)
      setPropertyVisitorCount(result.propertyVisitorCount)
    } catch (reason) {
      if (requestId !== loadRequest.current) return
      setError(reason instanceof Error ? reason.message : 'Could not load visitor activity.')
    } finally {
      if (requestId === loadRequest.current) setLoading(false)
    }
  }, [range, propertyId, propertyPage, sitePage, sitePageSize, search, locationFilter, trafficSource, pagePath, eventType, sortBy, fromDate, toDate, visitorType])

  useEffect(() => {
    setPropertyPage(1)
  }, [range, propertyId, visitorType])

  useEffect(() => {
    setSitePage(1)
  }, [range, sitePageSize, search, locationFilter, trafficSource, pagePath, eventType, sortBy, fromDate, toDate, visitorType])

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email ?? undefined))
    void supabase.from('properties').select('id, title, city').order('title')
      .then(({ data, error: propertyError }) => {
        if (propertyError) {
          setError(propertyError.message)
          return
        }
        setProperties((data ?? []) as PropertyOption[])
      })
  }, [])

  useEffect(() => { void load() }, [load])

  function openRecord(record: VisitorActivity) {
    setSelected(record)
    setOpen(true)
  }

  function openSiteVisitor(record: SiteVisitorActivity) {
    setSelectedSiteVisitor(record)
    setSiteVisitorOpen(true)
  }

  const registeredCount = visitors.filter(visitor => visitor.registered).length
  const anonymousCount = visitors.length - registeredCount

  return (
    <AuthGuard require="admin">
      <MobileSidebarProvider>
        <div className="flex h-screen h-[100dvh] overflow-hidden bg-[#F5F8FC]">
          <AdminSidebar userEmail={adminEmail} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminHeader title="Visitor Activity" subtitle="Property interactions and anonymous site-wide visits" />
            <main className="flex-1 overflow-y-auto p-3 pb-16 md:p-5">
              <div className="mx-auto max-w-[1440px] space-y-4">
                <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {rangeOptions.map(option => (
                      <button key={option.value} type="button" aria-pressed={range === option.value} onClick={() => { setRange(option.value); setFromDate(''); setToDate('') }}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] ${range === option.value ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>
                        {option.label}
                      </button>
                    ))}
                    <Select value={visitorType} onValueChange={value => setVisitorType(value as 'all' | 'anonymous' | 'registered')}>
                      <SelectTrigger aria-label="Filter by visitor type" className="h-9 min-w-0 max-w-full rounded-xl text-xs sm:w-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All visitor types</SelectItem>
                        <SelectItem value="anonymous">Anonymous</SelectItem>
                        <SelectItem value="registered">Registered (property activity)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={propertyId || '__all_properties__'} onValueChange={value => setPropertyId(value === '__all_properties__' ? '' : value)}>
                      <SelectTrigger aria-label="Filter by property" className="h-9 min-w-0 max-w-full rounded-xl text-xs sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all_properties__">All properties</SelectItem>
                        {properties.map(property => <SelectItem key={property.id} value={property.id}>{property.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-[background-color,box-shadow,transform] hover:bg-blue-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </section>

                <section aria-label="Visitor activity summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {[
                    { label: 'Property records (range)', value: propertyVisitorCount, icon: Activity },
                    { label: 'Registered shown', value: registeredCount, icon: UserRound },
                    { label: 'Anonymous shown', value: anonymousCount, icon: Eye },
                    { label: 'Site visitors (all time)', value: siteVisitorTotal, icon: Globe2 },
                  ].map(metric => {
                    const Icon = metric.icon
                    return <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] font-medium text-slate-500 sm:text-xs">{metric.label}</p>
                        <Icon className="h-4 w-4 text-slate-400" />
                      </div>
                      <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{loading ? '—' : metric.value.toLocaleString()}</p>
                    </article>
                  })}
                </section>
                <p className="text-xs text-slate-500">
                  Website journeys remain pseudonymous and are never linked to signed-in identities. Registered records appear only in the separate property interaction list.
                </p>

                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Property visitor records</h2>
                      <p className="mt-0.5 text-xs text-slate-500">{propertyVisitorCount.toLocaleString()} matching property sessions · 25 per page. Select a record to view its restricted profile.</p>
                    </div>
                    <span className="hidden items-center gap-1 text-[10px] text-slate-400 sm:inline-flex"><Eye className="h-3.5 w-3.5" /> Access is audited</span>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading activity…</div>
                  ) : visitors.length ? (
                    <div className="divide-y divide-slate-100">
                      {visitors.map(visitor => (
                        <button key={visitor.id} type="button" onClick={() => openRecord(visitor)}
                          className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                          <span className={`inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${visitor.registered ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {visitor.registered ? 'Registered' : 'Anonymous'}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800">{visitor.propertyTitle}</span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {visitor.interactions.filter(item => item.type !== 'unique_visitor').map(item => interactionLabels[item.type] ?? item.type).join(' · ') || 'Property visit'}
                            </span>
                          </span>
                          <span className="shrink-0 text-left text-xs text-slate-400 sm:text-right">
                            <span className="block">{dateTime(visitor.lastSeenAt)}</span>
                            <span className="mt-0.5 block">{visitor.propertyCity}</span>
                          </span>
                        </button>
                      ))}
                      <Pagination page={propertyPage} total={propertyVisitorCount} pageSize={25} onPageChange={setPropertyPage} />
                    </div>
                  ) : (
                    <div className="px-5 py-12 text-center">
                      <Activity className="mx-auto h-7 w-7 text-slate-300" />
                      <p className="mt-2 text-sm font-medium text-slate-700">No visitor activity found</p>
                      <p className="mt-1 text-xs text-slate-400">Try a longer date range or another property.</p>
                    </div>
                  )}
                </section>
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Website visitor records</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {siteVisitorCount.toLocaleString()} matching records · {siteVisitorTotal.toLocaleString()} retained overall
                      </p>
                    </div>
                    <span className="hidden items-center gap-1 text-[10px] text-slate-400 sm:inline-flex">
                      <Eye className="h-3.5 w-3.5" /> Detail access is audited
                    </span>
                  </div>
                  <div className="grid gap-2 border-b border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="relative sm:col-span-2 lg:col-span-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength={100}
                        placeholder="Search reference or page" aria-label="Search visitor records"
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                    </label>
                    <label className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input value={locationFilter} onChange={event => setLocationFilter(event.target.value)} maxLength={100}
                        placeholder="Location" aria-label="Filter by approximate location"
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                    </label>
                    <label className="relative">
                      <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input value={pagePath} onChange={event => setPagePath(event.target.value)} maxLength={300}
                        placeholder="Page path contains…" aria-label="Filter by page visited"
                        className="h-9 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                    </label>
                    <Select value={trafficSource || '__all_sources__'} onValueChange={value => setTrafficSource(value === '__all_sources__' ? '' : value)}>
                      <SelectTrigger aria-label="Filter by traffic source" className="h-9 min-w-0 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all_sources__">All traffic sources</SelectItem>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="organic_search">Organic search</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="referral">External referral</SelectItem>
                        <SelectItem value="campaign">Campaign</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={eventType || '__all_events__'} onValueChange={value => setEventType(value === '__all_events__' ? '' : value)}>
                      <SelectTrigger aria-label="Filter by website event" className="h-9 min-w-0 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all_events__">All event types</SelectItem>
                        {Object.entries(siteEventLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={value => setSortBy(value as typeof sortBy)}>
                      <SelectTrigger aria-label="Sort visitor records" className="h-9 min-w-0 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last_active">Sort: Last active</SelectItem>
                        <SelectItem value="first_seen">Sort: First seen</SelectItem>
                        <SelectItem value="events">Sort: Most events</SelectItem>
                        <SelectItem value="page_views">Sort: Most page views</SelectItem>
                      </SelectContent>
                    </Select>
                    <DateFilter label="Start date" value={fromDate} max={toDate || undefined}
                      onChange={value => {
                        if (!value || !toDate || value <= toDate) setFromDate(value)
                      }} />
                    <DateFilter label="End date" value={toDate} min={fromDate || undefined}
                      onChange={value => {
                        if (!value || !fromDate || value >= fromDate) setToDate(value)
                      }} />
                    <label className="flex h-9 min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 shadow-sm">
                      <span>Records per page</span>
                      <Select value={String(sitePageSize)} onValueChange={value => setSitePageSize(Number(value))}>
                        <SelectTrigger aria-label="Records per page" className="h-7 w-[4.25rem] rounded-lg border-transparent px-2 text-xs font-semibold shadow-none focus:ring-2 focus:ring-blue-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {[20, 30, 50, 100].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading site visits…</div>
                  ) : siteVisitors.length ? (
                    <>
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[900px] text-left">
                          <thead className="bg-white text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            <tr>
                              <th className="px-4 py-3">Visitor reference</th>
                              <th className="px-4 py-3">Origin / source</th>
                              <th className="px-4 py-3">Last visited page</th>
                              <th className="px-4 py-3">Activity</th>
                              <th className="px-4 py-3">First seen</th>
                              <th className="px-4 py-3">Last active</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {siteVisitors.map(visitor => (
                              <tr key={visitor.id} className="group">
                                <td className="px-4 py-3">
                                  <button type="button" onClick={() => openSiteVisitor(visitor)} className="flex max-w-[220px] items-center gap-2 text-left">
                                    <Globe2 className="h-4 w-4 shrink-0 text-blue-600" />
                                    <span className="truncate font-mono text-[11px] text-slate-700">{visitor.id}</span>
                                  </button>
                                  <span className="ml-6 mt-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Anonymous</span>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-xs font-medium text-slate-700">{visitorLocation(visitor)}</p>
                                  <p className="mt-1 text-[10px] capitalize text-slate-500">{visitor.trafficSource?.replace(/_/g, ' ') ?? 'Unknown'}{visitor.referrerDomain ? ` · ${visitor.referrerDomain}` : ''}</p>
                                </td>
                                <td className="max-w-[200px] px-4 py-3">
                                  <p className="truncate text-xs font-medium capitalize text-slate-700">{pageName(visitor.lastVisitedPath)}</p>
                                  <p className="mt-1 truncate text-[10px] text-slate-400">{visitor.lastVisitedPath ?? '—'}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-xs font-semibold text-slate-700">{visitor.totalEvents.toLocaleString()} events</p>
                                  <p className="mt-1 text-[10px] text-slate-500">{siteEventLabels[visitor.lastEventType ?? ''] ?? 'Activity recorded'} · {visitor.pageViews.toLocaleString()} views</p>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500">{dateTime(visitor.firstSeenAt)}</td>
                                <td className="px-4 py-3 text-xs text-slate-500">{dateTime(visitor.lastSeenAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="divide-y divide-slate-100 md:hidden">
                        {siteVisitors.map(visitor => (
                          <button key={visitor.id} type="button" onClick={() => openSiteVisitor(visitor)}
                            className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Globe2 className="h-4 w-4" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono text-[10px] text-slate-500">{visitor.id}</span>
                              <span className="mt-1 block truncate text-sm font-semibold capitalize text-slate-800">{pageName(visitor.lastVisitedPath)}</span>
                              <span className="mt-1 block truncate text-xs text-slate-500">{visitorLocation(visitor)} · {visitor.trafficSource?.replace(/_/g, ' ') ?? 'Unknown source'}</span>
                              <span className="mt-1 block text-[10px] text-slate-400">{visitor.totalEvents.toLocaleString()} events</span>
                              <span className="mt-1 block text-[10px] text-slate-400">First seen {dateTime(visitor.firstSeenAt)} · Last active {dateTime(visitor.lastSeenAt)}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="px-5 py-12 text-center">
                      <Globe2 className="mx-auto h-7 w-7 text-slate-300" />
                      <p className="mt-2 text-sm font-medium text-slate-700">No matching website visitors</p>
                      <p className="mt-1 text-xs text-slate-400">Try adjusting the search, filters, or date range.</p>
                    </div>
                  )}
                  <Pagination page={sitePage} total={siteVisitorCount} pageSize={sitePageSize} onPageChange={setSitePage} />
                </section>
              </div>
            </main>
          </div>
        </div>
        <VisitorDialog record={selected} open={open} onOpenChange={setOpen} />
        <SiteVisitorDialog key={selectedSiteVisitor?.id} record={selectedSiteVisitor} open={siteVisitorOpen} onOpenChange={setSiteVisitorOpen} />
      </MobileSidebarProvider>
    </AuthGuard>
  )
}

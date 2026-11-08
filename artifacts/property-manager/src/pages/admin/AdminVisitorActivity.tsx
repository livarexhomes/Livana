import { useCallback, useEffect, useState } from 'react'
import { Activity, Clock3, Eye, Loader2, MessageSquare, RefreshCw, UserRound, Users } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '../../lib/supabase'
import {
  getAdminVisitorActivity,
  getAdminVisitorProfile,
  sendAdminVisitorMessage,
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

type Range = 7 | 30 | 90 | 'all'
type PropertyOption = { id: string; title: string; city: string }

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

function dateTime(value: string) {
  return format(new Date(value), 'd MMM yyyy, h:mm a')
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

export default function AdminVisitorActivity() {
  const [range, setRange] = useState<Range>(30)
  const [propertyId, setPropertyId] = useState('')
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [visitors, setVisitors] = useState<VisitorActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<VisitorActivity | null>(null)
  const [open, setOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState<string>()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getAdminVisitorActivity(range, propertyId || undefined)
      setVisitors(result.visitors)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load visitor activity.')
    } finally {
      setLoading(false)
    }
  }, [range, propertyId])

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

  const registeredCount = visitors.filter(visitor => visitor.registered).length
  const anonymousCount = visitors.length - registeredCount

  return (
    <AuthGuard require="admin">
      <MobileSidebarProvider>
        <div className="flex h-screen h-[100dvh] overflow-hidden bg-[#F5F8FC]">
          <AdminSidebar userEmail={adminEmail} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminHeader title="Visitor Activity" subtitle="Restricted property interaction records" />
            <main className="flex-1 overflow-y-auto p-3 pb-16 md:p-5">
              <div className="mx-auto max-w-[1440px] space-y-4">
                <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {rangeOptions.map(option => (
                      <button key={option.value} type="button" aria-pressed={range === option.value} onClick={() => setRange(option.value)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${range === option.value ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                        {option.label}
                      </button>
                    ))}
                    <select aria-label="Filter by property" value={propertyId} onChange={event => setPropertyId(event.target.value)}
                      className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 sm:w-64">
                      <option value="">All properties</option>
                      {properties.map(property => <option key={property.id} value={property.id}>{property.title}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </section>

                <section aria-label="Visitor activity summary" className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: 'Visitor records', value: visitors.length, icon: Activity },
                    { label: 'Registered', value: registeredCount, icon: UserRound },
                    { label: 'Anonymous', value: anonymousCount, icon: Eye },
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

                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Property visitor records</h2>
                      <p className="mt-0.5 text-xs text-slate-500">Up to 250 recent visitor sessions. Select a record to view its restricted profile.</p>
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
                    </div>
                  ) : (
                    <div className="px-5 py-12 text-center">
                      <Activity className="mx-auto h-7 w-7 text-slate-300" />
                      <p className="mt-2 text-sm font-medium text-slate-700">No visitor activity found</p>
                      <p className="mt-1 text-xs text-slate-400">Try a longer date range or another property.</p>
                    </div>
                  )}
                </section>
              </div>
            </main>
          </div>
        </div>
        <VisitorDialog record={selected} open={open} onOpenChange={setOpen} />
      </MobileSidebarProvider>
    </AuthGuard>
  )
}

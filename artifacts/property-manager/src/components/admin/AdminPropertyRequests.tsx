import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { PropertyRequest, PropertyRequestStatus } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'


const STATUSES: PropertyRequestStatus[] = [
  'submitted',
  'reviewing',
  'searching',
  'matched',
  'inspection',
  'completed',
  'closed',
]
const LABELS: Record<PropertyRequestStatus, string> = {
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  searching: 'Searching',
  matched: 'Matched',
  inspection: 'Inspection',
  completed: 'Completed',
  closed: 'Closed',
}
const PAGE_SIZE = 30
const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value)
const reference = (id: string) => `PR-${id.slice(0, 8).toUpperCase()}`
const date = (value: string) =>
  new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Unable to complete this action. Please retry.'
// Strip PostgREST expression syntax from free-text search, including LIKE wildcards.
const searchTerm = (value: string) =>
  value
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .slice(0, 100)

type Listing = {
  id: string
  title: string
  city: string
  price: number
  type: string
  status: string
}
type Match = {
  id: string
  property_id: string
  status: string
  properties: Listing | null
}
type RequestRow = PropertyRequest & {
  tenants: {
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
  property_request_matches?: Match[]
}
const REQUEST_SELECT = '*, tenants(full_name, email, phone)'
const DETAIL_SELECT = `${REQUEST_SELECT}, property_request_matches(id, property_id, status, properties(id, title, city, price, type, status))`

function Status({ value }: { value: PropertyRequestStatus }) {
  return (
    <span className={`pr-status pr-status-${value}`}>
      {LABELS[value] ?? value}
    </span>
  )
}

function MatchPicker({
  request,
  onSaved,
  onClose,
}: {
  request: RequestRow
  onSaved: () => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [listings, setListings] = useState<Listing[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Listing | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  const matched = new Set(
    request.property_request_matches?.map((match) => match.property_id),
  )

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try {
        let q = createClient()
          .from('properties')
          .select('id, title, city, price, type, status')
          .eq('status', 'available')
        const term = searchTerm(query)
        if (term) q = q.or(`title.ilike.%${term}%,city.ilike.%${term}%`)
        const { data, error } = await q
          .order('created_at', { ascending: false })
          .order('id')
          .range(page * 20, page * 20 + 20)
          .abortSignal(abort.signal)
        if (error) throw new Error(error.message)
        if (!abort.signal.aborted) {
          setListings((data ?? []).slice(0, 20))
          setHasMore((data?.length ?? 0) > 20)
        }
      } catch (error) {
        if (!abort.signal.aborted) setError(errorText(error))
      } finally {
        if (!abort.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      abort.abort()
    }
  }, [query, page, retry])

  async function addMatch() {
    if (!selected || lock.current) return
    lock.current = true
    setSaving(true)
    setError('')
    try {
      const db = createClient()
      const [existing, listing] = await Promise.all([
        db
          .from('property_request_matches')
          .select('id')
          .eq('request_id', request.id)
          .eq('property_id', selected.id)
          .limit(1),
        db
          .from('properties')
          .select('id')
          .eq('id', selected.id)
          .eq('status', 'available')
          .maybeSingle(),
      ])
      if (existing.error) throw new Error(existing.error.message)
      if (listing.error) throw new Error(listing.error.message)
      if (existing.data?.length)
        throw new Error(
          'This property is already matched. Close this panel and refresh the request.',
        )
      if (!listing.data)
        throw new Error(
          'This listing is no longer available. Choose another property.',
        )
      const { data, error } = await db
        .from('property_request_matches')
        .insert({
          request_id: request.id,
          property_id: selected.id,
          status: 'shared',
          shared_with_customer_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (error || !data)
        throw new Error(error?.message ?? 'The match was not saved.')
      onSaved()
    } catch (error) {
      setError(errorText(error))
    } finally {
      lock.current = false
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !lock.current) onClose()
      }}
    >
      <DialogContent className="pr-match-dialog max-h-[90dvh] max-w-xl overflow-y-auto rounded-lg p-5">
        <DialogHeader>
          <DialogTitle>Add property match</DialogTitle>
          <DialogDescription>
            Choose an available listing for {reference(request.id)}.
          </DialogDescription>
        </DialogHeader>
        <label className="pr-field">
          Search listings
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(0)
              setSelected(null)
            }}
            placeholder="Property title or city"
          />
        </label>
        {loading ? (
          <p role="status">Loading listings…</p>
        ) : (
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {listings.map((listing) => (
              <button
                type="button"
                key={listing.id}
                disabled={matched.has(listing.id) || saving}
                aria-pressed={selected?.id === listing.id}
                className={`flex w-full items-center justify-between gap-3 p-3 text-left text-sm disabled:opacity-50 ${selected?.id === listing.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                onClick={() => setSelected(listing)}
              >
                <span className="min-w-0">
                  <strong className="block break-words">{listing.title}</strong>
                  <span className="text-xs text-slate-500">
                    {listing.city} · {money(listing.price)} · {listing.type}
                  </span>
                </span>
                {matched.has(listing.id) ? (
                  <span className="text-xs">Already matched</span>
                ) : selected?.id === listing.id ? (
                  <Check className="h-4 w-4 shrink-0 text-blue-600" />
                ) : null}
              </button>
            ))}
            {!listings.length && !error && (
              <p className="py-5 text-sm text-slate-500">
                No available listings found.
              </p>
            )}
          </div>
        )}
        <div className="flex justify-between">
          <button
            className="pr-button"
            disabled={page === 0 || loading || saving}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <button
            className="pr-button"
            disabled={!hasMore || loading || saving}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
        <p className="border-l-2 border-blue-500 pl-3 text-sm text-slate-600">
          Adding a match makes it visible to the customer. It does not change
          the request status or send a notification.
        </p>
        {selected && (
          <p className="text-sm">
            Selected: <strong>{selected.title}</strong>
          </p>
        )}
        {error && (
          <div role="alert" className="text-sm text-red-700">
            {error}{' '}
            <button
              className="underline"
              onClick={() => setRetry((n) => n + 1)}
            >
              Retry search
            </button>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button className="pr-button" disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button
            className="pr-button pr-primary"
            disabled={!selected || saving || loading}
            onClick={addMatch}
          >
            {saving ? 'Adding…' : 'Add customer-visible match'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RequestDetail({
  id,
  onBack,
  onChanged,
}: {
  id: string
  onBack: () => void
  onChanged: () => void
}) {
  const [request, setRequest] = useState<RequestRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [nextStatus, setNextStatus] =
    useState<PropertyRequestStatus>('submitted')
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState(false)
  const [section, setSection] = useState<'overview' | 'progress' | 'matches'>(
    'overview',
  )
  const lock = useRef(false)
  const generation = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)

  const load = useCallback(async () => {
    const version = ++generation.current
    setLoading(true)
    setError('')
    try {
      const { data, error } = await createClient()
        .from('property_requests')
        .select(DETAIL_SELECT)
        .eq('id', id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data)
        throw new Error(
          'Request unavailable. It may have been removed or your access may have changed.',
        )
      if (version === generation.current) {
        setRequest(data as RequestRow)
        setNextStatus(data.status as PropertyRequestStatus)
      }
    } catch (error) {
      if (version === generation.current) setError(errorText(error))
    } finally {
      if (version === generation.current) setLoading(false)
    }
  }, [id])
  useEffect(() => {
    void load()
    return () => {
      generation.current++
    }
  }, [load])
  useEffect(() => {
    heading.current?.focus()
  }, [loading])

  async function saveStatus() {
    if (
      !request ||
      lock.current ||
      nextStatus === request.status ||
      !STATUSES.includes(nextStatus)
    )
      return
    lock.current = true
    setSaving(true)
    setError('')
    setNotice('')
    const version = generation.current
    try {
      // Conditional write avoids silently overwriting another admin's newer update.
      const { data, error } = await createClient()
        .from('property_requests')
        .update({ status: nextStatus })
        .eq('id', id)
        .eq('updated_at', request.updated_at)
        .select('id, status, updated_at')
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data)
        throw new Error(
          'This request changed or you no longer have access. Refresh before trying again.',
        )
      if (version === generation.current) {
        setRequest((previous) =>
          previous
            ? {
                ...previous,
                status: data.status as PropertyRequestStatus,
                updated_at: data.updated_at,
              }
            : previous,
        )
        setNotice(
          `Status changed to ${LABELS[data.status as PropertyRequestStatus]}.`,
        )
        onChanged()
      }
    } catch (error) {
      if (version === generation.current) setError(errorText(error))
    } finally {
      lock.current = false
      if (version === generation.current) setSaving(false)
    }
  }

  return (
    <div className="pr-detail-shell">
      <div className="pr-detail-toolbar">
        <button className="pr-button pr-back" onClick={onBack}>
          <ArrowLeft size={14} /> Requests
        </button>
        <span className="text-xs text-slate-400">Request workspace</span>
        <button
          className="pr-button ml-auto"
          disabled={loading || saving}
          onClick={() => void load()}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {notice && (
        <p role="status" className="px-5 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="px-5 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <div className="p-6 text-sm text-slate-500" role="status">
          Loading request…
        </div>
      ) : request ? (
        <>
          <nav className="pr-section-nav" aria-label="Request sections">
            {(['overview', 'progress', 'matches'] as const).map((value) => (
              <button
                key={value}
                aria-pressed={section === value}
                onClick={() => setSection(value)}
              >
                {value === 'progress'
                  ? 'Progress & actions'
                  : value === 'matches'
                    ? 'Matches'
                    : 'Overview'}
              </button>
            ))}
          </nav>
          <div className="pr-detail-grid" data-section={section}>
            <main className="pr-overview">
              <header className="pr-request-heading">
                <p
                  title={request.id}
                  className="text-xs font-semibold text-blue-600"
                >
                  {reference(request.id)}
                </p>
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="mt-2 text-xl font-bold tracking-tight text-slate-900 outline-none"
                >
                  {request.property_type} · {request.purpose}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {request.preferred_area}, {request.state}
                </p>
              </header>
              <section className="pr-overview-fields">
                <h3 className="pr-heading">Customer</h3>
                <p className="text-sm font-semibold">
                  {request.tenants?.full_name || 'Name unavailable'}
                </p>
                <p className="mt-1 break-words text-xs text-slate-500">
                  {[request.tenants?.email, request.tenants?.phone]
                    .filter(Boolean)
                    .join(' · ') || 'No contact information available'}
                </p>
                <h3 className="pr-heading mt-7">Request requirements</h3>
                <dl className="pr-requirements">
                  {[
                    ['Purpose', request.purpose],
                    ['Property type', request.property_type],
                    ['Location', `${request.preferred_area}, ${request.state}`],
                    [
                      'Alternative areas',
                      request.alternative_areas?.join(', ') || 'None specified',
                    ],
                    [
                      'Budget',
                      `${money(request.min_budget)} – ${money(request.max_budget)}`,
                    ],
                    ['Bedrooms', request.bedrooms ?? 'Any'],
                    ['Bathrooms', request.bathrooms ?? 'Any'],
                    ['Furnishing', request.furnishing || 'Any'],
                    ['Move-in', request.move_in_timeline || 'Flexible'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <h3 className="pr-heading mt-6">Must-haves</h3>
                <div className="flex flex-wrap gap-2">
                  {request.features?.length ? (
                    request.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        {feature}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">None specified</p>
                  )}
                </div>
                <h3 className="pr-heading mt-6">Customer notes</h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                  {request.notes || 'No additional notes.'}
                </p>
              </section>
              <section className="pr-matches">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="pr-heading mb-0">
                    Matched properties (
                    {request.property_request_matches?.length ?? 0})
                  </h3>
                  <button
                    className="pr-button"
                    disabled={saving || !!error}
                    onClick={() => setPicker(true)}
                  >
                    <Plus size={14} /> Add property match
                  </button>
                </div>
                {!request.property_request_matches?.length && (
                  <p className="py-5 text-sm text-slate-500">
                    No properties have been matched yet.
                  </p>
                )}
                <div className="divide-y divide-slate-100">
                  {request.property_request_matches?.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-start justify-between gap-3 py-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-semibold">
                          {match.properties?.title || 'Listing unavailable'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {match.properties
                            ? `${match.properties.city} · ${money(match.properties.price)} · ${match.properties.type}`
                            : 'Property details could not be loaded.'}
                        </p>
                        <p className="mt-1 text-xs capitalize text-slate-500">
                          {match.status}
                        </p>
                      </div>
                      {match.properties && (
                        <a
                          href={`/listings/${match.property_id}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`View ${match.properties.title}`}
                          className="pr-button"
                        >
                          <ArrowUpRight size={15} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </main>
            <aside className="pr-workflow">
              <h3 className="pr-heading">Current status</h3>
              <Status value={request.status} />
              <h3 className="pr-heading mt-6">Request progress</h3>
              <p className="mb-4 text-xs leading-5 text-slate-500">
                Based on the current status, not a record of individual stage
                completion.
              </p>
              {request.status === 'closed' ? (
                <p className="border-l-2 border-slate-300 pl-3 text-sm text-slate-600">
                  Closed. Earlier stages are not recorded; closure does not
                  imply completion.
                </p>
              ) : (
                <ol className="pr-progress">
                  {STATUSES.filter((status) => status !== 'closed').map(
                    (status) => {
                      const active = request.status === status
                      const passed =
                        STATUSES.indexOf(status) <
                        STATUSES.indexOf(request.status)
                      return (
                        <li
                          key={status}
                          aria-current={active ? 'step' : undefined}
                          data-passed={passed}
                        >
                          <span>
                            {passed ? (
                              <Check size={12} />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                          </span>
                          <div>
                            {LABELS[status]}
                            {status === 'submitted' && (
                              <small>Request sent and received</small>
                            )}
                            {status === 'reviewing' && (
                              <small>Admin acknowledgement and review</small>
                            )}
                          </div>
                        </li>
                      )
                    },
                  )}
                </ol>
              )}
              <form
                className="mt-6 border-t border-slate-200 pt-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  void saveStatus()
                }}
              >
                <label className="pr-field">
                  Change status
                  <select
                    value={nextStatus}
                    disabled={saving || !!error}
                    onChange={(event) =>
                      setNextStatus(event.target.value as PropertyRequestStatus)
                    }
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                {nextStatus === 'inspection' && (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Tracks inspection coordination only. This does not book an
                    appointment.
                  </p>
                )}
                {nextStatus === 'closed' && nextStatus !== request.status && (
                  <p className="mt-2 text-xs text-slate-500">
                    The customer will see this request as closed.
                  </p>
                )}
                <button
                  type="submit"
                  className="pr-button pr-primary mt-3 w-full"
                  disabled={saving || nextStatus === request.status || !!error}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Saving…
                    </>
                  ) : (
                    'Save status'
                  )}
                </button>
              </form>
              <dl className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-xs text-slate-500">
                <div>
                  <dt>Submitted</dt>
                  <dd className="mt-1 text-slate-700">
                    {date(request.created_at)}
                  </dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd className="mt-1 text-slate-700">
                    {date(request.updated_at)}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
          {picker && (
            <MatchPicker
              request={request}
              onClose={() => setPicker(false)}
              onSaved={() => {
                setPicker(false)
                setNotice('Property match added and visible to the customer.')
                void load()
                onChanged()
              }}
            />
          )}
        </>
      ) : null}
    </div>
  )
}

export default function AdminPropertyRequests() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [purpose, setPurpose] = useState('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const searchInput = useRef<HTMLInputElement>(null)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try {
        let q = createClient().from('property_requests').select(REQUEST_SELECT)
        if (status !== 'all') q = q.eq('status', status)
        if (purpose !== 'all') q = q.eq('purpose', purpose)
        const term = searchTerm(query)
        if (
          /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
            term,
          )
        )
          q = q.eq('id', term)
        else if (term)
          q = q.or(
            `property_type.ilike.%${term}%,preferred_area.ilike.%${term}%,state.ilike.%${term}%`,
          )
        const { data, error } = await q
          .order('updated_at', { ascending: false })
          .order('id')
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
          .abortSignal(abort.signal)
        if (error) throw new Error(error.message)
        if (!abort.signal.aborted) {
          setRows((data ?? []).slice(0, PAGE_SIZE) as RequestRow[])
          setHasMore((data?.length ?? 0) > PAGE_SIZE)
        }
      } catch (error) {
        if (!abort.signal.aborted) setError(errorText(error))
      } finally {
        if (!abort.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      abort.abort()
    }
  }, [query, status, purpose, page, revision])

  return (
    <div className="pr-workspace" data-selected={!!selected}>
      <style>{propertyRequestStyles}</style>
      <div className="pr-layout">
        <aside className="pr-list" aria-label="Property requests">
          <div className="pr-list-tools">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Property requests</h2>
              <button
                className="pr-button"
                aria-label="Refresh request list"
                disabled={loading}
                onClick={refresh}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <label className="pr-search">
              <Search size={15} />
              <input
                ref={searchInput}
                aria-label="Search property requests"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(0)
                }}
                placeholder="Type, location or full request ID"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="pr-field">
                Status
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value)
                    setPage(0)
                  }}
                >
                  <option value="all">All statuses</option>
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pr-field">
                Purpose
                <select
                  value={purpose}
                  onChange={(event) => {
                    setPurpose(event.target.value)
                    setPage(0)
                  }}
                >
                  <option value="all">All purposes</option>
                  {['Rent', 'Lease', 'Buy'].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="pr-list-rows" aria-busy={loading}>
            {loading ? (
              <p role="status" className="p-5 text-sm text-slate-500">
                Loading requests…
              </p>
            ) : error ? (
              <div role="alert" className="p-4 text-sm text-red-700">
                {error}
                <button className="pr-button mt-3" onClick={refresh}>
                  Retry
                </button>
              </div>
            ) : rows.length ? (
              rows.map((request) => (
                <button
                  className="pr-list-row"
                  key={request.id}
                  aria-pressed={selected === request.id}
                  onClick={() => setSelected(request.id)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      title={request.id}
                      className="text-[11px] font-semibold text-slate-500"
                    >
                      {reference(request.id)}
                    </span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </span>
                  <strong className="mt-2 block text-sm">
                    {request.property_type} · {request.purpose}
                  </strong>
                  <span className="mt-1 block text-xs text-slate-500">
                    {request.preferred_area}, {request.state}
                  </span>
                  <span className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Status value={request.status} />
                    <time
                      className="text-[10px] text-slate-400"
                      dateTime={request.updated_at}
                    >
                      {date(request.updated_at)}
                    </time>
                  </span>
                </button>
              ))
            ) : (
              <div className="p-5 text-sm text-slate-500">
                No requests found.
                {(query || status !== 'all' || purpose !== 'all') && (
                  <button
                    className="mt-3 block text-blue-600"
                    onClick={() => {
                      setQuery('')
                      setStatus('all')
                      setPurpose('all')
                      setPage(0)
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="pr-pagination">
            <button
              className="pr-button"
              disabled={!page || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">Page {page + 1}</span>
            <button
              className="pr-button"
              disabled={!hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </aside>
        {selected ? (
          <RequestDetail
            key={selected}
            id={selected}
            onChanged={refresh}
            onBack={() => {
              setSelected(null)
              requestAnimationFrame(() => searchInput.current?.focus())
            }}
          />
        ) : (
          <div className="pr-empty">
            <h2 className="text-base font-semibold text-slate-700">
              Select a property request
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
              Review customer requirements, share matching properties and manage
              request progress.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const propertyRequestStyles = `
.pr-workspace{display:flex;flex:1;min-width:0;min-height:0;background:#fff;color:#0f172a;color-scheme:light;font-size:14px}
.pr-workspace *, .pr-match-dialog *{box-sizing:border-box}
.pr-layout{display:flex;flex:1;min-width:0;min-height:0;overflow:hidden}
.pr-list{display:flex;flex-direction:column;width:340px;flex-shrink:0;border-right:1px solid #e2e8f0;background:#fff;min-height:0}
.pr-list-tools{padding:22px 18px 18px;border-bottom:1px solid #e2e8f0;display:grid;gap:16px}
.pr-list-tools h2{font-size:15px;letter-spacing:-.025em;color:#0f172a}
.pr-search{display:flex;align-items:center;gap:10px;border:1px solid #dbe3ef;border-radius:12px;padding:0 12px;background:#fff;color:#64748b}
.pr-search input{width:100%;min-width:0;border:0;background:transparent;padding:12px 0;color:#0f172a;font-size:13px;outline:none}
.pr-search:focus-within{border-color:#2563eb;box-shadow:0 0 0 3px #eff6ff}
.pr-field{display:grid;gap:7px;font-size:12px;font-weight:600;color:#475569}
.pr-field input,.pr-field select{width:100%;min-width:0;min-height:42px;padding:10px 12px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#0f172a;font-size:13px;font-weight:400;color-scheme:light}
.pr-list-rows{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:10px}
.pr-list-row{position:relative;display:block;width:100%;padding:16px;margin-bottom:8px;border:1px solid #e5eaf2;border-radius:13px;background:#fff;text-align:left;color:#0f172a;transition:background .15s,border-color .15s}
.pr-list-row:hover{background:#f8fbff;border-color:#bfdbfe}
.pr-list-row[aria-pressed=true]{background:#eff6ff;border-color:#93c5fd;box-shadow:inset 3px 0 #2563eb}
.pr-list-row strong{font-size:14px;font-weight:650;line-height:1.5}
.pr-pagination{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #e2e8f0;padding:12px 14px;background:#fff}
.pr-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:8px 12px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:#334155;font-size:12px;font-weight:600;line-height:1.4;cursor:pointer;transition:background .15s,border-color .15s}
.pr-button:hover:not(:disabled){background:#f8fafc;border-color:#94a3b8}
.pr-button:disabled{opacity:.45;cursor:not-allowed}
.pr-primary{background:#2563eb;border-color:#2563eb;color:#fff;box-shadow:0 3px 8px #2563eb18}
.pr-primary:hover:not(:disabled){background:#1d4ed8;border-color:#1d4ed8}
.pr-workspace button:focus-visible,.pr-match-dialog button:focus-visible,.pr-field input:focus-visible,.pr-field select:focus-visible{outline:2px solid #3b82f6;outline-offset:3px}
.pr-status{display:inline-flex;align-items:center;gap:6px;width:fit-content;padding:5px 9px;border-radius:7px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:600;line-height:1.4}
.pr-status:before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor}
.pr-status-reviewing,.pr-status-searching{background:#eff6ff;color:#1d4ed8}
.pr-status-matched,.pr-status-completed{background:#ecfdf5;color:#047857}
.pr-status-inspection{background:#fffbeb;color:#b45309}
.pr-detail-shell{display:flex;flex:1;flex-direction:column;min-width:0;min-height:0;background:#fff}
.pr-detail-toolbar{display:flex;align-items:center;gap:12px;min-height:62px;padding:12px 24px;border-bottom:1px solid #e2e8f0;background:#fff;flex-shrink:0}
.pr-back{display:none}
.pr-section-nav{display:flex;gap:6px;flex-wrap:wrap;padding:12px 24px;border-bottom:1px solid #e2e8f0}
.pr-section-nav button{padding:8px 13px;border-radius:8px;font-size:12px;font-weight:600;color:#64748b;background:#fff;border:1px solid transparent}
.pr-section-nav button[aria-pressed=true]{background:#eff6ff;color:#1d4ed8;border-color:#dbeafe}
.pr-detail-grid{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:minmax(0,1fr) 270px;align-content:start}
.pr-overview{min-width:0;padding:26px}
.pr-request-heading{padding-bottom:22px;border-bottom:1px solid #e2e8f0;margin-bottom:24px}
.pr-heading{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:12px}
.pr-overview-fields{padding-bottom:24px}
.pr-requirements{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 22px}
.pr-requirements>div{padding:12px 0;border-bottom:1px solid #f1f5f9;min-width:0}
.pr-requirements dt{font-size:11px;color:#64748b;margin-bottom:5px}
.pr-requirements dd{margin:0;font-size:13px;color:#0f172a;font-weight:500;overflow-wrap:anywhere}
.pr-matches{border-top:1px solid #e2e8f0;padding-top:22px}
.pr-workflow{padding:26px 20px;border-left:1px solid #e2e8f0;background:#fff;min-width:0}
.pr-progress{list-style:none;padding:0;margin:0}
.pr-progress li{position:relative;display:flex;align-items:flex-start;gap:12px;min-height:52px;color:#94a3b8;font-size:12px;padding-bottom:16px}
.pr-progress li:not(:last-child):before{content:'';position:absolute;left:10px;top:23px;bottom:0;width:1px;background:#e2e8f0}
.pr-progress li>span{position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:21px;height:21px;border:1px solid #e2e8f0;border-radius:50%;background:#fff}
.pr-progress li>div{padding-top:2px;font-weight:600}
.pr-progress small{display:block;font-size:11px;font-weight:400;line-height:1.5;margin-top:4px;color:#64748b}
.pr-progress li[data-passed=true]{color:#2563eb}
.pr-progress li[data-passed=true]>span{background:#eff6ff;border-color:#bfdbfe}
.pr-progress li[aria-current=step]{color:#1d4ed8}
.pr-progress li[aria-current=step]>span{background:#2563eb;border-color:#2563eb;color:#fff;box-shadow:0 0 0 4px #eff6ff}
.pr-empty{display:flex;flex:1;min-width:0;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;background:#fff}
.pr-empty:before{content:'';display:block;width:64px;height:64px;margin-bottom:24px;border:1px solid #bfdbfe;border-radius:20px;background:linear-gradient(90deg,transparent 45%,#93c5fd 45%,#93c5fd 48%,transparent 48%),linear-gradient(0deg,transparent 45%,#93c5fd 45%,#93c5fd 48%,transparent 48%),#eff6ff;box-shadow:0 0 0 8px #f8fbff}
.pr-match-dialog[role=dialog]{background:#fff!important;color:#0f172a!important;color-scheme:light;border:1px solid #e2e8f0;border-radius:20px;padding:26px;width:calc(100vw - 32px);max-width:640px;gap:20px;box-shadow:0 24px 90px #0f172a33}
.pr-match-dialog h2{color:#0f172a!important;font-size:21px;letter-spacing:-.035em}
.pr-match-dialog [id$=description]{color:#64748b!important;font-size:13px;line-height:1.7}
.pr-match-dialog>button{color:#64748b}
.pr-match-dialog .pr-field input{font-size:16px;min-height:46px}
.pr-match-dialog .divide-y{border:1px solid #e2e8f0;border-radius:12px;background:#fff}
.pr-match-dialog .divide-y>p{padding:30px 16px;text-align:center;color:#64748b}
.pr-match-dialog .border-l-2{border:1px solid #dbeafe;border-left:3px solid #3b82f6;border-radius:8px;padding:12px 14px;background:#eff6ff;color:#334155;font-size:12px;line-height:1.7}
.pr-match-dialog .flex.justify-end{flex-wrap:wrap;border-top:1px solid #e2e8f0;padding-top:18px}
.pr-list-rows,.pr-detail-grid,.pr-match-dialog{scrollbar-width:thin;scrollbar-color:#cbd5e1 #fff}
@media(min-width:1280px){.pr-section-nav{display:none}}
@media(max-width:1279px){.pr-detail-grid{display:block}.pr-workflow{border-left:0}.pr-detail-grid[data-section=overview] .pr-workflow,.pr-detail-grid[data-section=overview] .pr-matches{display:none}.pr-detail-grid[data-section=progress] .pr-overview{display:none}.pr-detail-grid[data-section=matches] .pr-workflow,.pr-detail-grid[data-section=matches] .pr-request-heading,.pr-detail-grid[data-section=matches] .pr-overview-fields{display:none}.pr-detail-grid[data-section=matches] .pr-matches{border:0;padding:0}}
@media(max-width:1023px){.pr-list{width:300px}}
@media(max-width:767px){.pr-list{width:100%;border-right:0}.pr-workspace[data-selected=true] .pr-list{display:none}.pr-workspace[data-selected=false] .pr-empty{display:none}.pr-back{display:inline-flex}.pr-overview{padding:20px}.pr-detail-toolbar,.pr-section-nav{padding:12px 16px}.pr-match-dialog[role=dialog]{padding:20px}.pr-requirements{gap:0 14px}}
`

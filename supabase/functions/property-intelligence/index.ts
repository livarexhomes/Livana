import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const trackedEvents = new Set(['impression', 'detail_view', 'contact_admin_click', 'enquiry_initiated'])
const buckets = new Map<string, { startedAt: number; count: number }>()

type EventType = 'impression' | 'detail_view' | 'contact_admin_click' | 'enquiry_initiated'
type WindowDays = 7 | 30 | 90 | null

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function rateLimit(key: string, limit: number) {
  const now = Date.now()
  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) {
      if (now - value.startedAt >= 60_000) buckets.delete(bucketKey)
    }
  }
  const entry = buckets.get(key)
  if (!entry || now - entry.startedAt >= 60_000) {
    buckets.set(key, { startedAt: now, count: 1 })
    return
  }
  if (entry.count >= limit) throw new HttpError(429, 'Too many requests. Please try again shortly.')
  entry.count++
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) throw new HttpError(500, 'Property intelligence is not configured.')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function authenticate(request: Request, allowAnonymous = false) {
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token || token === anonKey) {
    if (allowAnonymous) return null
    throw new HttpError(401, 'Authentication required.')
  }
  if (!url || !anonKey) throw new HttpError(500, 'Property intelligence is not configured.')
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user || data.user.is_anonymous) {
    if (allowAnonymous) throw new HttpError(401, 'Invalid authentication token.')
    throw new HttpError(401, 'Authentication required.')
  }
  return data.user
}

function requireAdmin(user: Awaited<ReturnType<typeof authenticate>>) {
  const metadata = user?.app_metadata ?? {}
  if (!user || !(metadata.role === 'admin' || (Array.isArray(metadata.roles) && metadata.roles.includes('admin')))) {
    throw new HttpError(403, 'Administrator access required.')
  }
  return user
}

function getWindowDays(value: unknown): WindowDays {
  if (value === 'all' || value == null) return null
  if (value === 7 || value === '7') return 7
  if (value === 30 || value === '30') return 30
  if (value === 90 || value === '90') return 90
  throw new HttpError(400, 'Invalid date range.')
}

function startDate(days: WindowDays) {
  if (days === null) return null
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start.toISOString()
}

function addMetrics(target: Record<string, number>, row: Record<string, number>) {
  target.impressions += Number(row.impressions ?? 0)
  target.views += Number(row.views ?? 0)
  target.uniqueVisitors += Number(row.unique_visitors ?? 0)
  target.contactAdminClicks += Number(row.contact_admin_clicks ?? 0)
  target.enquiries += Number(row.enquiries ?? 0)
}

function blankMetrics() {
  return { impressions: 0, views: 0, uniqueVisitors: 0, contactAdminClicks: 0, enquiries: 0 }
}

async function trackEvent(body: Record<string, unknown>, request: Request) {
  const user = await authenticate(request, true)
  const propertyId = body.propertyId
  const sessionId = body.sessionId
  const eventType = body.eventType
  const userAgent = request.headers.get('user-agent') ?? ''
  if (/\b(bot|crawler|spider|slurp|headless|lighthouse|pagespeed|preview)\b/i.test(userAgent)) {
    return respond({ accepted: false, reason: 'bot' })
  }
  const metadata = user?.app_metadata ?? {}
  if (metadata.role === 'admin' || (Array.isArray(metadata.roles) && metadata.roles.includes('admin'))) {
    return respond({ accepted: false, reason: 'internal-user' })
  }
  if (!isUuid(propertyId) || !isUuid(sessionId) || typeof eventType !== 'string' || !trackedEvents.has(eventType)) {
    throw new HttpError(400, 'Invalid property interaction.')
  }
  rateLimit(`track:${sessionId}:${propertyId}`, 60)
  const service = getServiceClient()
  const { data, error } = await service.rpc('record_property_analytics_event', {
    p_property_id: propertyId,
    p_visitor_session_id: sessionId,
    p_event_type: eventType as EventType,
    p_actor_user_id: user?.id ?? null,
  })
  if (error) {
    if (error.code === '42900') throw new HttpError(429, 'Too many property interactions.')
    console.error('[property-intelligence] event recording failed:', error.message)
    throw new HttpError(400, 'Could not record property interaction.')
  }
  return respond({ accepted: Boolean(data) })
}

async function landlordAnalytics(body: Record<string, unknown>, user: NonNullable<Awaited<ReturnType<typeof authenticate>>>) {
  const service = getServiceClient()
  const days = getWindowDays(body.range)
  const since = startDate(days)
  const { data: landlord, error: landlordError } = await service
    .from('landlords')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (landlordError) throw new HttpError(500, 'Could not load landlord analytics.')
  if (!landlord) throw new HttpError(403, 'Landlord access required.')

  const { data: properties, error: propertiesError } = await service
    .from('properties')
    .select('id, title, status')
    .eq('landlord_id', landlord.id)
  if (propertiesError) throw new HttpError(500, 'Could not load landlord properties.')
  const owned = properties ?? []
  if (body.propertyId != null && (!isUuid(body.propertyId) || !owned.some(property => property.id === body.propertyId))) {
    throw new HttpError(403, 'Property access denied.')
  }
  const selected = owned.filter(property => !body.propertyId || property.id === body.propertyId)
  const ids = selected.map(property => property.id)
  if (ids.length === 0) {
    return respond({ metrics: blankMetrics(), propertyOptions: owned, properties: [], timeseries: [], topProperty: null })
  }

  const dailyRows: {
    property_id: string
    event_day: string
    impressions: number
    views: number
    unique_visitors: number
    contact_admin_clicks: number
    enquiries: number
  }[] = []
  for (let offset = 0; ; offset += 1000) {
    let dailyQuery = service
      .from('property_analytics_daily')
      .select('property_id, event_day, impressions, views, unique_visitors, contact_admin_clicks, enquiries')
      .in('property_id', ids)
      .order('event_day', { ascending: true })
      .order('property_id', { ascending: true })
      .range(offset, offset + 999)
    if (since) dailyQuery = dailyQuery.gte('event_day', since.slice(0, 10))
    const { data: page, error: dailyError } = await dailyQuery
    if (dailyError) {
      console.error('[property-intelligence] landlord aggregate failed:', dailyError.message)
      throw new HttpError(500, 'Could not load property analytics.')
    }
    dailyRows.push(...(page ?? []))
    if (!page || page.length < 1000) break
  }

  const visitorRows: { property_id: string }[] = []
  for (let offset = 0; ; offset += 1000) {
    let visitorQuery = service
      .from('property_visitor_sessions')
      .select('property_id')
      .in('property_id', ids)
      .order('last_seen_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + 999)
    if (since) visitorQuery = visitorQuery.gte('last_seen_at', since)
    const { data: page, error: visitorError } = await visitorQuery
    if (visitorError) {
      console.error('[property-intelligence] unique visitor aggregation failed:', visitorError.message)
      throw new HttpError(500, 'Could not load unique visitor totals.')
    }
    visitorRows.push(...(page ?? []))
    if (!page || page.length < 1000) break
  }

  const overall = blankMetrics()
  const propertyTotals = new Map<string, ReturnType<typeof blankMetrics>>()
  const dayTotals = new Map<string, ReturnType<typeof blankMetrics>>()
  for (const row of dailyRows ?? []) {
    const values = {
      impressions: Number(row.impressions),
      views: Number(row.views),
      unique_visitors: Number(row.unique_visitors),
      contact_admin_clicks: Number(row.contact_admin_clicks),
      enquiries: Number(row.enquiries),
    }
    addMetrics(overall, values)
    const total = propertyTotals.get(row.property_id) ?? blankMetrics()
    addMetrics(total, values)
    propertyTotals.set(row.property_id, total)
    const day = String(row.event_day)
    const dayTotal = dayTotals.get(day) ?? blankMetrics()
    addMetrics(dayTotal, values)
    dayTotals.set(day, dayTotal)
  }

  overall.uniqueVisitors = visitorRows.length
  const visitorCounts = new Map<string, number>()
  for (const row of visitorRows) visitorCounts.set(row.property_id, (visitorCounts.get(row.property_id) ?? 0) + 1)
  const propertyMetrics = selected.map(property => ({
    id: property.id,
    title: property.title,
    status: property.status,
    ...(propertyTotals.get(property.id) ?? blankMetrics()),
    uniqueVisitors: visitorCounts.get(property.id) ?? 0,
  })).sort((a, b) => b.views - a.views)
  const topProperty = propertyMetrics.find(property => property.views > 0) ?? null
  const timeseries = [...dayTotals.entries()].map(([date, metrics]) => ({ date, ...metrics }))

  return respond({
    metrics: {
      ...overall,
      clickThroughRate: overall.impressions ? overall.views / overall.impressions * 100 : 0,
      enquiryConversionRate: overall.views ? overall.enquiries / overall.views * 100 : 0,
    },
    propertyOptions: owned,
    properties: propertyMetrics,
    timeseries,
    topProperty,
  })
}

async function adminActivity(body: Record<string, unknown>) {
  const service = getServiceClient()
  const days = getWindowDays(body.range)
  if (body.propertyId != null && !isUuid(body.propertyId)) throw new HttpError(400, 'Invalid property filter.')

  let query = service
    .from('property_visitor_sessions')
    .select('id, property_id, actor_user_id, first_seen_at, last_seen_at, properties(title, city)')
    .order('last_seen_at', { ascending: false })
    .limit(250)
  if (body.propertyId) query = query.eq('property_id', String(body.propertyId))
  const since = startDate(days)
  if (since) query = query.gte('last_seen_at', since)
  const { data: sessions, error } = await query
  if (error) {
    console.error('[property-intelligence] admin activity failed:', error.message)
    throw new HttpError(500, 'Could not load visitor activity.')
  }
  const sessionIds = (sessions ?? []).map(session => session.id)
  const events: { session_id: string; event_type: string; occurred_at: string }[] = []
  for (let offset = 0; sessionIds.length; offset += 1000) {
    let eventQuery = service.from('property_analytics_events')
      .select('session_id, event_type, occurred_at')
      .in('session_id', sessionIds)
      .order('occurred_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + 999)
    if (since) eventQuery = eventQuery.gte('occurred_at', since)
    const { data: page, error: eventError } = await eventQuery
    if (eventError) throw new HttpError(500, 'Could not load visitor interactions.')
    events.push(...(page ?? []))
    if (!page || page.length < 1000) break
  }

  const eventMap = new Map<string, { type: string; at: string }[]>()
  for (const event of events ?? []) {
    const list = eventMap.get(event.session_id) ?? []
    list.push({ type: event.event_type, at: event.occurred_at })
    eventMap.set(event.session_id, list)
  }
  return respond({
    visitors: (sessions ?? []).map(session => ({
      id: session.id,
      propertyId: session.property_id,
      propertyTitle: (session.properties as { title?: string; city?: string } | null)?.title ?? 'Property',
      propertyCity: (session.properties as { title?: string; city?: string } | null)?.city ?? '',
      registered: Boolean(session.actor_user_id),
      firstSeenAt: session.first_seen_at,
      lastSeenAt: session.last_seen_at,
      interactions: eventMap.get(session.id) ?? [],
    })),
    limit: 250,
  })
}

async function adminProfile(body: Record<string, unknown>, adminId: string) {
  if (!isUuid(body.visitorRecordId)) throw new HttpError(400, 'Invalid visitor record.')
  const service = getServiceClient()
  const { data: session, error: sessionError } = await service
    .from('property_visitor_sessions')
    .select('id, property_id, actor_user_id, first_seen_at, last_seen_at, properties(title, city)')
    .eq('id', body.visitorRecordId)
    .maybeSingle()
  if (sessionError) throw new HttpError(500, 'Could not load visitor record.')
  if (!session) throw new HttpError(404, 'Visitor record not found.')
  const { error: logError } = await service.from('property_visitor_access_logs').insert({
    admin_user_id: adminId,
    visitor_session_record_id: session.id,
    property_id: session.property_id,
  })
  if (logError) {
    console.error('[property-intelligence] access audit failed:', logError.message)
    throw new HttpError(500, 'Could not audit visitor record access.')
  }

  const { data: events, error: eventsError } = await service
    .from('property_analytics_events')
    .select('event_type, occurred_at')
    .eq('session_id', session.id)
    .order('occurred_at', { ascending: false })
    .limit(200)
  if (eventsError) throw new HttpError(500, 'Could not load visitor interactions.')

  const property = session.properties as { title?: string; city?: string } | null
  if (!session.actor_user_id) {
    return respond({
      visitor: { registered: false, name: null, avatarUrl: null, accountStatus: 'Anonymous visitor' },
      property: { id: session.property_id, title: property?.title ?? 'Property', city: property?.city ?? '' },
      firstSeenAt: session.first_seen_at,
      lastSeenAt: session.last_seen_at,
      interactions: [...(events ?? [])].reverse(),
      enquiries: [],
      conversations: [],
    })
  }

  const { data: authResult, error: authError } = await service.auth.admin.getUserById(session.actor_user_id)
  if (authError || !authResult.user) throw new HttpError(404, 'Registered visitor profile not found.')
  const targetUser = authResult.user
  const [tenantResult, landlordResult] = await Promise.all([
    service.from('tenants').select('id, full_name, avatar_url, status').eq('user_id', targetUser.id).maybeSingle(),
    service.from('landlords').select('id, full_name, avatar_url, status').eq('user_id', targetUser.id).maybeSingle(),
  ])
  if (tenantResult.error || landlordResult.error) throw new HttpError(500, 'Could not load visitor profile.')
  const tenant = tenantResult.data
  const landlord = landlordResult.data
  const profile = tenant ?? landlord
  const isBanned = targetUser.banned_until != null
    && new Date(targetUser.banned_until).getTime() > Date.now()
  const tenantId = tenant?.id
  const landlordId = landlord?.id
  const enquiriesQuery = tenantId
    ? service.from('enquiries').select('id, property_id, message, status, created_at')
      .eq('tenant_id', tenantId).eq('property_id', session.property_id)
      .order('created_at', { ascending: false }).limit(20)
    : Promise.resolve({ data: [], error: null })
  const ticketsQuery = tenantId || landlordId
    ? service.from('support_tickets').select('id, subject, status, created_at, updated_at, tenant_id, landlord_id')
      .or(tenantId ? `tenant_id.eq.${tenantId}` : `landlord_id.eq.${landlordId}`)
      .order('updated_at', { ascending: false }).limit(10)
    : Promise.resolve({ data: [], error: null })
  const [enquiriesResult, ticketsResult, chatsResult] = await Promise.all([
    enquiriesQuery,
    ticketsQuery,
    service.from('chat_inquiries').select('id, note, status, created_at, updated_at')
      .eq('visitor_id', targetUser.id).order('updated_at', { ascending: false }).limit(10),
  ])
  if (enquiriesResult.error || ticketsResult.error || chatsResult.error) {
    throw new HttpError(500, 'Could not load visitor history.')
  }

  const ticketIds = (ticketsResult.data ?? []).map(ticket => ticket.id)
  const chatIds = (chatsResult.data ?? []).map(chat => chat.id)
  const [supportMessages, chatMessages] = await Promise.all([
    ticketIds.length
      ? service.from('support_messages').select('ticket_id, sender_role, body, created_at, read_by_visitor')
        .in('ticket_id', ticketIds).order('created_at', { ascending: true }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    chatIds.length
      ? service.from('chat_messages').select('inquiry_id, sender, body, created_at, read_by_visitor')
        .in('inquiry_id', chatIds).order('created_at', { ascending: true }).limit(100)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (supportMessages.error || chatMessages.error) throw new HttpError(500, 'Could not load conversation history.')

  return respond({
    visitor: {
      registered: true,
      name: profile?.full_name ?? targetUser.user_metadata?.full_name ?? 'Registered visitor',
      avatarUrl: profile?.avatar_url ?? targetUser.user_metadata?.avatar_url ?? targetUser.user_metadata?.picture ?? null,
      accountStatus: isBanned ? 'suspended' : profile?.status ?? 'active',
      messagingAllowed: targetUser.user_metadata?.admin_support_messages !== false,
    },
    property: { id: session.property_id, title: property?.title ?? 'Property', city: property?.city ?? '' },
    firstSeenAt: session.first_seen_at,
    lastSeenAt: session.last_seen_at,
    interactions: [...(events ?? [])].reverse(),
    enquiries: enquiriesResult.data ?? [],
    conversations: [
      ...(ticketsResult.data ?? []).map(ticket => ({
        id: ticket.id,
        type: 'support',
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.created_at,
        messages: (supportMessages.data ?? []).filter(message => message.ticket_id === ticket.id),
      })),
      ...(chatsResult.data ?? []).map(chat => ({
        id: chat.id,
        type: 'inbox',
        subject: chat.note ?? 'Livarex support',
        status: chat.status,
        createdAt: chat.created_at,
        messages: (chatMessages.data ?? []).filter(message => message.inquiry_id === chat.id),
      })),
    ],
  })
}

async function adminMessage(body: Record<string, unknown>, adminId: string) {
  if (!isUuid(body.visitorRecordId) || typeof body.message !== 'string') {
    throw new HttpError(400, 'Invalid message request.')
  }
  const message = body.message.trim()
  if (!message || message.length > 2000) throw new HttpError(400, 'Message must be between 1 and 2,000 characters.')
  const service = getServiceClient()
  const { data: session, error: sessionError } = await service
    .from('property_visitor_sessions').select('actor_user_id, property_id, properties(title)')
    .eq('id', body.visitorRecordId).maybeSingle()
  if (sessionError) throw new HttpError(500, 'Could not verify visitor record.')
  if (!session?.actor_user_id) throw new HttpError(400, 'Anonymous visitors cannot be messaged.')
  const { error: logError } = await service.from('property_visitor_access_logs').insert({
    admin_user_id: adminId,
    visitor_session_record_id: body.visitorRecordId,
    property_id: session.property_id,
  })
  if (logError) throw new HttpError(500, 'Could not audit visitor record access.')
  const { data: targetResult, error: targetError } = await service.auth.admin.getUserById(session.actor_user_id)
  if (targetError || !targetResult.user) throw new HttpError(404, 'Visitor account not found.')
  const target = targetResult.user
  if (target.user_metadata?.admin_support_messages === false) {
    throw new HttpError(403, 'This user has turned off administrator support messages.')
  }
  const [tenantResult, landlordResult] = await Promise.all([
    service.from('tenants').select('id, full_name').eq('user_id', target.id).maybeSingle(),
    service.from('landlords').select('id, full_name').eq('user_id', target.id).maybeSingle(),
  ])
  if (tenantResult.error || landlordResult.error) throw new HttpError(500, 'Could not load visitor account details.')
  const tenant = tenantResult.data
  const landlord = landlordResult.data
  const { data: existing, error: existingError } = await service.from('chat_inquiries').select('id, status, name')
    .eq('visitor_id', target.id).neq('status', 'closed')
    .order('updated_at', { ascending: false }).limit(1).maybeSingle()
  if (existingError) throw new HttpError(500, 'Could not check existing support conversations.')
  let inquiryId = existing?.id
  if (!inquiryId) {
    const propertyTitle = (session.properties as { title?: string } | null)?.title ?? 'a property'
    const { data: inquiry, error: insertError } = await service.from('chat_inquiries')
      .insert({
        visitor_id: target.id,
        name: tenant?.full_name ?? landlord?.full_name ?? target.user_metadata?.full_name ?? 'Registered visitor',
        note: `Livarex support conversation regarding ${propertyTitle}.`,
        status: 'open',
        read_by_admin: true,
      })
      .select('id')
      .single()
    if (insertError || !inquiry) {
      console.error('[property-intelligence] could not initiate support thread:', insertError?.message)
      throw new HttpError(500, 'Could not start the support conversation.')
    }
    inquiryId = inquiry.id
  }

  const { error: messageError } = await service.from('chat_messages').insert({
    inquiry_id: inquiryId,
    sender: 'admin',
    body: message,
  })
  if (messageError) {
    console.error('[property-intelligence] support message insert failed:', messageError.message)
    throw new HttpError(500, 'Could not send the support message.')
  }
  const { error: updateError } = await service.from('chat_inquiries')
    .update({ status: 'replied', read_by_admin: true }).eq('id', inquiryId)
  if (updateError) {
    console.error('[property-intelligence] conversation status update failed:', updateError.message)
    return respond({ conversationId: inquiryId, deliveryStatus: 'sent', conversationUpdated: false })
  }
  return respond({ conversationId: inquiryId, deliveryStatus: 'sent', conversationUpdated: true })
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405)

  try {
    const parsed: unknown = await request.json().catch(() => null)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpError(400, 'A JSON request body is required.')
    }
    const body = parsed as Record<string, unknown>
    const action = body.action
    if (action === 'track') return await trackEvent(body, request)

    const user = await authenticate(request)
    rateLimit(`${user!.id}:${String(action)}`, action === 'admin-activity' ? 60 : 30)
    if (action === 'landlord-analytics') return await landlordAnalytics(body, user!)

    const admin = requireAdmin(user)
    if (action === 'admin-activity') return await adminActivity(body)
    if (action === 'admin-profile') return await adminProfile(body, admin.id)
    if (action === 'admin-message') return await adminMessage(body, admin.id)
    throw new HttpError(400, 'Unknown property intelligence operation.')
  } catch (error) {
    if (error instanceof HttpError) return respond({ error: error.message }, error.status)
    console.error('[property-intelligence] request failed:', error)
    return respond({ error: 'Property intelligence request failed.' }, 500)
  }
})

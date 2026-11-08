import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const trackedEvents = new Set(['impression', 'detail_view', 'contact_admin_click', 'enquiry_initiated'])
const siteEventTypes = new Set([
  'page_view', 'navigation', 'search', 'filter',
  'login_page_view', 'register_page_view', 'login_attempt', 'register_attempt',
  'cta_click', 'property_impression', 'property_detail_view',
  'contact_admin_click', 'enquiry_initiated',
])
const publicSitePages = new Set([
  '/', '/home', '/listings', '/properties/lagos', '/properties/ogun',
  '/how-we-verify', '/landlord/verify', '/landlord/register',
  '/login', '/register', '/about', '/contact', '/faq', '/terms',
  '/privacy-policy', '/cookie-policy',
])
const pageSizes = new Set([20, 30, 50, 100])
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

function getPositivePage(value: unknown) {
  const page = typeof value === 'number' ? value : Number(value ?? 1)
  if (!Number.isInteger(page) || page < 1 || page > 10_000) throw new HttpError(400, 'Invalid page number.')
  return page
}

function getPageRange(value: unknown) {
  const page = getPositivePage(value)
  const pageSize = 25
  const from = (page - 1) * pageSize
  return { page, pageSize, from, to: from + pageSize - 1 }
}

function getSitePageRange(pageValue: unknown, sizeValue: unknown) {
  const page = getPositivePage(pageValue)
  const pageSize = typeof sizeValue === 'number' ? sizeValue : Number(sizeValue ?? 20)
  if (!pageSizes.has(pageSize)) throw new HttpError(400, 'Invalid visitor page size.')
  const from = (page - 1) * pageSize
  return { page, pageSize, from, to: from + pageSize - 1 }
}

function getSiteDateRange(fromValue: unknown, toValue: unknown, days: WindowDays) {
  const parseDate = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new HttpError(400, 'Invalid visitor date range.')
    }
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new HttpError(400, 'Invalid visitor date range.')
    }
    return date
  }
  const hasFrom = fromValue != null && fromValue !== ''
  const hasTo = toValue != null && toValue !== ''
  if (!hasFrom && !hasTo) {
    return { since: startDate(days), until: null }
  }
  const from = hasFrom ? parseDate(fromValue) : null
  const to = hasTo ? parseDate(toValue) : null
  if (from && to && to < from) throw new HttpError(400, 'Invalid visitor date range.')
  if (to) to.setUTCDate(to.getUTCDate() + 1)
  return { since: from?.toISOString() ?? null, until: to?.toISOString() ?? null }
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

async function trackSiteVisit(body: Record<string, unknown>, request: Request) {
  await authenticate(request, true)
  if (!isUuid(body.visitorId) || typeof body.pagePath !== 'string') {
    throw new HttpError(400, 'Invalid public site visit.')
  }
  const path = normalizePublicPath(body.pagePath)
  if (!path) throw new HttpError(400, 'Invalid public site visit.')
  const propertyId = path.match(/^\/listings\/([^/]+)$/)?.[1]
  const eventType = path === '/login'
    ? 'login_page_view'
    : path === '/register' || path === '/landlord/register'
      ? 'register_page_view'
      : isUuid(propertyId) ? 'property_detail_view' : 'page_view'
  return await recordSiteEvent(
    { ...body, ...(isUuid(propertyId) ? { propertyId } : {}) },
    request,
    eventType,
    path,
    true,
  )
}

function normalizePublicPath(value: unknown) {
  if (typeof value !== 'string' || value.length > 300 || !value.startsWith('/') || value.startsWith('//')
      || value.includes('?') || value.includes('#')
      || !/^\/[A-Za-z0-9/_-]*$/.test(value)) return null
  const recognized = publicSitePages.has(value)
    || /^\/listings\/[0-9a-f-]{36}$/i.test(value)
    || /^\/properties-in\/[a-z0-9-]{1,100}$/i.test(value)
  if (!recognized) return null
  return value
}

function cleanAttribution(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const input = value as Record<string, unknown>
  const output: Record<string, string> = {}
  const domain = input.referrerDomain
  if (typeof domain === 'string' && domain.length <= 253 && /^[a-z0-9.-]+$/i.test(domain)) {
    output.referrer_domain = domain.toLowerCase().replace(/^www\./, '')
  }
  for (const [sourceKey, targetKey] of [
    ['utm_source', 'utm_source'],
    ['utm_medium', 'utm_medium'],
    ['utm_campaign', 'utm_campaign'],
    ['utm_content', 'utm_content'],
    ['utm_term', 'utm_term'],
  ]) {
    const candidate = input[sourceKey]
    if (typeof candidate === 'string' && candidate.length <= 100 && /^[\p{L}\p{N} _.-]+$/u.test(candidate)) {
      const value = candidate.trim()
      const digits = value.replace(/\D/g, '')
      if (value && !(digits.length >= 7 && /^[+()\d.\-\s]+$/.test(value))) output[targetKey] = value
    }
  }
  return output
}

function cleanHeaderLocation(value: string | null, maxLength: number) {
  if (!value) return null
  let decoded = value
  try { decoded = decodeURIComponent(value) } catch { /* Keep the original header value. */ }
  const clean = decoded.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return clean && clean.length <= maxLength ? clean : null
}

function getDeviceInfo(userAgent: string) {
  const browser = /\bEdg\//i.test(userAgent) ? 'Edge'
    : /\b(OPR|Opera)\//i.test(userAgent) ? 'Opera'
    : /\bFirefox\//i.test(userAgent) ? 'Firefox'
    : /\b(Chrome|CriOS)\//i.test(userAgent) ? 'Chrome'
    : /\b(Safari)\//i.test(userAgent) && !/\b(Chrome|CriOS)\//i.test(userAgent) ? 'Safari'
    : null
  const operatingSystem = /Windows/i.test(userAgent) ? 'Windows'
    : /Android/i.test(userAgent) ? 'Android'
    : /(iPhone|iPad|iPod)/i.test(userAgent) ? 'iOS'
    : /Mac OS/i.test(userAgent) ? 'macOS'
    : /Linux/i.test(userAgent) ? 'Linux'
    : null
  const deviceCategory = /iPad|Tablet/i.test(userAgent) ? 'tablet'
    : /Mobile|Android|iPhone|iPod/i.test(userAgent) ? 'mobile'
    : userAgent ? 'desktop' : 'unknown'
  return { browser, operatingSystem, deviceCategory }
}

function classifyTrafficSource(referrerDomain: string | undefined, attribution: Record<string, string>) {
  if (attribution.utm_source) return 'campaign'
  if (!referrerDomain) return 'direct'
  if (/(^|\.)((google|bing|yahoo|duckduckgo|baidu|yandex)\.)/i.test(referrerDomain)) return 'organic_search'
  if (/(^|\.)((facebook|instagram|tiktok|linkedin|x|twitter|pinterest|youtube|whatsapp)\.)/i.test(referrerDomain)) return 'social'
  return 'referral'
}

function sanitizeSiteMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const input = value as Record<string, unknown>
  const output: Record<string, string | string[]> = {}
  if (typeof input.control === 'string' && /^[a-z0-9_-]{1,60}$/i.test(input.control)) {
    output.control = input.control
  }
  if (typeof input.destination === 'string') {
    const path = normalizePublicPath(input.destination)
    if (path) output.destination = path
  }
  if (Array.isArray(input.filterKeys)) {
    const allowed = new Set(['type', 'city', 'area', 'min_price', 'max_price', 'bedrooms', 'sort'])
    const keys = input.filterKeys.filter((item): item is string => typeof item === 'string' && allowed.has(item)).slice(0, 10)
    if (keys.length) output.filterKeys = [...new Set(keys)]
  }
  return output
}

async function recordSiteEvent(
  body: Record<string, unknown>,
  request: Request,
  eventType: string,
  pagePath: string,
  includeAttribution: boolean,
) {
  if (!isUuid(body.visitorId)) throw new HttpError(400, 'Invalid site visitor.')
  if (!siteEventTypes.has(eventType)) throw new HttpError(400, 'Invalid site visitor event.')
  const userAgent = request.headers.get('user-agent') ?? ''
  if (/\b(bot|crawler|spider|slurp|headless|lighthouse|pagespeed|preview)\b/i.test(userAgent)) {
    return respond({ accepted: false, reason: 'bot' })
  }
  rateLimit(`site-event:${body.visitorId}`, 180)

  const attribution = includeAttribution ? cleanAttribution(body.attribution) : {}
  const referrerDomain = attribution.referrer_domain
  const rawCountry = request.headers.get('cf-ipcountry')?.toUpperCase() ?? ''
  const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null
  const countryName = countryCode
    ? new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) ?? null
    : null
  const region = cleanHeaderLocation(
    request.headers.get('cf-region'),
    100,
  )
  const city = cleanHeaderLocation(
    request.headers.get('cf-ipcity'),
    100,
  )
  const device = getDeviceInfo(userAgent)
  const propertyId = body.propertyId == null ? null : body.propertyId
  if (propertyId !== null && !isUuid(propertyId)) throw new HttpError(400, 'Invalid property reference.')
  const metadata = sanitizeSiteMetadata(body.metadata)
  const eventData = {
    country_code: countryCode,
    country_name: countryName,
    region,
    city,
    traffic_source: classifyTrafficSource(referrerDomain, attribution),
    referrer_domain: referrerDomain ?? null,
    landing_page: includeAttribution ? pagePath : null,
    device_category: device.deviceCategory,
    browser: device.browser,
    operating_system: device.operatingSystem,
    property_id: propertyId,
    metadata,
    ...attribution,
  }
  const service = getServiceClient()
  const { error } = await service.rpc('record_site_visitor_event', {
    p_visitor_id: body.visitorId,
    p_page_path: pagePath,
    p_event_type: eventType,
    p_event_data: eventData,
  })
  if (error) {
    console.error('[property-intelligence] site event recording failed:', error.message)
    throw new HttpError(400, 'Could not record site visitor activity.')
  }
  return respond({
    accepted: true,
    registeredAccountLinked: false,
    locationPrecision: city ? 'city' : region ? 'region' : countryCode ? 'country' : 'unknown',
  })
}

async function trackSiteEvent(body: Record<string, unknown>, request: Request) {
  const user = await authenticate(request, true)
  const pagePath = normalizePublicPath(body.pagePath)
  if (!pagePath || typeof body.eventType !== 'string' || !siteEventTypes.has(body.eventType)) {
    throw new HttpError(400, 'Invalid public site interaction.')
  }
  if (user && body.propertyId != null) {
    return respond({ accepted: false, reason: 'account-linked property activity is kept separate' })
  }
  return await recordSiteEvent(body, request, body.eventType, pagePath, false)
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
  const propertyPage = getPageRange(body.propertyPage)
  const sitePage = getSitePageRange(body.sitePage, body.sitePageSize)
  const visitorType = body.visitorType ?? 'all'
  if (visitorType !== 'all' && visitorType !== 'anonymous' && visitorType !== 'registered') {
    throw new HttpError(400, 'Invalid visitor type filter.')
  }
  const textFilter = (value: unknown, name: string, maximum: number) => {
    if (value == null || value === '') return null
    if (typeof value !== 'string' || value.length > maximum) throw new HttpError(400, `Invalid ${name} filter.`)
    return value.trim() || null
  }
  const search = textFilter(body.search, 'search', 100)
  const location = textFilter(body.location, 'location', 100)
  const pagePath = textFilter(body.pagePath, 'page', 300)
  const trafficSource = textFilter(body.trafficSource, 'traffic source', 20)
  const eventType = textFilter(body.eventType, 'event type', 40)
  const sortBy = body.sortBy ?? 'last_active'
  if (sortBy !== 'last_active' && sortBy !== 'first_seen' && sortBy !== 'events' && sortBy !== 'page_views') {
    throw new HttpError(400, 'Invalid visitor sort order.')
  }
  const siteDates = getSiteDateRange(body.from, body.to, days)

  let query = service
    .from('property_visitor_sessions')
    .select('id, property_id, actor_user_id, first_seen_at, last_seen_at, properties(title, city)', { count: 'exact' })
    .order('last_seen_at', { ascending: false })
    .order('id', { ascending: true })
    .range(propertyPage.from, propertyPage.to)
  if (body.propertyId) query = query.eq('property_id', String(body.propertyId))
  const since = startDate(days)
  if (since) query = query.gte('last_seen_at', since)
  if (visitorType === 'registered') query = query.not('actor_user_id', 'is', null)
  if (visitorType === 'anonymous') query = query.is('actor_user_id', null)
  const { data: sessions, error, count: propertyVisitorCount } = await query
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

  const siteActivityRequest = visitorType === 'registered'
    ? Promise.resolve({ data: { items: [], total: 0 }, error: null })
    : service.rpc('get_admin_site_visitors', {
      p_page: sitePage.page,
      p_page_size: sitePage.pageSize,
      p_search: search,
      p_location: location,
      p_traffic_source: trafficSource,
      p_page_path: pagePath,
      p_event_type: eventType,
      p_since: siteDates.since,
      p_until: siteDates.until,
      p_sort_by: sortBy,
    })
  const [
    { data: siteVisitorResult, error: siteVisitorError },
    { count: siteVisitorTotal, error: siteVisitorTotalError },
  ] = await Promise.all([
    siteActivityRequest,
    service.from('site_visitors').select('visitor_id', { count: 'exact', head: true }),
  ])
  if (siteVisitorError) throw new HttpError(500, 'Could not load site visitor activity.')
  if (siteVisitorTotalError) throw new HttpError(500, 'Could not load total site visitors.')
  const siteVisitorItems = (siteVisitorResult as { items?: Record<string, unknown>[]; total?: number } | null)?.items ?? []
  const siteVisitorCount = Number((siteVisitorResult as { total?: number } | null)?.total ?? 0)

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
    siteVisitors: siteVisitorItems.map(visitor => ({
      id: visitor.id,
      firstSeenAt: visitor.first_seen_at,
      lastSeenAt: visitor.last_seen_at,
      pageViews: Number(visitor.page_views),
      countryCode: visitor.country_code,
      countryName: visitor.country_name,
      city: visitor.city,
      region: visitor.region,
      trafficSource: visitor.traffic_source,
      referrerDomain: visitor.referrer_domain,
      landingPage: visitor.landing_page,
      lastVisitedPath: visitor.last_visited_path,
      lastEventType: visitor.last_event_type,
      utmSource: visitor.utm_source,
      utmMedium: visitor.utm_medium,
      utmCampaign: visitor.utm_campaign,
      utmContent: visitor.utm_content,
      utmTerm: visitor.utm_term,
      deviceCategory: visitor.device_category,
      browser: visitor.browser,
      operatingSystem: visitor.operating_system,
      totalEvents: Number(visitor.total_events),
    })),
    propertyVisitorCount: propertyVisitorCount ?? 0,
    propertyPage: propertyPage.page,
    sitePage: sitePage.page,
    sitePageSize: sitePage.pageSize,
    pageSize: propertyPage.pageSize,
    siteVisitorCount,
    siteVisitorTotal: siteVisitorTotal ?? 0,
    siteVisitorScope: 'global',
    limit: propertyPage.pageSize,
  })
}

async function adminSiteVisitorProfile(body: Record<string, unknown>, adminId: string) {
  if (!isUuid(body.siteVisitorId)) throw new HttpError(400, 'Invalid site visitor record.')
  const pageRange = getSitePageRange(body.page, body.pageSize ?? 50)
  const service = getServiceClient()
  const [
    { data: visitor, error: visitorError },
    { count: visitCount, error: visitCountError },
  ] = await Promise.all([
    service
    .from('site_visitors')
    .select('visitor_id, first_seen_at, last_seen_at, page_views, country_code, country_name, city, region, traffic_source, referrer_domain, landing_page, utm_source, utm_medium, utm_campaign, utm_content, utm_term, device_category, browser, operating_system, total_events')
    .eq('visitor_id', body.siteVisitorId)
    .maybeSingle(),
    service.from('site_visitor_page_events')
      .select('id', { count: 'exact', head: true })
      .eq('visitor_id', body.siteVisitorId),
  ])
  if (visitorError) throw new HttpError(500, 'Could not load site visitor record.')
  if (visitCountError) throw new HttpError(500, 'Could not count site visitor page history.')
  if (!visitor) throw new HttpError(404, 'Site visitor record not found.')

  const { error: logError } = await service.from('site_visitor_access_logs').insert({
    admin_user_id: adminId,
    visitor_id: visitor.visitor_id,
  })
  if (logError) throw new HttpError(500, 'Could not audit site visitor record access.')

  const { data: visits, error: visitsError } = await service
    .from('site_visitor_page_events')
    .select('page_path, event_type, property_id, event_metadata, visited_at')
    .eq('visitor_id', visitor.visitor_id)
    .order('visited_at', { ascending: true })
    .order('id', { ascending: true })
    .range(pageRange.from, pageRange.to)
  if (visitsError) throw new HttpError(500, 'Could not load site visitor page history.')
  const propertyIds = [...new Set((visits ?? []).map(event => event.property_id).filter((id): id is string => Boolean(id)))]
  const { data: propertyRows, error: propertiesError } = propertyIds.length
    ? await service.from('properties').select('id, title').in('id', propertyIds)
    : { data: [], error: null }
  if (propertiesError) throw new HttpError(500, 'Could not load visitor property references.')
  const propertyTitles = new Map((propertyRows ?? []).map(property => [property.id, property.title]))

  return respond({
    visitor: {
      registered: false,
      label: 'Anonymous browser',
      firstSeenAt: visitor.first_seen_at,
      lastSeenAt: visitor.last_seen_at,
      pageViews: Number(visitor.page_views),
      countryCode: visitor.country_code,
      countryName: visitor.country_name,
      city: visitor.city,
      region: visitor.region,
      trafficSource: visitor.traffic_source,
      referrerDomain: visitor.referrer_domain,
      landingPage: visitor.landing_page,
      utmSource: visitor.utm_source,
      utmMedium: visitor.utm_medium,
      utmCampaign: visitor.utm_campaign,
      utmContent: visitor.utm_content,
      utmTerm: visitor.utm_term,
      deviceCategory: visitor.device_category,
      browser: visitor.browser,
      operatingSystem: visitor.operating_system,
      totalEvents: Number(visitor.total_events),
    },
    visits: (visits ?? []).map(event => ({
      ...event,
      property_title: event.property_id ? propertyTitles.get(event.property_id) ?? null : null,
      event_metadata: event.event_metadata ?? {},
    })),
    visitCount: visitCount ?? 0,
    page: pageRange.page,
    pageSize: pageRange.pageSize,
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
    if (action === 'track-site-visit') return await trackSiteVisit(body, request)
    if (action === 'track-site-event') return await trackSiteEvent(body, request)

    const user = await authenticate(request)
    rateLimit(`${user!.id}:${String(action)}`, action === 'admin-activity' ? 60 : 30)
    if (action === 'landlord-analytics') return await landlordAnalytics(body, user!)

    const admin = requireAdmin(user)
    if (action === 'admin-activity') return await adminActivity(body)
    if (action === 'admin-site-visitor-profile') return await adminSiteVisitorProfile(body, admin.id)
    if (action === 'admin-profile') return await adminProfile(body, admin.id)
    if (action === 'admin-message') return await adminMessage(body, admin.id)
    throw new HttpError(400, 'Unknown property intelligence operation.')
  } catch (error) {
    if (error instanceof HttpError) return respond({ error: error.message }, error.status)
    console.error('[property-intelligence] request failed:', error)
    return respond({ error: 'Property intelligence request failed.' }, 500)
  }
})

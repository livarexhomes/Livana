import { createClient, isSupabaseConfigured } from './supabase'
import { trackSiteInteraction } from './site-analytics'

export type PropertyAnalyticsEvent =
  | 'impression'
  | 'detail_view'
  | 'contact_admin_click'
  | 'enquiry_initiated'

const SESSION_KEY = 'livarex_property_analytics_session'

export interface AnalyticsMetrics {
  impressions: number
  views: number
  uniqueVisitors: number
  contactAdminClicks: number
  enquiries: number
  clickThroughRate?: number
  enquiryConversionRate?: number
}

export interface LandlordAnalytics {
  metrics: AnalyticsMetrics
  propertyOptions: { id: string; title: string; status: string }[]
  properties: (AnalyticsMetrics & { id: string; title: string; status: string })[]
  timeseries: (AnalyticsMetrics & { date: string })[]
  topProperty: (AnalyticsMetrics & { id: string; title: string; status: string }) | null
}

export interface VisitorActivity {
  id: string
  propertyId: string
  propertyTitle: string
  propertyCity: string
  registered: boolean
  firstSeenAt: string
  lastSeenAt: string
  interactions: { type: string; at: string }[]
}

export interface SiteVisitorActivity {
  id: string
  firstSeenAt: string
  lastSeenAt: string
  pageViews: number
  countryCode: string | null
  countryName: string | null
  city: string | null
  region: string | null
  trafficSource: string | null
  referrerDomain: string | null
  landingPage: string | null
  lastVisitedPath: string | null
  lastEventType: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  deviceCategory: string | null
  browser: string | null
  operatingSystem: string | null
  totalEvents: number
}

export interface SiteVisitorProfile {
  visitor: {
    registered: false
    label: string
    firstSeenAt: string
    lastSeenAt: string
    pageViews: number
    countryCode: string | null
    countryName: string | null
    city: string | null
    region: string | null
    trafficSource: string | null
    referrerDomain: string | null
    landingPage: string | null
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    utmContent: string | null
    utmTerm: string | null
    deviceCategory: string | null
    browser: string | null
    operatingSystem: string | null
    totalEvents: number
  }
  visits: {
    page_path: string
    event_type: string
    property_id: string | null
    property_title: string | null
    event_metadata: { control?: string; destination?: string; filterKeys?: string[] }
    visited_at: string
  }[]
  visitCount: number
  page: number
  pageSize: number
}

export interface SiteVisitorFilters {
  search?: string
  location?: string
  trafficSource?: string
  pagePath?: string
  eventType?: string
  sortBy?: 'last_active' | 'first_seen' | 'events' | 'page_views'
  from?: string
  to?: string
  visitorType?: 'all' | 'anonymous' | 'registered'
}

export interface VisitorProfile {
  visitor: {
    registered: boolean
    name: string | null
    avatarUrl: string | null
    accountStatus: string
    messagingAllowed?: boolean
  }
  property: { id: string; title: string; city: string }
  firstSeenAt: string
  lastSeenAt: string
  interactions: { event_type: string; occurred_at: string }[]
  enquiries: { id: string; message: string; status: string; created_at: string }[]
  conversations: {
    id: string
    type: 'support' | 'inbox'
    subject: string
    status: string
    createdAt: string
    messages: { sender_role?: string; sender?: string; body: string; created_at: string; read_by_visitor?: boolean }[]
  }[]
}

function getSessionId(): string {
  const existing = window.sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const created = window.crypto.randomUUID()
  window.sessionStorage.setItem(SESSION_KEY, created)
  return created
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
  const { data, error } = await createClient().functions.invoke('property-intelligence', { body })
  if (error) {
    const message = (data as { error?: string } | null)?.error ?? error.message
    throw new Error(message || 'Property analytics request failed.')
  }
  return data as T
}

export async function trackPropertyEvent(propertyId: string, eventType: PropertyAnalyticsEvent): Promise<void> {
  if (!isSupabaseConfigured()) return
  await invoke({ action: 'track', propertyId, sessionId: getSessionId(), eventType })
  if (eventType === 'contact_admin_click' || eventType === 'enquiry_initiated') {
    await trackSiteInteraction(eventType, { propertyId })
  }
}

export function getLandlordAnalytics(range: 7 | 30 | 90 | 'all', propertyId?: string) {
  return invoke<LandlordAnalytics>({
    action: 'landlord-analytics',
    range,
    ...(propertyId ? { propertyId } : {}),
  })
}

export async function getAdminVisitorActivity(
  range: 7 | 30 | 90 | 'all',
  propertyId?: string,
  propertyPage = 1,
  sitePage = 1,
  sitePageSize = 20,
  filters: SiteVisitorFilters = {},
) {
  return invoke<{
    visitors: VisitorActivity[]
    siteVisitors: SiteVisitorActivity[]
    siteVisitorCount: number
    siteVisitorTotal: number
    propertyVisitorCount: number
    propertyPage: number
    sitePage: number
    sitePageSize: number
    pageSize: number
    siteVisitorScope: 'global'
    limit: number
  }>({
    action: 'admin-activity',
    range,
    propertyPage,
    sitePage,
    sitePageSize,
    ...filters,
    ...(propertyId ? { propertyId } : {}),
  })
}

export function getAdminSiteVisitorProfile(siteVisitorId: string, page = 1, pageSize = 50) {
  return invoke<SiteVisitorProfile>({ action: 'admin-site-visitor-profile', siteVisitorId, page, pageSize })
}

export function getAdminVisitorProfile(visitorRecordId: string) {
  return invoke<VisitorProfile>({ action: 'admin-profile', visitorRecordId })
}

export function sendAdminVisitorMessage(visitorRecordId: string, message: string) {
  return invoke<{ conversationId: string; deliveryStatus: 'sent'; conversationUpdated: boolean }>({
    action: 'admin-message',
    visitorRecordId,
    message,
  })
}

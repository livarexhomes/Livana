import { createClient, isSupabaseConfigured } from './supabase'

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
}

export function getLandlordAnalytics(range: 7 | 30 | 90 | 'all', propertyId?: string) {
  return invoke<LandlordAnalytics>({
    action: 'landlord-analytics',
    range,
    ...(propertyId ? { propertyId } : {}),
  })
}

export async function getAdminVisitorActivity(range: 7 | 30 | 90 | 'all', propertyId?: string) {
  return invoke<{ visitors: VisitorActivity[]; limit: number }>({
    action: 'admin-activity',
    range,
    ...(propertyId ? { propertyId } : {}),
  })
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

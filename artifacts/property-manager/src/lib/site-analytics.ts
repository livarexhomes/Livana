import { createClient } from './supabase'

const VISITOR_ID_KEY = 'livarex_visitor_id'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type SiteVisitorEventType =
  | 'navigation'
  | 'search'
  | 'filter'
  | 'login_attempt'
  | 'register_attempt'
  | 'cta_click'
  | 'property_impression'
  | 'property_detail_view'
  | 'contact_admin_click'
  | 'enquiry_initiated'

export type SiteEventMetadata = {
  control?: string
  destination?: string
  filterKeys?: string[]
}

function getVisitorId(): string {
  const existingId = window.localStorage.getItem(VISITOR_ID_KEY)
  if (existingId && UUID_PATTERN.test(existingId)) return existingId

  const visitorId = window.crypto.randomUUID()
  window.localStorage.setItem(VISITOR_ID_KEY, visitorId)
  return visitorId
}

function getAttribution() {
  const search = new URLSearchParams(window.location.search)
  let referrerDomain: string | null = null
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null
    if (referrer) {
      const referrerHost = referrer.hostname.toLowerCase().replace(/^www\./, '')
      const currentHost = window.location.hostname.toLowerCase().replace(/^www\./, '')
      if (referrerHost !== currentHost) referrerDomain = referrerHost.slice(0, 253)
    }
  } catch {
    referrerDomain = null
  }
  const campaign: Record<string, string> = {}
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = search.get(key)?.trim()
    if (value) campaign[key] = value.slice(0, 100)
  }
  return { referrerDomain, ...campaign }
}

export async function trackSiteVisit(pagePath: string): Promise<void> {
  const { error } = await createClient().functions.invoke('property-intelligence', {
    body: {
      action: 'track-site-visit',
      visitorId: getVisitorId(),
      pagePath,
      attribution: getAttribution(),
    },
  })
  if (error) throw new Error(`Could not record site visit: ${error.message}`)
}

export async function trackSiteInteraction(
  eventType: SiteVisitorEventType,
  options: { propertyId?: string; metadata?: SiteEventMetadata } = {},
): Promise<void> {
  const { error } = await createClient().functions.invoke('property-intelligence', {
    body: {
      action: 'track-site-event',
      visitorId: getVisitorId(),
      pagePath: window.location.pathname,
      eventType,
      ...(options.propertyId ? { propertyId: options.propertyId } : {}),
      ...(options.metadata ? { metadata: options.metadata } : {}),
    },
  })
  if (error) throw new Error(`Could not record site interaction: ${error.message}`)
}

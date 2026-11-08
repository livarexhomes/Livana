import { createClient } from './supabase'

const VISITOR_ID_KEY = 'livarex_visitor_id'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getVisitorId(): string {
  const existingId = window.localStorage.getItem(VISITOR_ID_KEY)
  if (existingId && UUID_PATTERN.test(existingId)) return existingId

  const visitorId = window.crypto.randomUUID()
  window.localStorage.setItem(VISITOR_ID_KEY, visitorId)
  return visitorId
}

export async function trackSiteVisit(pagePath: string): Promise<void> {
  const { error } = await createClient().rpc('record_site_page_visit', {
    p_visitor_id: getVisitorId(),
    p_page_path: pagePath,
  })

  if (error) throw new Error(`Could not record site visit: ${error.message}`)
}

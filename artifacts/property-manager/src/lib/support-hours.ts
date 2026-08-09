// Support business hours — the SINGLE source of truth for whether Livarex
// Support as a whole is open.
//
// The customer-facing "Support Online / Away" status follows ONLY this
// schedule. It must NEVER be driven by the agent heartbeat (which flickers).
// Individual agent presence is a separate concept handled by live-support.ts.
//
// Timezone: Africa/Lagos is the canonical timezone. We compute "now" in
// Africa/Lagos explicitly, so a visitor's or admin's local browser timezone
// can never shift the open/closed boundary.

import { createClient } from './supabase'

export interface DayHours {
  /** "HH:MM" 24h, e.g. "08:00" */
  open: string
  /** "HH:MM" 24h, e.g. "18:00" */
  close: string
  /** When false, support is closed all day for this weekday. */
  enabled: boolean
}

/** Weekday index: 0 = Sunday … 6 = Saturday (matches JS Date.getDay()). */
export type SupportHours = {
  timezone: string
  days: [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours]
}

export const SUPPORT_TIMEZONE = 'Africa/Lagos'

export const DEFAULT_SUPPORT_HOURS: SupportHours = {
  timezone: SUPPORT_TIMEZONE,
  days: [
    { open: '08:00', close: '18:00', enabled: true }, // Sun
    { open: '08:00', close: '18:00', enabled: true }, // Mon
    { open: '08:00', close: '18:00', enabled: true }, // Tue
    { open: '08:00', close: '18:00', enabled: true }, // Wed
    { open: '08:00', close: '18:00', enabled: true }, // Thu
    { open: '08:00', close: '18:00', enabled: true }, // Fri
    { open: '08:00', close: '18:00', enabled: true }, // Sat
  ],
}

/** Format "HH:MM" -> minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Current weekday + minute-of-day in Africa/Lagos. `now` is a normal Date;
 * we convert it to Africa/Lagos wall-clock time via Intl (never the local
 * browser timezone).
 */
export function lagosNow(now = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SUPPORT_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const day = weekdayMap[get('weekday')] ?? now.getDay()
  // Intl can give "24" for midnight (hour12:false) — normalize to 0.
  let hour = Number(get('hour')) || 0
  if (hour === 24) hour = 0
  const minute = Number(get('minute')) || 0
  return { day, minutes: hour * 60 + minute }
}

/** True when Livarex Support is currently open (Africa/Lagos). */
export function isSupportOpen(hours: SupportHours, now = new Date()): boolean {
  const { day, minutes } = lagosNow(now)
  const h = hours?.days?.[day]
  if (!h || !h.enabled) return false
  const open = toMinutes(h.open)
  const close = toMinutes(h.close)
  // open === close means 24h. Otherwise support is open while
  // open <= minutes < close (an overnight shift is not in scope here).
  return open === close ? true : minutes >= open && minutes < close
}

/** Human label for the schedule, e.g. "8:00 AM – 6:00 PM". */
export function formatDayHours(h: DayHours): string {
  if (!h.enabled) return 'Closed'
  const fmt = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 === 0 ? 12 : h % 12
    return `${hour12}:${String(m || 0).padStart(2, '0')} ${ampm}`
  }
  return `${fmt(h.open)} – ${fmt(h.close)}`
}

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

// ── Persistence (admin_settings key: support_hours) ───────────────────────────

let cache: SupportHours | null = null
let inflight: Promise<SupportHours> | null = null

/** Load the persisted support hours, falling back to defaults. */
export async function getSupportHours(options?: { refresh?: boolean }): Promise<SupportHours> {
  if (cache && !options?.refresh) return cache
  if (inflight && !options?.refresh) return inflight

  inflight = (async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'support_hours')
        .maybeSingle()
      if (!error && data?.value) {
        cache = { ...DEFAULT_SUPPORT_HOURS, ...(data.value as Partial<SupportHours>), days: (data.value as SupportHours).days ?? DEFAULT_SUPPORT_HOURS.days }
        return cache
      }
    } catch {
      /* fall through to defaults */
    }
    cache = DEFAULT_SUPPORT_HOURS
    return cache
  })()

  return inflight
}

/** Clear the cache (call after admin saves support hours). */
export function invalidateSupportHours() {
  cache = null
}

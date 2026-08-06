// Reads public platform settings (Admin → Settings) from the `admin_settings`
// table and exposes them to the rest of the app. This is the single source of
// truth for the admin phone number, support email, and notification settings —
// nothing hardcodes those values anymore.

import { createClient } from './supabase'

export interface PlatformSettings {
  name: string
  tagline: string
  email: string
  phone: string
  address: string
  currency: string
  country: string
  website: string
}

export interface NotificationSettings {
  newLandlord: boolean
  newEnquiry: boolean
  newProperty: boolean
  weeklyReport: boolean
  smsAlerts: boolean
  adminEmail: string
}

export const DEFAULT_PLATFORM: PlatformSettings = {
  name: 'Livarex',
  tagline: "Nigeria's most trusted property platform",
  email: 'support@livarex.com.ng',
  phone: '+234 800 548 2621',
  address: '14 Bourdillon Road, Ikoyi, Lagos',
  currency: 'NGN',
  country: 'Nigeria',
  website: 'https://livarex.com.ng',
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  newLandlord: true,
  newEnquiry: true,
  newProperty: false,
  weeklyReport: true,
  smsAlerts: false,
  adminEmail: 'admin@livarex.com.ng',
}

export interface ListingSettings {
  autoApprove: boolean
  maxPerLandlord: number
  requireImages: boolean
  requireDescription: boolean
  allowNegotiation: boolean
  agencyFeePercent: number
}

export const DEFAULT_LISTING: ListingSettings = {
  autoApprove: false,
  maxPerLandlord: 20,
  requireImages: true,
  requireDescription: true,
  allowNegotiation: true,
  agencyFeePercent: 10,
}

/**
 * Manual support-availability override + weekly schedule.
 *
 * `mode`:
 *  - 'auto'    → availability is driven purely by realtime presence
 *  - 'online'  → force-available (shown as online even with no presence)
 *  - 'offline' → force-unavailable (shown as offline regardless of presence)
 *  - 'back_in' → offline but with a "back at HH:MM" message visitors see
 *
 * `schedule` (optional weekly windows, e.g. Mon–Fri 09:00–17:00 WAT):
 *  - day: 0 (Sun) … 6 (Sat)
 *  - open/close: "HH:MM" 24h strings. `open === close` means a 24h window.
 * A schedule is only consulted when mode is 'auto' and no agent is present.
 */
export interface SupportAvailability {
  mode: 'auto' | 'online' | 'offline' | 'back_in'
  /** Used when mode === 'back_in' — the local time support returns. */
  backAt?: string
  /** Weekly windows; empty array = always open within schedule mode. */
  schedule: { day: number; open: string; close: string }[]
}

export const DEFAULT_AVAILABILITY: SupportAvailability = {
  mode: 'auto',
  schedule: [],
}

type Settings = {
  platform: PlatformSettings
  notifications: NotificationSettings
  listing: ListingSettings
  availability: SupportAvailability
}

let cache: Settings | null = null

let inflight: Promise<Settings> | null = null

/** Fetch the persisted admin settings, falling back to defaults. */
export async function getPlatformSettings(options?: { refresh?: boolean }): Promise<PlatformSettings> {
  const all = await getSettings(options)
  return all.platform
}

export async function getNotificationSettings(options?: { refresh?: boolean }): Promise<NotificationSettings> {
  const all = await getSettings(options)
  return all.notifications
}

export async function getListingSettings(options?: { refresh?: boolean }): Promise<ListingSettings> {
  const all = await getSettings(options)
  return all.listing
}

export async function getSupportAvailability(options?: { refresh?: boolean }): Promise<SupportAvailability> {
  const all = await getSettings(options)
  return all.availability
}

/** True when the weekly schedule says support should be open right now. */
export function isWithinSchedule(availability: SupportAvailability, now = new Date()): boolean {
  const windows = availability.schedule ?? []
  if (windows.length === 0) return true
  const day = now.getDay()
  const mins = now.getHours() * 60 + now.getMinutes()
  const todays = windows.filter((w) => w.day === day)
  if (todays.length === 0) return false
  return todays.some((w) => {
    if (w.open === w.close) return true // 24h window
    const [oh, om] = w.open.split(':').map(Number)
    const [ch, cm] = w.close.split(':').map(Number)
    const openMins = oh * 60 + om
    const closeMins = ch * 60 + cm
    return mins >= openMins && mins < closeMins
  })
}

async function getSettings(options?: { refresh?: boolean }): Promise<Settings> {
  if (cache && !options?.refresh) return cache
  if (inflight && !options?.refresh) return inflight

  inflight = (async () => {
    const fallback: Settings = {
      platform: DEFAULT_PLATFORM,
      notifications: DEFAULT_NOTIFICATIONS,
      listing: DEFAULT_LISTING,
      availability: DEFAULT_AVAILABILITY,
    }
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')

      if (error) {
        console.warn('[platform-settings] Could not load settings:', error.message)
        cache = fallback
        return cache
      }

      cache = {
        platform: { ...DEFAULT_PLATFORM, ...((data ?? []).find((r: any) => r.key === 'platform')?.value ?? {}) },
        notifications: { ...DEFAULT_NOTIFICATIONS, ...((data ?? []).find((r: any) => r.key === 'notifications')?.value ?? {}) },
        listing: { ...DEFAULT_LISTING, ...((data ?? []).find((r: any) => r.key === 'listing_rules')?.value ?? {}) },
        availability: { ...DEFAULT_AVAILABILITY, ...((data ?? []).find((r: any) => r.key === 'support_availability')?.value ?? {}) },
      }
      return cache
    } catch (err) {
      console.warn('[platform-settings] Failed to load settings:', err)
      cache = fallback
      return cache
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Clear the cache (call after admin saves settings). */
export function invalidatePlatformSettings() {
  cache = null
}

/** Convert a stored phone number into an international wa.me link. */
export function phoneToWaLink(phone: string, message?: string): string {
  const digits = (phone || '').replace(/\D/g, '')
  const normalized = digits.startsWith('0') ? '234' + digits.slice(1) : digits
  const base = `https://wa.me/${normalized}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/** Convert a stored phone number into a tel: link. */
export function phoneToTelLink(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '')
  const normalized = digits.startsWith('0') ? '+234' + digits.slice(1) : '+' + digits
  return `tel:${normalized}`
}

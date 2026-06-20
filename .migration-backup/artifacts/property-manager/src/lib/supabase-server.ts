import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key)
}

export function createServerClient() {
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
    )
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function getSupabaseImageUrl(storagePath: string, width = 800) {
  return `${url}/storage/v1/object/public/property-images/${storagePath}?width=${width}&resize=contain`
}

export function getSupabaseImageThumbnailUrl(storagePath: string) {
  return getSupabaseImageUrl(storagePath, 400)
}

export function getSupabaseAvatarUrl(storagePath: string) {
  return `${url}/storage/v1/object/public/landlord-avatars/${storagePath}`
}

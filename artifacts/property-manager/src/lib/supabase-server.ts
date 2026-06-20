import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key)
}

export function createServerClient() {
  if (!url || !key) {
    console.warn('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
    return createSupabaseClient('https://placeholder.supabase.co', 'placeholder')
  }
  return createSupabaseClient(url, key, {
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

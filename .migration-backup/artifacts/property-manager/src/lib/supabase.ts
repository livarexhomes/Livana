import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Support both Vite (import.meta.env) and Next.js (process.env) environments
function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`NEXT_PUBLIC_${key}`]
  }
  // @ts-ignore - Vite env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key]
  }
  return undefined
}

const url = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || ''
const key = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || ''

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: ReturnType<typeof createSupabaseClient<any>> | null = null

export function createClient() {
  if (!_client) {
    if (!url || !key) {
      throw new Error(
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      )
    }
    _client = createSupabaseClient(url, key, {
      auth: {
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  }
  return _client
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

export function getSupabaseProjectImageUrl(storagePath: string) {
  return `${url}/storage/v1/object/public/project-images/${storagePath}`
}

// KYC docs are in a private bucket — use signed URLs via the client
export async function getKycDocUrl(storagePath: string): Promise<string | null> {
  const client = createClient()
  const { data, error } = await client.storage
    .from('kyc-documents')
    .createSignedUrl(storagePath, 60 * 60) // 1 hour
  if (error) console.error('[KYC] createSignedUrl error:', error.message, 'path:', storagePath)
  return data?.signedUrl ?? null
}

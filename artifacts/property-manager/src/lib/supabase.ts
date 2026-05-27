import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

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
        flowType: 'implicit',
      },
    })
  }
  return _client
}

export function getSupabaseImageUrl(storagePath: string) {
  return `${url}/storage/v1/object/public/property-images/${storagePath}`
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
  const { data } = await client.storage
    .from('kyc-documents')
    .createSignedUrl(storagePath, 60 * 60) // 1 hour
  return data?.signedUrl ?? null
}

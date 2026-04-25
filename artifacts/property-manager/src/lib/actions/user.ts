'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ── Helpers ───────────────────────────────────────────────────

async function getAuthenticatedTenant(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const, tenant: null, user: null }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!tenant) return { error: 'Tenant profile not found' as const, tenant: null, user }

  return { error: null, tenant, user }
}

// ── Profile ───────────────────────────────────────────────────

const ProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
})

export type UserProfileFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function upsertUserProfile(
  _prev: UserProfileFormState,
  formData: FormData
): Promise<UserProfileFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)
  const parsed = ProfileSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const { error } = await supabase.from('tenants').upsert(
    { user_id: user.id, ...parsed.data },
    { onConflict: 'user_id' }
  )

  if (error) return { error: error.message }

  revalidatePath('/user/profile')
  revalidatePath('/user')
  return { success: true }
}

// ── Saved Properties ──────────────────────────────────────────

export async function saveProperty(propertyId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error: authError, tenant } = await getAuthenticatedTenant(supabase)
  if (authError || !tenant) return { error: authError ?? 'Not authenticated' }

  const { error } = await supabase
    .from('saved_properties')
    .insert({ tenant_id: tenant.id, property_id: propertyId })

  // Ignore unique-constraint violation (already saved)
  if (error && !error.message.includes('duplicate')) return { error: error.message }

  revalidatePath('/user/saved')
  revalidatePath('/listings')
  return {}
}

export async function unsaveProperty(propertyId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error: authError, tenant } = await getAuthenticatedTenant(supabase)
  if (authError || !tenant) return { error: authError ?? 'Not authenticated' }

  const { error } = await supabase
    .from('saved_properties')
    .delete()
    .eq('tenant_id', tenant.id)
    .eq('property_id', propertyId)

  if (error) return { error: error.message }

  revalidatePath('/user/saved')
  revalidatePath('/listings')
  return {}
}

// ── Enquiries ─────────────────────────────────────────────────

const EnquirySchema = z.object({
  property_id: z.string().uuid('Invalid property'),
  landlord_id: z.string().uuid().optional().nullable(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export type EnquiryFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function submitEnquiry(
  _prev: EnquiryFormState,
  formData: FormData
): Promise<EnquiryFormState> {
  const supabase = await createClient()
  const { error: authError, tenant } = await getAuthenticatedTenant(supabase)
  if (authError || !tenant) return { error: authError ?? 'Not authenticated' }

  const raw = Object.fromEntries(formData)
  const parsed = EnquirySchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const { error } = await supabase.from('enquiries').insert({
    tenant_id: tenant.id,
    property_id: parsed.data.property_id,
    landlord_id: parsed.data.landlord_id ?? null,
    message: parsed.data.message,
  })

  if (error) return { error: error.message }

  revalidatePath('/user/enquiries')
  return { success: true }
}

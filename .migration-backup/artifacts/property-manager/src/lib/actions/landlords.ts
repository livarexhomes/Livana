'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { z } from 'zod'

const ProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  whatsapp: z.string().min(7, 'WhatsApp number is required'),
  bio: z.string().optional(),
})

export type ProfileFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function upsertLandlordProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)
  const parsed = ProfileSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const { error } = await supabase.from('landlords').upsert(
    { user_id: user.id, ...parsed.data },
    { onConflict: 'user_id' }
  )

  if (error) return { error: error.message }

  revalidatePath('/landlord/profile')
  revalidatePath('/landlord')
  return { success: true }
}

export async function approveLandlord(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error) return { error: auth.error }
  const { error } = await supabase
    .from('landlords')
    .update({ status: 'approved' })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/landlords')
  return {}
}

export async function rejectLandlord(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error) return { error: auth.error }
  const { error } = await supabase
    .from('landlords')
    .update({ status: 'rejected' })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/landlords')
  return {}
}

export async function toggleVerifiedBadge(
  id: string,
  is_verified: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error) return { error: auth.error }
  const { error } = await supabase
    .from('landlords')
    .update({ is_verified })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/landlords')
  revalidatePath('/listings')
  return {}
}

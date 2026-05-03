'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { z } from 'zod'

const PropertySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  price: z.coerce.number().positive('Price must be positive'),
  bedrooms: z.coerce.number().int().min(0),
  bathrooms: z.coerce.number().int().min(0),
  area_sqft: z.coerce.number().positive().optional().nullable(),
  type: z.enum(['sale', 'rent']),
  status: z.enum(['available', 'taken', 'coming_soon', 'under_negotiation']),
  featured: z.coerce.boolean().optional().default(false),
})

export type PropertyFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function createProperty(
  _prev: PropertyFormState,
  formData: FormData
): Promise<PropertyFormState> {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error) return { error: auth.error }

  const raw = Object.fromEntries(formData)
  const parsed = PropertySchema.safeParse(raw)

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { error } = await supabase.from('properties').insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/admin/properties')
  return { success: true }
}

export async function updateProperty(
  id: string,
  _prev: PropertyFormState,
  formData: FormData
): Promise<PropertyFormState> {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error) return { error: auth.error }

  const raw = Object.fromEntries(formData)
  const parsed = PropertySchema.safeParse(raw)

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { error } = await supabase
    .from('properties')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/properties')
  revalidatePath(`/admin/properties/${id}/edit`)
  return { success: true }
}

export async function deleteProperty(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error) return { error: auth.error }
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/properties')
  revalidatePath('/listings')
  return {}
}

export async function updatePropertyStatus(
  id: string,
  status: 'available' | 'taken' | 'coming_soon' | 'under_negotiation'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error) return { error: auth.error }
  const { error } = await supabase
    .from('properties')
    .update({ status })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/properties')
  revalidatePath('/listings')
  return {}
}

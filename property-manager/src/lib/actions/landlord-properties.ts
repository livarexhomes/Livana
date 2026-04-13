'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  status: z.enum(['available', 'unavailable', 'pending']),
  featured: z.coerce.boolean().optional().default(false),
})

export type LandlordPropertyFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

async function getLandlordId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('landlords')
    .select('id, status')
    .eq('user_id', userId)
    .single()
  return data
}

export async function landlordCreateProperty(
  _prev: LandlordPropertyFormState,
  formData: FormData
): Promise<LandlordPropertyFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const landlord = await getLandlordId(supabase, user.id)
  if (!landlord || landlord.status !== 'approved') return { error: 'Account not approved' }

  const raw = Object.fromEntries(formData)
  const parsed = PropertySchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  // Handle image uploads
  const images = formData.getAll('images') as File[]
  const { data: property, error } = await supabase
    .from('properties')
    .insert({ ...parsed.data, landlord_id: landlord.id })
    .select('id')
    .single()

  if (error || !property) return { error: error?.message ?? 'Failed to create listing' }

  // Upload images to storage
  for (let i = 0; i < images.length; i++) {
    const file = images[i]
    if (!file || file.size === 0) continue
    const ext = file.name.split('.').pop()
    const path = `${property.id}/${Date.now()}-${i}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(path, file)
    if (!uploadError) {
      await supabase.from('property_images').insert({
        property_id: property.id,
        storage_path: path,
        is_cover: i === 0,
        sort_order: i,
      })
    }
  }

  revalidatePath('/landlord/listings')
  revalidatePath('/listings')
  return { success: true }
}

export async function landlordUpdateProperty(
  id: string,
  _prev: LandlordPropertyFormState,
  formData: FormData
): Promise<LandlordPropertyFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const landlord = await getLandlordId(supabase, user.id)
  if (!landlord) return { error: 'Account not found' }

  const raw = Object.fromEntries(formData)
  const parsed = PropertySchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const { error } = await supabase
    .from('properties')
    .update(parsed.data)
    .eq('id', id)
    .eq('landlord_id', landlord.id) // scoped to own listings

  if (error) return { error: error.message }

  revalidatePath('/landlord/listings')
  revalidatePath('/listings')
  return { success: true }
}

export async function landlordDeleteProperty(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const landlord = await getLandlordId(supabase, user.id)
  if (!landlord) return { error: 'Account not found' }

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .eq('landlord_id', landlord.id)

  if (error) return { error: error.message }

  revalidatePath('/landlord/listings')
  revalidatePath('/listings')
  return {}
}

export async function landlordUpdateAvailability(
  propertyId: string,
  status: 'available' | 'unavailable' | 'pending'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const landlord = await getLandlordId(supabase, user.id)
  if (!landlord) return { error: 'Account not found' }

  const { error } = await supabase
    .from('properties')
    .update({ status })
    .eq('id', propertyId)
    .eq('landlord_id', landlord.id)

  if (error) return { error: error.message }

  revalidatePath('/landlord/listings')
  revalidatePath('/listings')
  return {}
}

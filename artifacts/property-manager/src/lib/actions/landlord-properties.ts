'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// File upload security
// ---------------------------------------------------------------------------

/** MIME types accepted for property images. */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

/** Maximum size per image file (5 MB). */
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

/** Extension derived from the allowed MIME type — never from the filename. */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export type ImageValidationError = { index: number; reason: string }

/**
 * Validates a list of uploaded files against the MIME allowlist and size cap.
 * Returns an array of per-file errors (empty when all files are valid).
 * Validation is based on the browser-reported MIME type (`file.type`), which
 * Next.js/Node reads from the multipart Content-Type — not the filename.
 */
export function validateImageFiles(files: File[]): ImageValidationError[] {
  const errors: ImageValidationError[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file || file.size === 0) continue
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      errors.push({ index: i, reason: `File "${file.name}" is not an allowed image type (jpeg, png, webp, gif).` })
    } else if (file.size > MAX_IMAGE_SIZE_BYTES) {
      errors.push({ index: i, reason: `File "${file.name}" exceeds the 5 MB size limit.` })
    }
  }
  return errors
}

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

  // Validate all files before touching the DB — reject the whole request on any violation.
  const imageErrors = validateImageFiles(images)
  if (imageErrors.length > 0) {
    return { error: imageErrors[0].reason }
  }

  const { data: property, error } = await supabase
    .from('properties')
    .insert({ ...parsed.data, landlord_id: landlord.id })
    .select('id')
    .single()

  if (error || !property) return { error: error?.message ?? 'Failed to create listing' }

  // Upload images to storage — extension derived from MIME type, never from filename.
  for (let i = 0; i < images.length; i++) {
    const file = images[i]
    if (!file || file.size === 0) continue
    const ext = MIME_TO_EXT[file.type]
    const path = `${property.id}/${Date.now()}-${i}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(path, file, { contentType: file.type })
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

export async function landlordUpdateEnquiryStatus(
  enquiryId: string,
  status: 'open' | 'replied' | 'closed'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const landlord = await getLandlordId(supabase, user.id)
  if (!landlord) return { error: 'Account not found' }

  // Only update enquiries directed at this landlord's properties
  const { error } = await supabase
    .from('enquiries')
    .update({ status })
    .eq('id', enquiryId)
    .eq('landlord_id', landlord.id)

  if (error) return { error: error.message }

  revalidatePath('/landlord/enquiries')
  return {}
}

export async function landlordUpdateAvailability(
  propertyId: string,
  status: 'available' | 'taken' | 'coming_soon' | 'under_negotiation'
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

'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['renter', 'landlord', 'other']).default('other'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export type ContactFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function submitContactMessage(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const raw = Object.fromEntries(formData)
  const parsed = ContactSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.from('contact_messages').insert(parsed.data)

  if (error) return { error: error.message }

  return { success: true }
}

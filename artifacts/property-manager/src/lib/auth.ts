import { createClient } from './supabase'

export function isAdminUser(user: { app_metadata?: Record<string, unknown> | null } | null): boolean {
  if (!user) return false
  const meta = user.app_metadata ?? {}
  if (meta.role === 'admin') return true
  if (Array.isArray(meta.roles) && meta.roles.includes('admin')) return true
  return false
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

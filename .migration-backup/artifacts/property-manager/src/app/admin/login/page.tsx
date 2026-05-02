import { redirect } from 'next/navigation'

// Admin login consolidated into the unified /login page.
export default function AdminLoginRedirect() {
  redirect('/login')
}

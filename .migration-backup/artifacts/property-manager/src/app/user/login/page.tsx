import { redirect } from 'next/navigation'

// User login consolidated into the unified /login page.
export default function UserLoginRedirect() {
  redirect('/login')
}

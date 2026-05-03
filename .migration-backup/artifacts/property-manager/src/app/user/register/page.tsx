import { redirect } from 'next/navigation'

// User registration consolidated into the unified /register page.
export default function UserRegisterRedirect() {
  redirect('/register')
}

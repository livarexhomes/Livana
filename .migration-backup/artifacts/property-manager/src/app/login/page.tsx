'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const supabase = createClient()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: form.get('email') as string,
      password: form.get('password') as string,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const user = data.user
    const meta = user?.app_metadata ?? {}

    // Admin
    const isAdmin =
      meta.role === 'admin' ||
      (Array.isArray(meta.roles) && meta.roles.includes('admin'))
    if (isAdmin) {
      router.push('/admin')
      router.refresh()
      return
    }

    // Landlord
    const { data: landlord } = await supabase
      .from('landlords')
      .select('status')
      .eq('user_id', user!.id)
      .single()

    if (landlord) {
      if (landlord.status === 'pending') router.push('/landlord/pending')
      else if (landlord.status === 'rejected') router.push('/landlord/rejected')
      else router.push('/landlord')
      router.refresh()
      return
    }

    // Tenant — ensure profile exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', user!.id)
      .single()

    if (!tenant) {
      router.push('/register')
      router.refresh()
      return
    }

    router.push('/user')
    router.refresh()
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-8 leading-snug">
          Sign In to unlock the best of<br />Livana
        </h1>

        {/* Card — single form element, method=post prevents GET fallback */}
        <form method="post" onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Email Address"
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900
                placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b9e6e] focus:border-transparent
                transition"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Password"
              className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900
                placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b9e6e] focus:border-transparent
                transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-[#6b9e6e] hover:underline font-medium"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#6b9e6e] hover:bg-[#5d8f60] disabled:opacity-60
              text-white font-semibold rounded-full transition focus:outline-none focus:ring-2
              focus:ring-[#6b9e6e] focus:ring-offset-2"
          >
            {loading ? 'Signing in…' : 'Proceed'}
          </button>

          {/* Register link */}
          <p className="text-center text-sm text-gray-500">
            New?{' '}
            <Link href="/register" className="text-[#6b9e6e] hover:underline font-medium">
              Register here
            </Link>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full border border-gray-200
              bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition disabled:opacity-60
              focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {/* Google G logo */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

        </form>
      </div>
    </div>
  )
}

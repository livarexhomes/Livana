'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UserLoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

    // Admins who land here get sent to the admin panel
    const isAdmin = meta.role === 'admin' || (Array.isArray(meta.roles) && meta.roles.includes('admin'))
    if (isAdmin) {
      router.push('/admin')
      router.refresh()
      return
    }

    // Check if this user is a landlord — send them to the landlord portal
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

    // Regular tenant — ensure profile exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', user!.id)
      .single()

    if (!tenant) {
      // Auth user exists but no tenant profile — send to register to complete it
      router.push('/user/register')
      router.refresh()
      return
    }

    router.push('/user')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#aadb5a] mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input name="email" type="email" required autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#aadb5a] focus:border-transparent"
                placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input name="password" type="password" required autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#aadb5a] focus:border-transparent"
                placeholder="••••••••" />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 bg-[#aadb5a] hover:bg-[#9bcf4a] disabled:opacity-60
                text-gray-900 text-sm font-semibold rounded-lg transition focus:outline-none focus:ring-2
                focus:ring-[#aadb5a] focus:ring-offset-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            No account yet?{' '}
            <Link href="/user/register" className="text-gray-900 hover:underline font-medium">
              Create one
            </Link>
          </p>

          <p className="text-center text-sm text-gray-500 mt-2">
            Are you a landlord?{' '}
            <Link href="/landlord/login" className="text-gray-900 hover:underline font-medium">
              Landlord portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

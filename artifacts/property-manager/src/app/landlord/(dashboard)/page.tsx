export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LandlordDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/landlord/login')

  const { data: landlord } = await supabase
    .from('landlords')
    .select('id, full_name, is_verified')
    .eq('user_id', user.id)
    .single()

  if (!landlord) redirect('/landlord/register')

  const [{ count: total }, { count: available }, { count: taken }] =
    await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('landlord_id', landlord.id),
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('landlord_id', landlord.id).eq('status', 'available'),
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('landlord_id', landlord.id).eq('status', 'taken'),
    ])

  const stats = [
    { label: 'Total listings', value: total ?? 0, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Available', value: available ?? 0, color: 'bg-green-50 text-green-700' },
    { label: 'Taken', value: taken ?? 0, color: 'bg-red-50 text-red-700' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Welcome back, {landlord.full_name.split(' ')[0]}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Here&apos;s an overview of your listings.</p>
        </div>
        <Link
          href="/landlord/listings/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700
            text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add listing
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${s.color}`}>
              {s.value}
            </div>
            <p className="text-sm text-gray-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick link */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Manage your listings</p>
          <p className="text-xs text-gray-500 mt-0.5">Add, edit, or update availability.</p>
        </div>
        <Link href="/landlord/listings"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          View all →
        </Link>
      </div>
    </div>
  )
}

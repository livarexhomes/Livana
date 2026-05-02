import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Heart, MessageSquare, User } from 'lucide-react'

export default async function UserOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, full_name')
    .eq('user_id', user!.id)
    .single()

  const [{ count: savedCount }, { count: enquiryCount }] = await Promise.all([
    supabase.from('saved_properties').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant!.id),
    supabase.from('enquiries').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant!.id),
  ])

  const stats = [
    { label: 'Saved properties', value: savedCount ?? 0, href: '/user/saved', icon: Heart, color: 'bg-red-50 text-red-500' },
    { label: 'Enquiries sent', value: enquiryCount ?? 0, href: '/user/enquiries', icon: MessageSquare, color: 'bg-blue-50 text-blue-500' },
  ]

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Welcome back, {tenant?.full_name?.split(' ')[0] ?? 'there'}</h2>
        <p className="text-sm text-gray-500 mt-1">Here's a summary of your activity.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {stats.map(({ label, value, href, icon: Icon, color }) => (
          <Link key={href} href={href}
            className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#aadb5a]/20 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-[#7ab82e]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{tenant?.full_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        <Link href="/user/profile"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          Edit profile →
        </Link>
      </div>

      <div className="bg-[#aadb5a]/10 rounded-2xl border border-[#aadb5a]/30 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Find your next home</h3>
        <p className="text-sm text-gray-600 mb-4">Browse verified listings and save the ones you love.</p>
        <Link href="/listings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#aadb5a] hover:bg-[#9bcf4a] text-gray-900 text-sm font-semibold rounded-lg transition-colors">
          Browse listings
        </Link>
      </div>
    </div>
  )
}

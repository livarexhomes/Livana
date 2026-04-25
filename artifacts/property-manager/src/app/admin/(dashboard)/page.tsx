import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const supabase = await createClient()

  const [{ count: total }, { count: available }, { count: taken }] =
    await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true }),
      supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available'),
      supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'taken'),
    ])

  return { total: total ?? 0, available: available ?? 0, unavailable: taken ?? 0 }
}

const statCards = [
  {
    label: 'Total Properties',
    key: 'total' as const,
    color: 'bg-indigo-50 text-indigo-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: 'Available',
    key: 'available' as const,
    color: 'bg-green-50 text-green-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Unavailable',
    key: 'unavailable' as const,
    color: 'bg-red-50 text-red-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.key} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{stats[card.key]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder content area */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Recent Properties</h2>
        <p className="text-sm text-gray-500">
          Properties you add will appear here. Use the sidebar to manage listings,
          availability, and images.
        </p>
      </div>
    </div>
  )
}

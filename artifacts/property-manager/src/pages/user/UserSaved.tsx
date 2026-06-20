import { useState, useEffect } from 'react'
import { Link } from '@/lib/navigation'
import { Heart, ArrowRight, Building2, Trash2 } from 'lucide-react'
import AuthGuard from '../../components/auth/AuthGuard'
import { UserLayout } from './UserDashboard'
import ListingCard from '../../components/property/ListingCard'
import { createClient } from '../../lib/supabase'
import type { PropertyWithLandlord } from '../../lib/types'

export default function UserSavedPage() {
  const [items, setItems] = useState<{ id: string; property_id: string; properties: PropertyWithLandlord }[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: tenant } = await supabase
        .from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (!tenant) { setLoading(false); return }
      setTenantId(tenant.id)
      const { data } = await supabase
        .from('saved_properties')
        .select('id, property_id, properties(*, landlords(full_name, whatsapp, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order))')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
      setItems((data as any[]) ?? [])
      setLoading(false)
    })
  }, [])

  async function handleUnsave(savedId: string, propertyId: string) {
    if (!tenantId) return
    setRemovingId(propertyId)
    const supabase = createClient()
    await supabase.from('saved_properties').delete().eq('id', savedId)
    setItems(prev => prev.filter(i => i.id !== savedId))
    setRemovingId(null)
  }

  const savedIds = new Set(items.map(i => i.property_id))

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Saved Properties">
        <div className="space-y-4">

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex bg-white rounded-2xl overflow-hidden border border-gray-100 h-36 animate-pulse">
                  <div className="w-44 bg-gray-200 shrink-0" />
                  <div className="flex-1 p-4 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">No saved properties yet</h3>
              <p className="text-sm text-gray-500 mb-5">Bookmark any listing to find it here.</p>
              <Link href="/listings"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors">
                Browse listings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-gray-500">
                  <span className="font-bold text-gray-900">{items.length}</span>{' '}
                  saved {items.length === 1 ? 'property' : 'properties'}
                </p>
                <Link href="/listings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  Browse more <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="relative group">
                    <ListingCard
                      property={item.properties}
                      saved={savedIds.has(item.property_id)}
                      isAuthenticated={true}
                    />
                    {/* Unsave overlay button */}
                    <button
                      onClick={() => handleUnsave(item.id, item.property_id)}
                      disabled={removingId === item.property_id}
                      className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-500 text-xs font-semibold rounded-xl shadow-sm hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </UserLayout>
    </AuthGuard>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Heart, MapPin, BedDouble, Bath } from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import { UserLayout } from './UserDashboard'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'

export default function UserSavedPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single()
      if (!tenant) { setLoading(false); return }
      const { data } = await supabase
        .from('saved_properties')
        .select('id, property_id, created_at, properties(id, title, city, price, type, bedrooms, bathrooms, landlords(full_name, is_verified), property_images(storage_path, is_cover))')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
      setItems(data ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Saved Properties">
        <div className="max-w-4xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Saved properties</h2>
            <p className="text-sm text-gray-500 mt-1">{items.length} {items.length === 1 ? 'property' : 'properties'} saved</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <Heart className="w-10 h-10 text-gray-200 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">No saved properties yet</h3>
              <p className="text-sm text-gray-500 mb-4">Tap the heart icon on any listing to save it here.</p>
              <Link href="/listings" className="inline-flex items-center gap-2 px-4 py-2 bg-[#6b9e6e] text-white text-sm font-semibold rounded-lg transition-colors">
                Browse listings
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {items.map(item => {
                const p = item.properties
                const cover = p.property_images?.find((i: any) => i.is_cover) ?? p.property_images?.[0]
                const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null
                return (
                  <Link key={item.id} href={`/listings/${p.id}`}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="relative aspect-[16/9] bg-gray-100">
                      {coverUrl ? (
                        <img src={coverUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                      )}
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 text-gray-900 text-[10px] font-bold uppercase tracking-wider rounded-full">
                        For {p.type}
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-gray-900 text-lg">₦{Number(p.price).toLocaleString()}</p>
                      <p className="text-sm font-medium text-gray-700 truncate mt-0.5">{p.title}</p>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /><span>{p.city}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
                        <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" />{p.bedrooms}</span>
                        <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{p.bathrooms}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </UserLayout>
    </AuthGuard>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Heart, MapPin, BedDouble, Bath, ArrowRight, Building2 } from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import { UserLayout } from './UserDashboard'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'

const FALLBACK = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=70'

export default function UserSavedPage() {
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (!tenant) { setLoading(false); return }
      const result = await supabase
        .from('saved_properties')
        .select('id, property_id, created_at, properties(id, title, city, price, type, bedrooms, bathrooms, landlords(full_name, is_verified), property_images(storage_path, is_cover))')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
      setItems((result.data as any[]) ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Saved Properties">
        <div className="space-y-5 max-w-4xl">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">No saved properties yet</h3>
              <p className="text-sm text-gray-500 mb-5">Tap the heart on any listing to save it here.</p>
              <Link href="/listings"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                Browse listings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  {items.length} saved {items.length === 1 ? 'property' : 'properties'}
                </p>
                <Link href="/listings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                  Browse more <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {items.map(item => {
                  const p = item.properties
                  const cover = p.property_images?.find((i: any) => i.is_cover) ?? p.property_images?.[0]
                  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : FALLBACK
                  return (
                    <Link key={item.id} href={`/listings/${p.id}`}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        <img src={coverUrl} alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={(e: any) => { e.currentTarget.src = FALLBACK }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 bg-white/90 text-gray-900 text-[10px] font-black uppercase tracking-wide rounded-lg shadow-sm">
                            For {p.type}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-400" />
                          </div>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <p className="text-sm font-extrabold text-white drop-shadow">₦{Number(p.price).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{p.title}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />{p.city}
                          {p.landlords?.full_name && (
                            <><span className="text-gray-300 mx-0.5">·</span><span className="truncate">{p.landlords.full_name}</span></>
                          )}
                        </div>
                        {(p.bedrooms != null || p.bathrooms != null) && (
                          <div className="flex items-center gap-3 text-xs text-gray-500 pt-3 border-t border-gray-100">
                            {p.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{p.bedrooms} Beds</span>}
                            {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{p.bathrooms} Baths</span>}
                            <span className="ml-auto flex items-center gap-1 text-blue-600 font-semibold">
                              View <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </UserLayout>
    </AuthGuard>
  )
}

import { useState, useEffect } from 'react'
import { Search, MapPin, Calendar, Plus, TrendingUp, Building2 } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const PROJECTS = [
  {
    id: '1', name: 'Skyline Residences', developer: 'Mixta Africa',
    location: 'Victoria Island, Lagos',
    description: 'Premium waterfront apartments with panoramic Atlantic Ocean views.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80',
    price: 85_000_000, down: 20, completion: 'Q3 2026', progress: 52, units: 240, sold: 124,
    category: 'Residential',
  },
  {
    id: '2', name: 'Abuja Pearl Towers', developer: 'Novare Estates',
    location: 'Maitama, Abuja',
    description: 'Contemporary tower in the most prestigious district of Nigeria\'s capital.',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=900&q=80',
    price: 120_000_000, down: 25, completion: 'Q1 2026', progress: 75, units: 180, sold: 135,
    category: 'Mixed Use',
  },
  {
    id: '3', name: 'Lekki Phase II Estate', developer: 'Propertymart',
    location: 'Lekki, Lagos',
    description: 'Gated community with smart homes, green spaces, and world-class amenities.',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80',
    price: 55_000_000, down: 15, completion: 'Q4 2025', progress: 88, units: 320, sold: 282,
    category: 'Residential',
  },
  {
    id: '4', name: 'Asokoro Heights', developer: 'Citiview',
    location: 'Asokoro, Abuja',
    description: 'Luxury duplexes and terrace houses in Abuja\'s most exclusive diplomatic zone.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
    price: 95_000_000, down: 30, completion: 'Q2 2027', progress: 20, units: 96, sold: 19,
    category: 'Residential',
  },
  {
    id: '5', name: 'Port Harcourt Gardens', developer: 'Elalan Construction',
    location: 'GRA Phase 2, PH',
    description: 'Serene garden-themed estate with 3–5 bedroom homes and 24/7 security.',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80',
    price: 42_000_000, down: 20, completion: 'Q3 2025', progress: 95, units: 160, sold: 152,
    category: 'Residential',
  },
  {
    id: '6', name: 'Banana Island Court', developer: 'Landmark Africa',
    location: 'Banana Island, Lagos',
    description: 'Ultra-luxury island residences — the pinnacle of Nigerian real estate.',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80',
    price: 350_000_000, down: 40, completion: 'Q4 2026', progress: 38, units: 48, sold: 18,
    category: 'Luxury',
  },
]

function progressColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-blue-600'
  if (pct >= 30) return 'bg-amber-500'
  return 'bg-rose-500'
}

function progressTextColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 50) return 'text-blue-600'
  if (pct >= 30) return 'text-amber-600'
  return 'text-rose-500'
}

const CATEGORY_COLORS: Record<string, string> = {
  Residential: 'bg-blue-50 text-blue-700',
  'Mixed Use': 'bg-violet-50 text-violet-700',
  Luxury: 'bg-amber-50 text-amber-700',
  Commercial: 'bg-emerald-50 text-emerald-700',
}

export default function AdminProjects() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
  }, [])

  const filtered = PROJECTS.filter(p => {
    const q = search.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || p.developer.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
  })

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const totalValue = PROJECTS.reduce((sum, p) => sum + p.price * p.units, 0)
  const totalSold  = PROJECTS.reduce((sum, p) => sum + p.sold, 0)
  const totalUnits = PROJECTS.reduce((sum, p) => sum + p.units, 0)

  return (
    <AuthGuard require="admin">
      <div className="flex min-h-screen bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Projects</h1>
              <p className="text-sm text-gray-400 mt-0.5">Off-plan developments from Nigeria's top builders</p>
            </div>
            <button type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Project</span>
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-5">
            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Projects', value: PROJECTS.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Units Sold', value: `${totalSold}/${totalUnits}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Total GDV', value: `₦${(totalValue / 1_000_000_000).toFixed(1)}B`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${s.color}`} strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-gray-900 leading-tight">{s.value}</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search projects, developers, locations…"
                className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <p className="text-gray-500 font-medium">No projects match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filtered.map(p => {
                  const soldPct   = Math.round((p.sold / p.units) * 100)
                  const catColor  = CATEGORY_COLORS[p.category] ?? 'bg-gray-100 text-gray-600'
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
                      {/* Full-bleed image */}
                      <div className="relative h-52 overflow-hidden">
                        <img src={p.image} alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={(e: any) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80' }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        {/* Overlay text */}
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-lg font-extrabold text-white leading-tight">{p.name}</h3>
                              <div className="flex items-center gap-1.5 text-white/70 text-xs mt-1">
                                <MapPin className="w-3 h-3" />{p.location}
                              </div>
                            </div>
                            <span className="shrink-0 px-2.5 py-1 bg-white/90 backdrop-blur text-xs font-bold text-gray-800 rounded-lg shadow-sm">
                              {p.developer}
                            </span>
                          </div>
                        </div>
                        {/* Category */}
                        <div className="absolute top-3 left-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm ${catColor}`}>{p.category}</span>
                        </div>
                        {/* Progress pill */}
                        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm ${progressTextColor(p.progress)} bg-white/90 backdrop-blur`}>
                          {p.progress}% Built
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">{p.description}</p>

                        {/* Progress bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-gray-700">Construction Progress</span>
                            <span className={`font-bold ${progressTextColor(p.progress)}`}>{p.progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${progressColor(p.progress)}`}
                              style={{ width: `${p.progress}%` }} />
                          </div>
                        </div>

                        {/* Sales */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-gray-700">Units Sold</span>
                            <span className="font-bold text-gray-900">{p.sold} / {p.units}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500 transition-all"
                              style={{ width: `${soldPct}%` }} />
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Starting From</p>
                            <p className="text-sm font-extrabold text-gray-900">₦{(p.price / 1_000_000).toFixed(0)}M</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Down Payment</p>
                            <p className="text-sm font-extrabold text-gray-900">{p.down}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Completion</p>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <p className="text-sm font-extrabold text-gray-900">{p.completion}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

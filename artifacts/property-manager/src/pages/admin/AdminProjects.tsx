import { useState, useEffect } from 'react'
import { Search, MapPin, Calendar, Percent, ArrowRight, Plus } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const SAMPLE_PROJECTS = [
  {
    id: '1',
    name: 'Skyline Residences',
    developer: 'Mixta Africa',
    location: 'Victoria Island, Lagos',
    description: 'Premium waterfront apartments with panoramic Atlantic Ocean views in the heart of Lagos.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=70',
    price: 85_000_000,
    down_payment: 20,
    completion: 'Q3 2026',
    progress: 52,
  },
  {
    id: '2',
    name: 'Abuja Pearl Towers',
    developer: 'Novare Estates',
    location: 'Maitama, Abuja',
    description: 'Contemporary residential tower in the most prestigious district of Nigeria\'s capital.',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=70',
    price: 120_000_000,
    down_payment: 25,
    completion: 'Q1 2026',
    progress: 75,
  },
  {
    id: '3',
    name: 'Lekki Phase II Estate',
    developer: 'Propertymart',
    location: 'Lekki, Lagos',
    description: 'Gated community with smart homes, green spaces, and world-class amenities.',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=70',
    price: 55_000_000,
    down_payment: 15,
    completion: 'Q4 2025',
    progress: 88,
  },
  {
    id: '4',
    name: 'Asokoro Heights',
    developer: 'Citiview',
    location: 'Asokoro, Abuja',
    description: 'Luxury duplexes and terrace houses in Abuja\'s most exclusive diplomatic zone.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=70',
    price: 95_000_000,
    down_payment: 30,
    completion: 'Q2 2027',
    progress: 20,
  },
  {
    id: '5',
    name: 'Port Harcourt Gardens',
    developer: 'Elalan Construction',
    location: 'GRA Phase 2, Port Harcourt',
    description: 'Serene garden-themed estate with 3–5 bedroom homes and 24/7 security.',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=70',
    price: 42_000_000,
    down_payment: 20,
    completion: 'Q3 2025',
    progress: 95,
  },
  {
    id: '6',
    name: 'Banana Island Court',
    developer: 'Landmark Africa',
    location: 'Banana Island, Lagos',
    description: 'Ultra-luxury island residences — the pinnacle of Nigerian real estate.',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=70',
    price: 350_000_000,
    down_payment: 40,
    completion: 'Q4 2026',
    progress: 38,
  },
]

function progressColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 50) return 'text-blue-600'
  return 'text-amber-500'
}

export default function AdminProjects() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
  }, [])

  const filtered = SAMPLE_PROJECTS.filter(p => {
    const q = search.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || p.developer.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
  })

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  return (
    <AuthGuard require="admin">
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Top bar ── */}
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-5 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Projects</h1>
              <p className="text-sm text-gray-400 mt-0.5">Explore the latest real estate projects from top developers</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              <Plus className="w-4 h-4" />
              Add Project
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-5">
            {/* ── Search ── */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects by name, developer, or location..."
                className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent"
              />
            </div>

            {/* ── Project Grid ── */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <p className="text-gray-500 font-medium">No projects match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filtered.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                    {/* ── Image ── */}
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e: any) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=70'
                        }}
                      />
                      {/* Developer badge */}
                      <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-gray-800 shadow-sm">
                        {p.developer}
                      </span>
                    </div>

                    {/* ── Content ── */}
                    <div className="p-5">
                      <h3 className="text-lg font-extrabold text-gray-900 mb-1">{p.name}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {p.location}
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed mb-4">{p.description}</p>

                      {/* ── Pricing ── */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Starting From</p>
                          <p className="text-base font-extrabold text-gray-900">
                            ₦{Number(p.price).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Down Payment</p>
                          <p className="text-base font-extrabold text-gray-900">{p.down_payment}%</p>
                        </div>
                      </div>

                      {/* ── Footer ── */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {p.completion}
                          </span>
                          <span className={`flex items-center gap-1 font-semibold ${progressColor(p.progress)}`}>
                            <Percent className="w-3 h-3" />
                            {p.progress}% Complete
                          </span>
                        </div>
                        <button className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

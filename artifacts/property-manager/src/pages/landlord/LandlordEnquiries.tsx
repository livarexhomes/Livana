import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

const statusStyles: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  replied: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default function LandlordEnquiries() {
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: l } = await supabase.from('landlords').select('*').eq('user_id', user.id).single()
      setLandlord(l)
      if (l) {
        const { data } = await supabase
          .from('enquiries')
          .select('*, properties(id, title, city, price), tenants(full_name, phone)')
          .eq('landlord_id', l.id)
          .order('created_at', { ascending: false })
        setEnquiries(data ?? [])
      }
      setLoading(false)
    })
  }, [])

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('enquiries').update({ status }).eq('id', id)
    setEnquiries(es => es.map(e => e.id === id ? { ...e, status } : e))
  }

  return (
    <AuthGuard require="landlord">
      <div className="flex min-h-screen bg-gray-50">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center px-6 bg-white border-b border-gray-100 shrink-0">
            <h1 className="font-semibold text-gray-900">Enquiries</h1>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
              </div>
            ) : enquiries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-1">No enquiries yet</h3>
                <p className="text-sm text-gray-500">Enquiries from tenants will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl">
                {enquiries.map(e => (
                  <div key={e.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{e.properties?.title ?? 'Unknown property'}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          From: {e.tenants?.full_name ?? 'Tenant'}
                          {e.tenants?.phone && <> · {e.tenants.phone}</>}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed mb-3">{e.message}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-gray-400 flex-1">
                        {new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {e.status !== 'replied' && (
                        <button onClick={() => updateStatus(e.id, 'replied')}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#6b9e6e] text-white rounded-lg hover:bg-[#4a7f4d] transition-colors">
                          Mark Replied
                        </button>
                      )}
                      {e.status !== 'closed' && (
                        <button onClick={() => updateStatus(e.id, 'closed')}
                          className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                          Close
                        </button>
                      )}
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

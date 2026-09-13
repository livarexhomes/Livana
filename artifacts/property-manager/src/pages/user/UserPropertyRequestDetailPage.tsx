import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Edit3, MapPin } from 'lucide-react'
import { useLocation, useParams } from '@/lib/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import PropertyRequestDetail from '@/components/requests/PropertyRequestDetail'
import MatchedProperties from '@/components/requests/MatchedProperties'
import RequestStatusTimeline from '@/components/requests/RequestStatusTimeline'
import { createClient } from '@/lib/supabase'
import { UserLayout } from './UserDashboard'
import type { PropertyRequest, PropertyRequestMatchWithProperty } from '@/types'

interface RequestWithRelations extends PropertyRequest {
  property_request_matches?: PropertyRequestMatchWithProperty[]
}

export default function UserPropertyRequestDetailPage() {
  const [, navigate] = useLocation()
  const params = useParams<{ id?: string }>()
  const [request, setRequest] = useState<RequestWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)

  const loadRequest = useCallback(async (currentTenantId: string | null, requestId: string | null) => {
    if (!currentTenantId || !requestId) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('property_requests')
      .select(`*, property_request_matches(*, properties(*, landlords(full_name, whatsapp, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)))`)
      .eq('tenant_id', currentTenantId)
      .eq('id', requestId)
      .maybeSingle()

    if (error) {
      console.error('[property request detail] load failed:', error)
      return
    }

    setRequest(data as RequestWithRelations | null)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }

      let { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: string } | null }

      if (!tenant) {
        setLoading(false)
        return
      }

      setTenantId(tenant.id)
      await loadRequest(tenant.id, params.id ?? null)
      setLoading(false)
    })
  }, [loadRequest, params.id])

  const metadata = useMemo(() => {
    if (!request) return []

    return [
      { label: 'Purpose', value: request.purpose },
      { label: 'Budget', value: `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(request.min_budget)} – ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(request.max_budget)}` },
      { label: 'Bedrooms', value: request.bedrooms ? `${request.bedrooms}` : 'Any' },
      { label: 'Bathrooms', value: request.bathrooms ? `${request.bathrooms}` : 'Any' },
      { label: 'Status', value: request.status },
    ]
  }, [request])

  if (loading) {
    return (
      <AuthGuard require="tenant">
        <UserLayout title="Property Request">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
            <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200" />
          </div>
        </UserLayout>
      </AuthGuard>
    )
  }

  if (!request) {
    return (
      <AuthGuard require="tenant">
        <UserLayout title="Property Request">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
            <button
              type="button"
              onClick={() => navigate('/user/requests')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Property Requests
            </button>
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-lg font-semibold text-slate-800">Request not found.</p>
            </div>
          </div>
        </UserLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Property Request">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <button
            type="button"
            onClick={() => navigate('/user/requests')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Property Requests
          </button>

          <header className="mt-5 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Property Request</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{request.property_type}</h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{request.preferred_area}, {request.state}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/user/requests?edit=${request.id}`)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Edit3 className="h-4 w-4" />
                Edit Request
              </button>
            </div>
          </header>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Timeline</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {request.status}
                  </span>
                </div>
                <div className="mt-4">
                  <RequestStatusTimeline request={request} />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <h2 className="text-base font-bold text-slate-900">Request Details</h2>
                <div className="mt-4 divide-y divide-slate-200">
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500">Purpose</span>
                    <span className="text-sm font-semibold text-slate-800">{request.purpose}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500">Property Type</span>
                    <span className="text-sm font-semibold text-slate-800">{request.property_type}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500">Location</span>
                    <span className="text-sm font-semibold text-slate-800">{request.preferred_area}, {request.state}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500">Budget</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(request.min_budget)} – {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(request.max_budget)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500">Bedrooms</span>
                    <span className="text-sm font-semibold text-slate-800">{request.bedrooms ?? 'Any'}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500">Bathrooms</span>
                    <span className="text-sm font-semibold text-slate-800">{request.bathrooms ?? 'Any'}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500">Furnishing</span>
                    <span className="text-sm font-semibold text-slate-800">{request.furnishing ?? 'Any'}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500">Move-in Timeline</span>
                    <span className="text-sm font-semibold text-slate-800">{request.move_in_timeline ?? 'Flexible'}</span>
                  </div>
                </div>

                {request.features && request.features.length > 0 && (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-slate-800">Must-haves</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {request.features.map(feature => (
                        <span key={feature} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {request.notes && (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-slate-800">Notes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{request.notes}</p>
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Overview</h2>
                <div className="mt-4 space-y-3">
                  {metadata.map(item => (
                    <div key={item.label} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-8">
            <MatchedProperties matches={request.property_request_matches ?? []} isAuthenticated />
          </div>
        </div>
      </UserLayout>
    </AuthGuard>
  )
}

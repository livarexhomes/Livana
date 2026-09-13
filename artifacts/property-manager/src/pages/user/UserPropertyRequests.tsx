import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useLocation, useSearchParams } from '@/lib/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import PropertyRequestCard from '@/components/requests/PropertyRequestCard'
import PropertyRequestDetail from '@/components/requests/PropertyRequestDetail'
import PropertyRequestForm from '@/components/requests/PropertyRequestForm'
import MatchedProperties from '@/components/requests/MatchedProperties'
import { createClient } from '@/lib/supabase'
import { UserLayout } from './UserDashboard'
import type { PropertyRequest, PropertyRequestMatchWithProperty } from '@/types'

interface RequestWithRelations extends PropertyRequest {
  property_request_matches?: PropertyRequestMatchWithProperty[]
}

function getFormValuesFromRequest(request: PropertyRequest) {
  return {
    purpose: request.purpose,
    property_type: request.property_type,
    state: request.state,
    preferred_area: request.preferred_area,
    alternative_areas: request.alternative_areas?.join(', ') ?? '',
    min_budget: String(request.min_budget),
    max_budget: String(request.max_budget),
    bedrooms: request.bedrooms ? String(request.bedrooms) : '',
    bathrooms: request.bathrooms ? String(request.bathrooms) : '',
    furnishing: request.furnishing ?? 'Any',
    move_in_timeline: request.move_in_timeline ?? 'Flexible',
    features: request.features ?? [],
    notes: request.notes ?? '',
  }
}

export default function UserPropertyRequestsPage() {
  const [, navigate] = useLocation()
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<RequestWithRelations[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadRequests = useCallback(async (currentTenantId: string | null) => {
    if (!currentTenantId) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('property_requests')
      .select(`*, property_request_matches(*, properties(*, landlords(full_name, whatsapp, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)))`)
      .eq('tenant_id', currentTenantId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[property requests] load failed:', error)
      return
    }

    const rows = (data ?? []) as RequestWithRelations[]
    setRequests(rows)
    setSelectedRequestId(prev => prev ?? rows[0]?.id ?? null)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }

      let { data: tenant } = (await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()) as { data: { id: string } | null }

      if (!tenant) {
        const meta = user.user_metadata ?? {}
        const tenantPayload = {
          user_id: user.id,
          full_name: meta.full_name ?? meta.name ?? user.email?.split('@')[0] ?? 'User',
          email: user.email ?? null,
          avatar_url: meta.avatar_url ?? meta.picture ?? null,
          provider: user.app_metadata?.provider ?? 'email',
        }

        const { data: createdTenant, error: insertError } = await supabase
          .from('tenants')
          .insert(tenantPayload)
          .select('id')
          .single() as { data: { id: string } | null; error?: { code?: string; message?: string } | null }

        if (insertError && (insertError.code === 'PGRST204' || insertError.message?.includes('provider'))) {
          const { data: createdTenantWithoutProvider, error: fallbackInsertError } = await supabase
            .from('tenants')
            .insert({
              user_id: user.id,
              full_name: tenantPayload.full_name,
              email: tenantPayload.email,
              avatar_url: tenantPayload.avatar_url,
            })
            .select('id')
            .single() as { data: { id: string } | null; error?: { code?: string; message?: string } | null }

          if (fallbackInsertError) {
            console.error('[property requests] tenant creation failed:', fallbackInsertError)
            setLoading(false)
            return
          }

          tenant = createdTenantWithoutProvider
        } else if (insertError) {
          console.error('[property requests] tenant creation failed:', insertError)
          setLoading(false)
          return
        } else {
          tenant = createdTenant
        }
      }

      if (!tenant) {
        setLoading(false)
        return
      }

      setTenantId(tenant.id)
      await loadRequests(tenant.id)
      setLoading(false)
    })
  }, [loadRequests])

  useEffect(() => {
    if (!tenantId) return

    const supabase = createClient()
    const channel = supabase.channel(`tenant-property-requests-${tenantId}`)

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'property_requests',
        filter: `tenant_id=eq.${tenantId}`,
      }, () => {
        loadRequests(tenantId)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'property_request_matches',
      }, () => {
        loadRequests(tenantId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, loadRequests])

  const selectedRequest = requests.find(request => request.id === selectedRequestId) ?? null
  const editingRequest = requests.find(request => request.id === editingRequestId) ?? null

  const summaryCards = useMemo(() => {
    const activeCount = requests.filter(request => !['completed', 'closed'].includes(request.status)).length
    const matchedCount = requests.filter(request => request.status === 'matched').length
    const completedCount = requests.filter(request => request.status === 'completed' || request.status === 'closed').length

    return [
      { label: 'Active', value: activeCount },
      { label: 'Matched', value: matchedCount },
      { label: 'Completed', value: completedCount },
    ]
  }, [requests])

  const initialFormValues = useMemo(() => {
    const purposeParam = searchParams.get('purpose')
    const stateParam = searchParams.get('state') || searchParams.get('city') || ''
    const areaParam = searchParams.get('preferred_area') || searchParams.get('area') || ''
    const bedroomsParam = searchParams.get('bedrooms') || ''
    const bathroomsParam = searchParams.get('bathrooms') || ''

    return {
      purpose: purposeParam && ['Rent', 'Lease', 'Buy'].includes(purposeParam) ? purposeParam : 'Rent',
      property_type: searchParams.get('property_type') || 'Apartment',
      state: stateParam,
      preferred_area: areaParam,
      alternative_areas: searchParams.get('alternative_areas') || '',
      min_budget: searchParams.get('min_budget') || '',
      max_budget: searchParams.get('max_budget') || '',
      bedrooms: bedroomsParam,
      bathrooms: bathroomsParam,
      furnishing: searchParams.get('furnishing') || 'Any',
      move_in_timeline: searchParams.get('move_in_timeline') || 'Flexible',
      features: searchParams.get('features') ? searchParams.get('features')!.split(',') : [],
      notes: searchParams.get('notes') || '',
    }
  }, [searchParams])

  function handleFormSuccess(request: PropertyRequest) {
    setRequests(prev => {
      const hasRequest = prev.some(item => item.id === request.id)
      if (hasRequest) {
        return prev.map(item => item.id === request.id ? { ...item, ...request } : item)
      }
      return [{ ...request, property_request_matches: [] }, ...prev]
    })

    setSelectedRequestId(request.id)
    setEditingRequestId(null)
    setSuccessMessage('Your property request has been submitted. Our team will begin reviewing it.')
    navigate('/user/requests')
  }

  function handleEditRequest(request: PropertyRequest) {
    setEditingRequestId(request.id)
    setSelectedRequestId(request.id)
    setSuccessMessage(null)
  }

  function handleSelectRequest(request: PropertyRequest) {
    setSelectedRequestId(request.id)
  }

  function closeForm() {
    setEditingRequestId(null)
    setSuccessMessage(null)
  }

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Property Requests">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 lg:px-8">
          <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">Property Requests</h1>
              <p className="mt-1 text-sm text-gray-500">
                Fill in what you need and track every update as LIVAREX helps you find the right property.
              </p>
            </div>
          </header>

          {successMessage && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
              {successMessage}
            </div>
          )}

          <div className="mt-6">
            <PropertyRequestForm
              initialValues={editingRequest ? getFormValuesFromRequest(editingRequest) : initialFormValues}
              editingRequest={editingRequest}
              onSuccess={handleFormSuccess}
              onCancelEdit={closeForm}
            />
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
              ))}
            </div>
          ) : requests.length > 0 ? (
            <section className="mt-8 border-t border-slate-200 pt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-gray-900">Previous Requests</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {requests.length}
                </span>
              </div>

              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                {summaryCards.map(card => (
                  <div key={card.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {requests.map(request => {
                  const expanded = selectedRequestId === request.id

                  return (
                    <div key={request.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <PropertyRequestCard
                        request={request}
                        selected={expanded}
                        onSelect={handleSelectRequest}
                      />

                      {expanded && (
                        <div className="border-t border-slate-200 bg-slate-50/40 px-3 py-4 md:px-4">
                          <div className="space-y-4">
                            <PropertyRequestDetail
                              request={request}
                              onEdit={handleEditRequest}
                            />

                            <MatchedProperties
                              matches={request.property_request_matches ?? []}
                              isAuthenticated
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900">No property requests yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Tell us what you're looking for and LIVAREX can start helping you find suitable properties.
              </p>
            </div>
          )}
        </div>
      </UserLayout>
    </AuthGuard>
  )
}

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PropertyForm from '@/components/ui/PropertyForm'
import { updateProperty } from '@/lib/actions/properties'

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (!property) notFound()

  const boundAction = updateProperty.bind(null, id)

  return (
    <div className="max-w-2xl space-y-5">
      {/* Back + header */}
      <div>
        <Link
          href="/admin/properties"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-3"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to listings
        </Link>
        <h2 className="text-base font-bold text-gray-900">Edit Listing</h2>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{property.title}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <PropertyForm
          action={boundAction}
          defaultValues={property}
          submitLabel="Save changes"
        />
      </div>
    </div>
  )
}

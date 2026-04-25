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
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Edit listing</h2>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{property.title}</p>
      </div>
      <PropertyForm
        action={boundAction}
        defaultValues={property}
        submitLabel="Save changes"
      />
    </div>
  )
}

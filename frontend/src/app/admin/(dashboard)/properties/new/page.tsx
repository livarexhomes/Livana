import PropertyForm from '@/components/ui/PropertyForm'
import { createProperty } from '@/lib/actions/properties'

export default function NewPropertyPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">New listing</h2>
        <p className="text-xs text-gray-500 mt-0.5">Fill in the details below to add a property.</p>
      </div>
      <PropertyForm action={createProperty} submitLabel="Create listing" />
    </div>
  )
}

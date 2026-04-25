import LandlordPropertyForm from '@/components/ui/LandlordPropertyForm'
import { landlordCreateProperty } from '@/lib/actions/landlord-properties'

export default function NewLandlordListingPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">New listing</h2>
        <p className="text-xs text-gray-500 mt-0.5">Add a property to your portfolio.</p>
      </div>
      <LandlordPropertyForm action={landlordCreateProperty} submitLabel="Create listing" />
    </div>
  )
}

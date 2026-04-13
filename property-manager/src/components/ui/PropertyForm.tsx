'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { PropertyFormState } from '@/lib/actions/properties'
import type { Property } from '@/lib/types/database'

interface PropertyFormProps {
  action: (prev: PropertyFormState, formData: FormData) => Promise<PropertyFormState>
  defaultValues?: Partial<Property>
  submitLabel?: string
  cancelHref?: string
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-xs text-red-500 mt-1">{errors[0]}</p>
}

export default function PropertyForm({
  action,
  defaultValues,
  submitLabel = 'Save listing',
  cancelHref = '/admin/properties',
}: PropertyFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) router.push('/admin/properties')
  }, [state.success, router])

  const f = defaultValues ?? {}

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Basic information</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
          <input name="title" defaultValue={f.title ?? ''} required
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          <FieldError errors={state.fieldErrors?.title} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea name="description" defaultValue={f.description ?? ''} rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input name="address" defaultValue={f.address ?? ''} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <FieldError errors={state.fieldErrors?.address} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <input name="city" defaultValue={f.city ?? ''} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <FieldError errors={state.fieldErrors?.city} />
          </div>
        </div>
      </div>

      {/* Pricing & details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Pricing & details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Price ($)</label>
            <input name="price" type="number" min="0" step="0.01" defaultValue={f.price ?? ''} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <FieldError errors={state.fieldErrors?.price} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Area (sqft)</label>
            <input name="area_sqft" type="number" min="0" defaultValue={f.area_sqft ?? ''}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bedrooms</label>
            <input name="bedrooms" type="number" min="0" defaultValue={f.bedrooms ?? 0} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bathrooms</label>
            <input name="bathrooms" type="number" min="0" defaultValue={f.bathrooms ?? 0} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <select name="type" defaultValue={f.type ?? 'rent'}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
              <option value="rent">Rent</option>
              <option value="sale">Sale</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select name="status" defaultValue={f.status ?? 'available'}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input name="featured" type="checkbox" defaultChecked={f.featured ?? false}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-gray-700">Featured listing</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <a href={cancelHref}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition">
          Cancel
        </a>
        <button type="submit" disabled={pending}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400
            text-white text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2
            focus:ring-indigo-500 focus:ring-offset-2">
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

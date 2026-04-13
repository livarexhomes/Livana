'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LandlordPropertyFormState } from '@/lib/actions/landlord-properties'
import type { Property } from '@/lib/types/database'

interface LandlordPropertyFormProps {
  action: (prev: LandlordPropertyFormState, formData: FormData) => Promise<LandlordPropertyFormState>
  defaultValues?: Partial<Property>
  submitLabel?: string
  showImageUpload?: boolean
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-xs text-red-500 mt-1">{errors[0]}</p>
}

export default function LandlordPropertyForm({
  action,
  defaultValues,
  submitLabel = 'Save listing',
  showImageUpload = true,
}: LandlordPropertyFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})
  const [previews, setPreviews] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state.success) router.push('/landlord/listings')
  }, [state.success, router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
  }

  const f = defaultValues ?? {}

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-6">
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
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g. Spacious 2-bed apartment in downtown" />
          <FieldError errors={state.fieldErrors?.title} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea name="description" defaultValue={f.description ?? ''} rows={4}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            placeholder="Describe the property, amenities, nearby facilities…" />
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Availability status</label>
          <select name="status" defaultValue={f.status ?? 'available'}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Photo upload */}
      {showImageUpload && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Photos</h3>
          <p className="text-xs text-gray-500">Upload up to 10 photos. The first image will be the cover.</p>

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">Click to select photos</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 5MB each</p>
            <input
              ref={fileRef}
              name="images"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((url, i) => (
                <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded font-medium">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <a href="/landlord/listings"
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

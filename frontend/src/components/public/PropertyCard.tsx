import Link from 'next/link'
import type { PropertyWithLandlord, PropertyStatus } from '@/lib/types/database'

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  const diffInDays = Math.floor(diffInSeconds / (60 * 60 * 24))
  if (diffInDays === 0) return 'Listed today'
  if (diffInDays === 1) return 'Listed yesterday'
  if (diffInDays < 7) return `Listed ${diffInDays} days ago`
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `Listed ${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`
  const diffInMonths = Math.floor(diffInDays / 30)
  return `Listed ${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`
}

export default function PropertyCard({ property }: { property: PropertyWithLandlord }) {
  const cover = property.property_images?.find((i) => i.is_cover) ?? property.property_images?.[0]
  const coverUrl = cover
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${cover.storage_path}`
    : null

  const landlord = property.landlords
  
  // Use Naira symbol for the price since we are aiming for Nigerian real estate format
  const formattedPrice = `₦${Number(property.price).toLocaleString()}`

  return (
    <Link href={`/listings/${property.id}`} className="group block text-left">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-gray-100 shadow-sm border border-gray-100">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
             <span className="text-gray-300 font-medium">No Image</span>
          </div>
        )}
        
        {/* Top left tags */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
           {/* Property Type marker */}
        </div>
        
        {/* Top right tags (Heart icon usually for saving) */}
        <div className="absolute top-4 right-4 flex gap-2">
            <button className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
               </svg>
            </button>
        </div>
        
        {/* Featured Ribbon */}
        {property.featured && (
          <div className="absolute bottom-4 left-4">
             <span className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-sm">
               Featured
             </span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 px-1">
        <p className="text-[13px] text-gray-500 font-medium">{timeAgo(property.created_at)}</p>
        <p className="text-xl font-bold text-gray-900 tracking-tight">{formattedPrice}</p>
        <p className="text-[15px] text-gray-600 truncate">{property.city}</p>
        
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-500 font-medium mt-1">
           {property.bedrooms > 0 && <span className="flex items-center">{property.bedrooms} Beds</span>}
           {property.bathrooms > 0 && <span className="flex items-center">{property.bathrooms} Baths</span>}
           {property.area_sqft ? <span>{property.area_sqft} SQM</span> : null}
           <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-md text-gray-700 text-xs">{property.type === 'sale' ? 'Sale' : 'Rent'}</span>
        </div>

        {landlord && (
           <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
               <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-blue-700">
                 {landlord.full_name.charAt(0).toUpperCase()}
               </div>
               <span className="text-[13px] font-semibold text-gray-700">Developer</span>
               {landlord.is_verified && (
                 <svg className="w-3.5 h-3.5 text-blue-500 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                 </svg>
               )}
           </div>
        )}
      </div>
    </Link>
  )
}

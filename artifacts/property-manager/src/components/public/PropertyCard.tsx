import Link from 'next/link'
import type { PropertyWithLandlord, PropertyStatus } from '@/lib/types/database'
import { MapPin, BedDouble, Bath, SquareSquare, ShieldCheck } from 'lucide-react'
import SaveButton from '@/components/public/SaveButton'

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  const diffInDays = Math.floor(diffInSeconds / (60 * 60 * 24))
  if (diffInDays === 0) return 'Listed today'
  if (diffInDays === 1) return 'Listed yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`
  const diffInMonths = Math.floor(diffInDays / 30)
  return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`
}

export default function PropertyCard({ property }: { property: PropertyWithLandlord }) {
  const cover = property.property_images?.find((i) => i.is_cover) ?? property.property_images?.[0]
  const coverUrl = cover
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${cover.storage_path}`
    : null

  const landlord = property.landlords
  
  // Format price
  const formattedPrice = `₦${Number(property.price).toLocaleString()}`

  return (
    <Link href={`/listings/${property.id}`} className="group block flex flex-col bg-white rounded-[1.5rem] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300">
      
      {/* Image Container */}
      <div className="relative w-full aspect-[4/3] rounded-t-[1.5rem] overflow-hidden bg-gray-50 shrink-0">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
             <span className="text-gray-400 font-medium text-sm">No Image</span>
          </div>
        )}
        
        {/* Overlay Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="px-3 py-1 bg-white/95 backdrop-blur-sm text-gray-900 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
            {property.type === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>
        
        <div className="absolute top-4 right-4">
          <button className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow-sm">
            <Heart className="w-4 h-4" />
          </button>
        </div>
        
        {property.featured && (
          <div className="absolute bottom-4 left-4">
             <span className="px-3 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-md">
               Featured
             </span>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{timeAgo(property.created_at)}</p>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-1 truncate">
          {formattedPrice}
        </h3>
        
        <div className="flex items-center gap-1.5 text-gray-500 mb-4">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <p className="text-sm font-medium truncate">{property.city}</p>
        </div>
        
        {/* Specs Grid */}
        <div className="flex items-center gap-4 text-sm text-gray-600 font-medium mb-5 pb-5 border-b border-gray-100">
          {property.bedrooms > 0 && (
            <div className="flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-gray-400" />
              <span>{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="flex items-center gap-1.5">
              <Bath className="w-4 h-4 text-gray-400" />
              <span>{property.bathrooms}</span>
            </div>
          )}
          {property.area_sqft && (
            <div className="flex items-center gap-1.5">
              <SquareSquare className="w-4 h-4 text-gray-400" />
              <span>{property.area_sqft} <span className="text-xs">sqm</span></span>
            </div>
          )}
        </div>

        {/* Footer: Landlord Info */}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-200">
              {landlord?.full_name ? landlord.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                  {landlord?.full_name || 'Agent'}
                </span>
                {landlord?.is_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                )}
              </div>
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                {landlord?.is_verified ? 'Verified Owner' : 'Agent'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

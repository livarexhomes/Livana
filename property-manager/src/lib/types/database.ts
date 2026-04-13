export type PropertyType = 'sale' | 'rent'
export type PropertyStatus = 'available' | 'unavailable' | 'pending'
export type LandlordStatus = 'pending' | 'approved' | 'rejected'

export interface Landlord {
  id: string
  user_id: string
  full_name: string
  whatsapp: string
  bio: string | null
  avatar_url: string | null
  status: LandlordStatus
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  landlord_id: string | null
  title: string
  description: string | null
  address: string
  city: string
  price: number
  bedrooms: number
  bathrooms: number
  area_sqft: number | null
  type: PropertyType
  status: PropertyStatus
  featured: boolean
  created_at: string
  updated_at: string
}

export interface PropertyImage {
  id: string
  property_id: string
  storage_path: string
  alt_text: string | null
  is_cover: boolean
  sort_order: number
  created_at: string
}

export interface Availability {
  id: string
  property_id: string
  date: string
  is_blocked: boolean
  note: string | null
  created_at: string
}

// Joined types used in UI
export interface PropertyWithLandlord extends Property {
  landlords: Pick<Landlord, 'full_name' | 'whatsapp' | 'is_verified'> | null
  property_images: Pick<PropertyImage, 'storage_path' | 'alt_text' | 'is_cover'>[]
}

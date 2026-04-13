export type PropertyType = 'sale' | 'rent'
export type PropertyStatus = 'available' | 'unavailable' | 'pending'

export interface Property {
  id: string
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

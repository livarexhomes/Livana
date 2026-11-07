export type PropertyType = 'sale' | 'rent' | 'lease' | 'commercial'
export type PropertyStatus = 'available' | 'taken' | 'coming_soon' | 'under_negotiation' | 'pending_review' | 'rejected' | 'changes_requested'
export type LandlordStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'suspended'

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
  agreement_fee: number | null
  commission_fee: number | null
  other_charges: number | null
  bedrooms: number
  bathrooms: number
  area_sqft: number | null
  type: PropertyType
  status: PropertyStatus
  review_feedback?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  featured: boolean
  amenities: string[]
  latitude: number | null
  longitude: number | null
  state?: string
  property_type?: string
  price_negotiable?: boolean
  furnished?: boolean
  parking_spaces?: number
  year_built?: number
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

export interface PropertyWithLandlord extends Property {
  landlords: Pick<Landlord, 'full_name' | 'whatsapp' | 'is_verified' | 'avatar_url'> | null
  property_images: Pick<PropertyImage, 'id' | 'storage_path' | 'alt_text' | 'is_cover' | 'sort_order'>[]
}

export interface Tenant {
  id: string
  user_id: string
  full_name: string
  phone: string | null
  created_at: string
  updated_at: string
}

export type PropertyRequestStatus =
  | 'submitted'
  | 'reviewing'
  | 'searching'
  | 'matched'
  | 'inspection'
  | 'completed'
  | 'closed'

export interface PropertyRequest {
  id: string
  tenant_id: string
  purpose: 'Rent' | 'Lease' | 'Buy'
  property_type: string
  state: string
  preferred_area: string
  alternative_areas: string[] | null
  min_budget: number
  max_budget: number
  bedrooms: number | null
  bathrooms: number | null
  furnishing: 'Any' | 'Furnished' | 'Semi-furnished' | 'Unfurnished' | null
  move_in_timeline: string | null
  features: string[] | null
  notes: string | null
  status: PropertyRequestStatus
  assigned_to: string | null
  priority: 'normal' | 'high' | 'urgent' | string
  created_at: string
  updated_at: string
}

export interface PropertyRequestMatch {
  id: string
  request_id: string
  property_id: string
  status: 'suggested' | 'shared' | 'dismissed' | string
  match_score: number | null
  match_notes: string | null
  shared_with_customer_at: string | null
  created_at: string
}

export interface PropertyRequestMatchWithProperty extends PropertyRequestMatch {
  properties: PropertyWithLandlord
}

export interface PropertyRequestWithMatches extends PropertyRequest {
  property_request_matches: PropertyRequestMatchWithProperty[]
}

export type EnquiryStatus = 'open' | 'replied' | 'closed'

export interface SavedProperty {
  id: string
  tenant_id: string
  property_id: string
  created_at: string
}

export interface Enquiry {
  id: string
  tenant_id: string
  property_id: string
  landlord_id: string | null
  message: string
  status: EnquiryStatus
  created_at: string
  updated_at: string
}

export interface SavedPropertyWithProperty extends SavedProperty {
  properties: PropertyWithLandlord
}

export interface EnquiryWithProperty extends Enquiry {
  properties: Pick<Property, 'id' | 'title' | 'city' | 'price' | 'type'>
}

export interface EnquiryWithTenantAndProperty extends Enquiry {
  properties: Pick<Property, 'id' | 'title' | 'city' | 'price' | 'type'>
  tenants: Pick<Tenant, 'full_name' | 'phone'> | null
}

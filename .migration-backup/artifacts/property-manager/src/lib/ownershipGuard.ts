/**
 * Ownership guard utilities for property mutations.
 *
 * These functions encapsulate the IDOR-prevention logic so it can be tested
 * independently of the React component and the live Supabase client.
 */

export interface PropertyRow {
  id: string
  landlord_id: string
}

export interface LandlordRow {
  id: string
  user_id: string
}

/**
 * Returns true when `landlordId` matches the property's `landlord_id`.
 * Used before any UPDATE / DELETE on a property row.
 */
export function isPropertyOwner(
  property: PropertyRow,
  landlordId: string,
): boolean {
  return property.landlord_id === landlordId
}

/**
 * Returns true when the landlord record belongs to the authenticated user.
 * Guards against a landlord row being swapped in from another user's session.
 */
export function isLandlordOwner(
  landlord: LandlordRow,
  userId: string,
): boolean {
  return landlord.user_id === userId
}

/**
 * Builds the Supabase filter arguments needed to scope a property query to
 * the current landlord. Returns `{ column, value }` pairs to be applied as
 * `.eq(column, value)` on the query builder.
 *
 * Centralising this avoids the filter being accidentally omitted at a call site.
 */
export function propertyOwnershipFilter(landlordId: string): {
  column: 'landlord_id'
  value: string
} {
  return { column: 'landlord_id', value: landlordId }
}

/**
 * Validates that an image's property_id matches the expected property.
 * Prevents a landlord from deleting images that belong to another property
 * by crafting a request with a mismatched image id.
 */
export function isImageOwnedByProperty(
  imagePropertyId: string,
  expectedPropertyId: string,
): boolean {
  return imagePropertyId === expectedPropertyId
}

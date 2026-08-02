// Agency Fee configuration + Total Payable calculations.
//
// The Agency Fee percentage is configured by admins under
// Admin → Settings → Listing Rules and stored in the `admin_settings`
// table under the `listing_rules` key. This module is the single source of
// truth for every Agency Fee / Total Payable computation in the app.

import { createClient } from './supabase'

export interface FeeConfig {
  /** Agency Fee percentage (e.g. 10 = 10% of rent). */
  agencyFeePercent: number
}

export interface FeeBreakdown {
  rent: number
  agencyFee: number
  agreementFee: number
  commissionFee: number
  otherCharges: number
  total: number
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  agencyFeePercent: 10,
}

// Module-level cache so we don't hit the DB on every keystroke.
let cachedConfig: FeeConfig | null = null

/**
 * Fetch the configured Agency Fee percentage from `admin_settings`
 * (`listing_rules` row). Falls back to the default (10%) when the table is
 * missing or the value isn't set yet.
 */
export async function getFeeConfig(options?: { refresh?: boolean }): Promise<FeeConfig> {
  if (cachedConfig && !options?.refresh) return cachedConfig

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'listing_rules')
      .maybeSingle()

    const percent = Number((data?.value as any)?.agencyFeePercent)
    if (!error && data && Number.isFinite(percent) && percent >= 0) {
      cachedConfig = { agencyFeePercent: percent }
      return cachedConfig
    }
    // The table/row may not exist yet (pre-migration) — use the default.
    if (error) {
      console.warn('[fees] Could not load agency fee config, using default:', error.message)
    }
  } catch (err) {
    console.warn('[fees] Failed to load agency fee config, using default:', err)
  }

  cachedConfig = DEFAULT_FEE_CONFIG
  return cachedConfig
}

/** Invalidate the cached config (call after the admin saves Listing Rules). */
export function invalidateFeeConfig() {
  cachedConfig = null
}

/**
 * Agency Fee for a rent amount at the given percentage.
 * Rounded up to the nearest naira so the total is never understated.
 */
export function getAgencyFee(price: number, percent: number): number {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(percent) || percent <= 0) {
    return 0
  }
  return Math.ceil((price * percent) / 100)
}

/**
 * Compute the full Total Payable breakdown for a property.
 * Optional fees are only included when they have a value.
 * The agency fee is ALWAYS computed from the configured percentage — it is
 * never stored, so changing the admin setting retroactively updates all fees.
 */
export function calcFeeBreakdown(
  p: {
    price?: number | null
    agency_fee_percent?: number | null
    agreement_fee?: number | null
    commission_fee?: number | null
    other_charges?: number | null
  },
  config: FeeConfig = DEFAULT_FEE_CONFIG,
): FeeBreakdown {
  const rent = Number(p.price) || 0
  const agencyFee = getAgencyFee(rent, p.agency_fee_percent ?? config.agencyFeePercent)
  const agreementFee = Number(p.agreement_fee) || 0
  const commissionFee = Number(p.commission_fee) || 0
  const otherCharges = Number(p.other_charges) || 0

  return {
    rent,
    agencyFee,
    agreementFee,
    commissionFee,
    otherCharges,
    total: rent + agencyFee + agreementFee + commissionFee + otherCharges,
  }
}

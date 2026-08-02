// Currency helpers for the Livarex platform — Nigerian Naira formatting.

const nairaFmt = new Intl.NumberFormat('en-NG', {
  maximumFractionDigits: 0,
})

/**
 * Format a raw digit string with comma separators (no ₦ symbol).
 * "1500000" → "1,500,000". Empty/whitespace input returns "".
 */
export function formatDigits(value: string): string {
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return ''
  return nairaFmt.format(Number(digits))
}

/**
 * Strip separators/spaces from a formatted string back to raw digits.
 * "1,500,000" → "1500000". Also drops leading zeros so a value typed as
 * "0120000" becomes "120000".
 */
export function unformatDigits(value: string): string {
  const digits = value.replace(/[^\d]/g, '')
  return digits.replace(/^0+(?=\d)/, '')
}

/**
 * Convert a digit string to a number. Returns 0 for empty/NaN input.
 */
export function digitsToNumber(value: string): number {
  const n = Number(unformatDigits(value))
  return Number.isFinite(n) ? n : 0
}

/**
 * Format a number as Nigerian Naira: 1500000 → "₦1,500,000".
 */
export function formatNaira(n: number): string {
  if (!Number.isFinite(n)) return '₦0'
  return `₦${nairaFmt.format(Math.round(n))}`
}

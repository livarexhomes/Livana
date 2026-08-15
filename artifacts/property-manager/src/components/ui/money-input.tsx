import * as React from 'react'
import { cn } from '@/lib/utils'
import { formatDigits, unformatDigits } from '@/lib/currency'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'

export interface MoneyInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'size'> {
  /** Raw digit string without separators (e.g. "1500000"). */
  value: string
  /** Called with the raw digit string (no commas, no leading zeros). */
  onChange: (digits: string) => void
  /** Optional "₦" symbol override; defaults to ₦. */
  symbol?: string
  /** Visual size; "lg" matches the taller landlord-form inputs. */
  size?: 'default' | 'lg'
}

/**
 * A Naira-formatted currency input.
 *
 * - Displays the value with comma separators while typing ("600000" → "600,000").
 * - Strips separators and leading zeros on change, so typing "0" then "120000"
 *   yields "120000" (the "0120000" problem disappears).
 * - Type is "text" + inputMode numeric so mobile shows a number pad without
 *   the browser fighting our formatting.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  symbol = '₦',
  placeholder,
  size = 'default',
  ...props
}: MoneyInputProps) {
  return (
    <InputGroup className={cn('bg-white', size === 'lg' && 'h-11', className)}>
      <InputGroupAddon align="inline-start">
        <span className="text-sm font-semibold text-gray-500">{symbol}</span>
      </InputGroupAddon>
      <InputGroupInput
        type="text"
        inputMode="numeric"
        pattern="[0-9,]*"
        autoComplete="off"
        value={formatDigits(value)}
        placeholder={placeholder}
        onChange={(e) => onChange(unformatDigits(e.target.value))}
        className="text-gray-900 placeholder-gray-400 caret-gray-900"
        {...props}
      />
    </InputGroup>
  )
}

// Type declarations for api/lib/email-template.js (same basename = auto-paired
// by TypeScript when the .js is imported from the standalone .ts handlers).

export interface EmailOptions {
  subject?: string
  preheader?: string
  heading?: string
  lead?: string
  body?: string
  ctaText?: string
  ctaUrl?: string
  note?: string
  footerNote?: string
}

export interface OtpOptions {
  code?: string
  minutes?: number
}

export interface WelcomeOptions {
  name?: string
}

export interface PasswordResetOptions {
  resetUrl?: string
}

export interface SupportConfirmationOptions {
  name?: string
  subject?: string
  ticketId?: string
  ticketNo?: string
}

export interface AdminNotificationOptions {
  title?: string
  subtitle?: string
  details?: string
  actionLabel?: string
  actionUrl?: string
  eventName?: string
}

export interface AlertSignupOptions {
  alertLabel?: string
  detailsText?: string
}

export function renderEmail(options?: EmailOptions): string
export function renderOtpEmail(options?: OtpOptions): string
export function renderWelcomeEmail(options?: WelcomeOptions): string
export function renderPasswordResetEmail(options?: PasswordResetOptions): string
export function renderSupportConfirmationEmail(options?: SupportConfirmationOptions): string
export function renderAdminNotificationEmail(options?: AdminNotificationOptions): string
export function renderAlertSignupEmail(options?: AlertSignupOptions): string

export interface ResolvedEmailConfig {
  apiKey: string
  fromEmail: string
  fromName: string
  adminEmail: string
  from: string
  enabled: boolean
}

export function resolveEmailConfig(env: Record<string, string | undefined>): Promise<ResolvedEmailConfig>

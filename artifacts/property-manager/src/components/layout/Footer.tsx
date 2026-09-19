import * as React from 'react'
import { ArrowUpRight, Instagram, Linkedin, MapPin } from 'lucide-react'
import { Link } from '@/lib/navigation'

const exploreLinks = [
  { href: '/listings?type=rent', label: 'Rent' },
  { href: '/listings?type=lease', label: 'Lease' },
  { href: '/listings', label: 'Listings' },
]

const companyLinks = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/landlord/register', label: 'List Property' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/subscription-agreement', label: 'Subscription Agreement' },
  { href: '/cookie-policy', label: 'Cookie Policy' },
]

const focusStyle = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-4 focus-visible:ring-offset-black'
const socialStyle = `inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-neutral-300 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white ${focusStyle}`
const legalStyle = `rounded-sm text-neutral-200 underline decoration-neutral-500 underline-offset-4 transition-colors hover:text-blue-300 hover:decoration-blue-300 ${focusStyle}`

export default function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-black text-neutral-300">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 pb-7 pt-14 sm:px-8 lg:pt-20">
        <div className="grid grid-cols-1 gap-8 pb-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col items-start gap-6 py-2 lg:col-span-4 lg:pr-4">
            <Link href="/" aria-label="LIVAREX home" className={`inline-flex w-fit rounded-xl bg-white px-4 py-2 ${focusStyle}`}>
              <img src="/livarex-logo.png" alt="LIVAREX" className="h-14 w-auto max-w-full object-contain" />
            </Link>
            <p className="max-w-sm text-3xl font-medium leading-[1.2] tracking-[-0.035em] text-white sm:text-4xl">
              The Bridge to your new home.
            </p>

          </div>

          <div className="grid min-w-0 grid-cols-1 gap-8 rounded-3xl border border-white/10 bg-[#101010] p-6 sm:grid-cols-3 sm:p-8 lg:col-span-8">
          <nav aria-label="Explore" className="min-w-0">
            <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Explore</h2>
            <ul className="space-y-1">
              {exploreLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={`group inline-flex min-h-11 items-center gap-2 rounded-sm py-2 text-[15px] leading-relaxed transition-colors hover:text-white ${focusStyle}`}>
                    {label}
                    <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-blue-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company" className="min-w-0 sm:col-span-2">
            <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Company</h2>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {companyLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={`inline-flex min-h-11 items-center rounded-sm py-2 text-[15px] leading-relaxed transition-colors hover:text-white ${focusStyle}`}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          </div>
          <div className="flex flex-col gap-6 border-y border-white/10 py-6 sm:flex-row sm:items-center sm:justify-between lg:col-span-12">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-neutral-200 ring-1 ring-inset ring-white/15">
                <MapPin aria-hidden="true" className="h-[18px] w-[18px]" />
              </span>
              <address className="text-sm not-italic leading-7 text-neutral-300">
                Joju, Sango Ota,<br className="sm:hidden" />{' '}
                Ogun State,<br className="sm:hidden" />{' '}
                Nigeria
              </address>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a href="https://instagram.com/livarex.ng" target="_blank" rel="noopener noreferrer" aria-label="LIVAREX on Instagram (opens in a new tab)" className={socialStyle}>
                <Instagram aria-hidden="true" className="h-[18px] w-[18px]" />
              </a>
              <a href="https://linkedin.com/company/livarex" target="_blank" rel="noopener noreferrer" aria-label="LIVAREX on LinkedIn (opens in a new tab)" className={socialStyle}>
                <Linkedin aria-hidden="true" className="h-[18px] w-[18px]" />
              </a>
              <a href="https://twitter.com/livarex_ng" target="_blank" rel="noopener noreferrer" aria-label="LIVAREX on X (opens in a new tab)" className={socialStyle}>
                <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-12 lg:gap-12">
          <p className="text-sm leading-7 text-neutral-300 lg:col-span-4">
            By using this site you agree to our{' '}
            <Link href="/terms" className={legalStyle}>Terms of service</Link>,{' '}
            <Link href="/privacy-policy" className={legalStyle}>Privacy policy</Link>,{' '}
            <Link href="/subscription-agreement" className={legalStyle}>Subscription Agreement</Link>{' '}
            and{' '}
            <Link href="/cookie-policy" className={legalStyle}>Cookies</Link>.
          </p>
          <p className="text-xs leading-6 text-neutral-400 sm:text-[13px] lg:col-span-8">
            Recommendations may use your activity to personalize results. Listings, availability and prices may change; restrictions may apply. Verification and inspections are informational only and not guarantees. LIVAREX is not a broker or party to transactions unless explicitly stated. External links are third-party; we're not responsible for their content. Payments are processed by third-party providers; review their terms/fees.
          </p>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-center text-xs leading-relaxed text-neutral-400 sm:text-left sm:text-sm">© {new Date().getFullYear()} LIVAREX. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

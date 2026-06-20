import { Link } from '@/lib/navigation'

export default function Footer() {
  return (
    <footer className="bg-black text-gray-400">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-8">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">

          <div className="flex flex-col gap-4">
            <Link href="/">
              <img src="/livarex-logo.png" alt="LIVAREX" className="h-10 w-auto" />
            </Link>
            <p className="text-sm text-gray-400">The Bridge to your new home.</p>
          </div>

          <div>
            <ul className="space-y-4 text-sm">
              <li><Link href="/listings?type=rent" className="hover:text-white transition-colors">Rent</Link></li>
              <li><Link href="/listings?type=buy" className="hover:text-white transition-colors">Buy</Link></li>
              <li><Link href="/listings?type=lease" className="hover:text-white transition-colors">Lease</Link></li>
              <li><Link href="/listings?type=commercial" className="hover:text-white transition-colors">Commercial</Link></li>
            </ul>
          </div>

          <div>
            <ul className="space-y-4 text-sm">
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/subscription-agreement" className="hover:text-white transition-colors">Subscription Agreement</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-3">
              <a href="https://instagram.com/livarex.ng" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:border-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a href="https://linkedin.com/company/livarex" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:border-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href="https://twitter.com/livarex_ng" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:border-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </a>
            </div>
            <p className="text-sm text-right leading-relaxed">
              Joju, Sango Ota,<br />
              Ogun State,<br />
              Nigeria
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-400 leading-relaxed">
            By using this site you agree to our{' '}
            <Link href="/terms" className="underline hover:text-white transition-colors">Terms of service</Link>,{' '}
            <Link href="/privacy-policy" className="underline hover:text-white transition-colors">Privacy policy</Link>,{' '}
            <Link href="/subscription-agreement" className="underline hover:text-white transition-colors">Subscription Agreement</Link>{' '}
            and{' '}
            <Link href="/cookie-policy" className="underline hover:text-white transition-colors">Cookies</Link>.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-4xl">
            Recommendations may use your activity to personalize results. Listings, availability and prices may change; restrictions may apply. Verification and inspections are informational only and not guarantees. LIVAREX is not a broker or party to transactions unless explicitly stated. External links are third-party; we're not responsible for their content. Payments are processed by third-party providers; review their terms/fees.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} LIVAREX. All rights reserved.</p>
        </div>

      </div>
    </footer>
  )
}

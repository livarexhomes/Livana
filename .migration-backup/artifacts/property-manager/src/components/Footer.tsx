import { Link } from '@/lib/navigation'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 pb-12 border-b border-white/8">
          <div className="col-span-2 md:col-span-1 mb-2 md:mb-0">
            <Link href="/" className="flex items-center mb-5">
              <img src="/livarex-logo.png" alt="LIVAREX" className="h-9 w-auto" />
            </Link>
            <p className="text-sm leading-relaxed text-gray-400 max-w-xs">
              The Bridge to your new home.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href="https://instagram.com/livarex.ng" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/6 hover:bg-blue-600 border border-white/8 flex items-center justify-center transition-all hover:border-blue-600">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a href="https://twitter.com/livarex_ng" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/6 hover:bg-blue-600 border border-white/8 flex items-center justify-center transition-all hover:border-blue-600">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6 6 18M6 6l12 12" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-5 tracking-wide uppercase text-xs">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">Home</Link></li>
              <li><Link href="/listings" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">Properties</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">About</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">FAQs</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-5 tracking-wide uppercase text-xs">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQs</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-5 tracking-wide uppercase text-xs">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Joju, Sango Ota, Ogun State
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                livarexhomes@gmail.com
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                +234 706 052 8437
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">© {new Date().getFullYear()} LIVAREX. All rights reserved.</p>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

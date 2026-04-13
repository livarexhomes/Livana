'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navLinks = [
  { label: 'Listings', href: '/listings' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function PublicNavbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Property Manager</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/landlord/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Landlord login
            </Link>
            <Link href="/listings"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
              Browse listings
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100 space-y-1">
              <Link href="/landlord/login" onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                Landlord login
              </Link>
              <Link href="/listings" onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                Browse listings
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

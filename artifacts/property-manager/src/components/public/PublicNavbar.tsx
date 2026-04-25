'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, Home, List, Info, Mail, ChevronRight } from 'lucide-react'

const navLinks = [
  { label: 'Listings', href: '/listings', icon: List },
  { label: 'About',    href: '/about',    icon: Info },
  { label: 'Contact',  href: '/contact',  icon: Mail },
]

interface PublicNavbarProps {
  tenantName: string | null
}

export default function PublicNavbar({ tenantName }: PublicNavbarProps) {
  const pathname = usePathname()
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_24px_rgba(0,0,0,0.08)]'
            : 'bg-white/70 backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6b9e6e] to-[#4a7f4d] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Home className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className="font-bold text-gray-900 text-[15px] tracking-tight">
                Expert<span className="text-[#6b9e6e]">Listing</span>
              </span>
            </Link>

            {/* Desktop nav pill */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-100/80 rounded-full px-2 py-1.5">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive(href)
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-2.5">
              {tenantName ? (
                <Link
                  href="/user"
                  className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-[#6b9e6e] hover:bg-[#5d8f60] text-white text-sm font-semibold rounded-full transition-all shadow-sm hover:shadow-md"
                >
                  <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-[11px] font-bold">
                    {tenantName[0].toUpperCase()}
                  </span>
                  {tenantName}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="px-5 py-2 bg-[#6b9e6e] hover:bg-[#5d8f60] text-white text-sm font-semibold rounded-full transition-all shadow-sm hover:shadow-md"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-white md:hidden flex flex-col
          shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6b9e6e] to-[#4a7f4d] flex items-center justify-center">
              <Home className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">
              Expert<span className="text-[#6b9e6e]">Listing</span>
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-[#6b9e6e]/10 text-[#4a7f4d]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4 opacity-70" />
                {label}
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </Link>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="px-4 py-5 border-t border-gray-100 space-y-2.5 shrink-0">
          {tenantName ? (
            <Link
              href="/user"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 w-full px-4 py-3 bg-[#6b9e6e] hover:bg-[#5d8f60] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold">
                {tenantName[0].toUpperCase()}
              </span>
              My account
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full py-3 bg-[#6b9e6e] hover:bg-[#5d8f60] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Get started — it&apos;s free
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  )
}

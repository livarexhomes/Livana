'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Heart, MessageSquare, User } from 'lucide-react'

const links = [
  { href: '/user', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/user/saved', label: 'Saved', icon: Heart, exact: false },
  { href: '/user/enquiries', label: 'Enquiries', icon: MessageSquare, exact: false },
  { href: '/user/profile', label: 'Profile', icon: User, exact: false },
]

export default function UserSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-gray-200 min-h-screen">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-gray-200 shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#aadb5a] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">My Account</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#aadb5a]/20 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#7ab82e]' : ''}`} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Back to listings */}
      <div className="px-3 py-4 border-t border-gray-200">
        <Link href="/listings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Browse listings
        </Link>
      </div>
    </aside>
  )
}

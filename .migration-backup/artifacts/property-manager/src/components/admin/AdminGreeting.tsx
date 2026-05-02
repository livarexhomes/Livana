'use client'

import { usePathname } from 'next/navigation'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

const pageLabels: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/properties': 'Properties',
  '/admin/properties/new': 'New Listing',
  '/admin/landlords': 'Landlords',
}

export default function AdminGreeting({ name }: { name: string }) {
  const pathname = usePathname()

  // Resolve label: check exact then prefix
  const label =
    pageLabels[pathname] ??
    (pathname.includes('/edit') ? 'Edit Listing' : 'Dashboard')

  return (
    <div className="flex flex-col min-w-0">
      <h1 className="text-sm font-semibold text-gray-900 leading-tight">
        {getGreeting()}, {name} 👋
      </h1>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}

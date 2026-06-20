import { Link, useLocation } from '@/lib/navigation'
import {
  LayoutDashboard, Heart, HeadphonesIcon, User, LogOut,
} from 'lucide-react'
import { createClient } from '../lib/supabase'

const mainNav = [
  { href: '/user', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/user/saved', label: 'Saved', icon: Heart, exact: false },
  { href: '/user/enquiries', label: 'Support', icon: HeadphonesIcon, exact: false },
  { href: '/user/profile', label: 'Profile', icon: User, exact: false },
]

interface Props {
  userEmail?: string | null
}

export default function UserBottomNav({ userEmail }: Props) {
  const [location] = useLocation()

  function isActive(item: typeof mainNav[0]) {
    return item.exact ? location === item.href : location.startsWith(item.href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-between px-1 z-50">
      {mainNav.map((item) => {
        const Icon = item.icon
        const active = isActive(item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-200 ${
              active
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            title={item.label}
          >
            <Icon className={`w-5 h-5 ${active ? 'stroke-2' : 'stroke-1.5'}`} />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </Link>
        )
      })}

      <button
        type="button"
        onClick={handleLogout}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
        title="Sign out"
      >
        <LogOut className="w-5 h-5 stroke-1.5" />
        <span className="text-[10px] font-semibold">Exit</span>
      </button>
    </nav>
  )
}

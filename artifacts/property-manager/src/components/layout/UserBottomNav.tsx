import { Link, useLocation } from '@/lib/navigation'
import {
  LayoutDashboard, Heart, ClipboardList, HeadphonesIcon, User, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const mainNav = [
  { href: '/user', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/user/saved', label: 'Saved', icon: Heart, exact: false },
  { href: '/user/requests', label: 'Requests', icon: ClipboardList, exact: false },
  { href: '/user/enquiries', label: 'Enquiries', icon: HeadphonesIcon, exact: false },
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
    <nav
      aria-label="Account navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid min-h-16 max-w-xl grid-cols-6 items-center gap-1">
        {mainNav.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title={item.label}
            >
              <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
              <span className="max-w-full truncate text-[clamp(0.55rem,2.5vw,0.65rem)] font-semibold leading-none tracking-tight">
                {item.label}
              </span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-2 text-slate-500 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500"
          title="Sign out"
        >
          <LogOut aria-hidden="true" className="h-5 w-5 shrink-0 stroke-[1.75]" />
          <span className="text-[clamp(0.55rem,2.5vw,0.65rem)] font-semibold leading-none tracking-tight">Exit</span>
        </button>
      </div>
    </nav>
  )
}

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
    <>
      <style>{`
        @supports (backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px)) {
          .lv-glass-nav { backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%); }
        }
        @supports not (backdrop-filter: blur(20px)) {
          .lv-glass-nav { background: rgba(255, 255, 255, 0.92); }
        }
        .lv-glass-active-pill {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.14) 0%, rgba(14, 165, 233, 0.10) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.85),
            0 4px 14px -2px rgba(37, 99, 235, 0.35),
            0 0 0 1px rgba(37, 99, 235, 0.10);
        }
        .lv-glass-active-pill::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(120% 60% at 50% 0%, rgba(255, 255, 255, 0.45) 0%, transparent 60%);
          pointer-events: none;
        }
        .lv-glass-icon-active {
          background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            0 6px 16px -4px rgba(37, 99, 235, 0.55),
            0 0 0 1px rgba(37, 99, 235, 0.25);
        }
        .lv-glass-icon-active::after {
          content: '';
          position: absolute;
          top: -3px; left: 50%;
          transform: translateX(-50%);
          width: 18px; height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%);
          box-shadow: 0 0 12px 2px rgba(37, 99, 235, 0.55);
        }
        .lv-glass-divider {
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(15, 23, 42, 0.08) 20%,
            rgba(15, 23, 42, 0.12) 50%,
            rgba(15, 23, 42, 0.08) 80%,
            transparent 100%);
        }
        .lv-glass-item { transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1); }
        .lv-glass-item:active { transform: scale(0.92); }
        .lv-glass-item:focus-visible { outline: 2px solid #2563eb; outline-offset: 4px; border-radius: 16px; }
        @media (prefers-reduced-motion: reduce) {
          .lv-glass-item { transition: none; }
          .lv-glass-item:active { transform: none; }
        }
      `}</style>

      <nav
        aria-label="Account navigation"
        className="lv-glass-nav fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] md:hidden"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px lv-glass-divider" aria-hidden="true" />

        <div className="relative mx-auto max-w-xl rounded-3xl border border-white/40 bg-gradient-to-b from-white/70 to-white/55 shadow-[0_-10px_40px_-12px_rgba(15,23,42,0.18),0_-2px_8px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-inset ring-white/40 backdrop-blur-2xl">
          <div className="grid grid-cols-6 items-stretch gap-0.5 px-1 py-1.5">
            {mainNav.map((item) => {
              const Icon = item.icon
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={`lv-glass-item relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 ${
                    active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={item.label}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="lv-glass-active-pill absolute inset-1 rounded-[14px]"
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
                      active
                        ? 'lv-glass-icon-active -translate-y-0.5 text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`h-[18px] w-[18px] shrink-0 transition-all duration-300 ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`}
                    />
                  </span>
                  <span
                    className={`relative z-10 max-w-full truncate text-[clamp(0.55rem,2.5vw,0.65rem)] font-semibold leading-none tracking-tight transition-colors duration-200 ${
                      active ? 'text-blue-700' : 'text-slate-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="lv-glass-item relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-slate-500 hover:text-rose-600"
              title="Sign out"
            >
              <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors duration-200 group-hover:text-rose-600">
                <LogOut aria-hidden="true" className="h-[18px] w-[18px] shrink-0 stroke-[1.75]" />
              </span>
              <span className="relative z-10 text-[clamp(0.55rem,2.5vw,0.65rem)] font-semibold leading-none tracking-tight">
                Exit
              </span>
            </button>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-white/30 to-transparent blur-2xl"
        />
      </nav>
    </>
  )
}

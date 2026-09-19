import { useState, useEffect } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Heart, ClipboardList, HeadphonesIcon, User,
  LogOut, X, PanelLeftClose, PanelLeftOpen,
  Home, Key, Briefcase, ShoppingBag,
} from 'lucide-react'

const mainNav = [
  { href: '/user', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/user/saved', label: 'Saved Properties', icon: Heart, exact: false },
  { href: '/user/requests', label: 'Property Requests', icon: ClipboardList, exact: false },
  { href: '/user/enquiries', label: 'Enquiries', icon: HeadphonesIcon, exact: false },
  { href: '/user/profile', label: 'Profile', icon: User, exact: false },
]
const exploreNav = [
  { href: '/listings?type=rent', label: 'Rent', icon: Key, comingSoon: false },
  { href: '/listings?type=lease', label: 'Lease', icon: Briefcase, comingSoon: false },
  { href: null, label: 'Buy', icon: Home, comingSoon: true },
  { href: null, label: 'Commercial', icon: ShoppingBag, comingSoon: true },
]
interface Props {
  displayName?: string
  userEmail?: string | null
  initials?: string
  open: boolean
  onClose: () => void
}

export default function UserSidebar({ displayName = 'User', userEmail, initials = 'U', open, onClose }: Props) {
  const [location] = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('user-sidebar-collapsed') === 'true' } catch { return false }
  })

  useEffect(() => { onClose() }, [location])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('user-sidebar-collapsed', String(next)) } catch {}
  }
  function isActive(item: { href: string; exact: boolean }) {
    return item.exact ? location === item.href : location.startsWith(item.href)
  }
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Render helpers keep the navigation DOM stable when the parent updates.
  const renderContent = (mobile = false) => {
    const c = collapsed && !mobile
    return (
      <div className="lv-user-sidebar" data-collapsed={c}>
        <div className="lv-sidebar-brand">
          <Link href="/" className="lv-sidebar-logo" aria-label="LIVAREX home">
            <img src="/livarex-logo.png" alt="LIVAREX" />
          </Link>
          {!c && <span className="lv-tenant-badge">Tenant</span>}
          {mobile && (
            <button type="button" onClick={onClose} aria-label="Close navigation" className="lv-icon-button lv-close">
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="lv-sidebar-nav" aria-label="Tenant navigation">
          {!c && <p className="lv-nav-heading">Navigation</p>}
          <div className="lv-nav-group">
            {mainNav.map(item => {
              const active = isActive(item)
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} title={c ? item.label : undefined}
                  aria-label={c ? item.label : undefined} aria-current={active ? 'page' : undefined}
                  className={`lv-nav-item ${active ? 'lv-nav-active' : ''}`}>
                  <span className="lv-nav-icon"><Icon size={19} strokeWidth={active ? 2 : 1.7} /></span>
                  {!c && <span className="lv-nav-label">{item.label}</span>}
                  {!c && active && <span aria-hidden="true" className="lv-active-dot" />}
                </Link>
              )
            })}
          </div>

          <div className="lv-nav-divider" />
          {!c && <p className="lv-nav-heading">Browse</p>}
          <div className="lv-nav-group">
            {exploreNav.map(item => {
              const Icon = item.icon
              return item.comingSoon ? (
                <div key={item.label} aria-disabled="true" aria-label={c ? `${item.label} (Coming Soon)` : undefined}
                  title={c ? `${item.label} (Coming Soon)` : undefined} className="lv-nav-item lv-nav-disabled">
                  <span className="lv-nav-icon"><Icon size={19} strokeWidth={1.7} /></span>
                  {!c && <><span className="lv-nav-label">{item.label}</span><span className="lv-soon">Soon</span></>}
                </div>
              ) : (
                <Link key={item.label} href={item.href!} title={c ? item.label : undefined}
                  aria-label={c ? item.label : undefined} className="lv-nav-item">
                  <span className="lv-nav-icon"><Icon size={19} strokeWidth={1.7} /></span>
                  {!c && <span className="lv-nav-label">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="lv-sidebar-footer">
          {!mobile && (
            <button type="button" onClick={toggleCollapse} className="lv-collapse"
              aria-label={c ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!c}
              title={c ? 'Expand sidebar' : 'Collapse sidebar'}>
              {c ? <PanelLeftOpen size={17} /> : <><PanelLeftClose size={17} /><span>Collapse</span></>}
            </button>
          )}
          <div className="lv-sidebar-account">
            <div className="lv-sidebar-avatar" title={displayName}>{initials}</div>
            {!c && <div className="lv-account-copy"><p title={displayName}>{displayName}</p><span title={userEmail ?? 'Tenant'}>{userEmail ?? 'Tenant'}</span></div>}
            <button type="button" onClick={handleLogout} title="Sign out" aria-label="Sign out" className="lv-icon-button lv-signout"><LogOut size={17} /></button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{sidebarStyles}</style>
      <aside className={`lv-sidebar-desktop ${collapsed ? 'lv-sidebar-compact' : ''}`} aria-label="Account sidebar">
        {renderContent()}
      </aside>
      {open && (
        <div className="lv-sidebar-mobile" onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
          <button type="button" className="lv-sidebar-backdrop" onClick={onClose} aria-label="Close navigation" tabIndex={-1} />
          <aside className="lv-sidebar-drawer" aria-label="Account navigation">{renderContent(true)}</aside>
        </div>
      )}
    </>
  )
}

const sidebarStyles = `
.lv-user-sidebar{display:flex;flex-direction:column;height:100%;min-height:0;background:#fff;color:#334155;border-right:1px solid #e5eaf2;color-scheme:light}
.lv-user-sidebar *{box-sizing:border-box}
.lv-user-sidebar a{text-decoration:none}
.lv-user-sidebar button{font:inherit;cursor:pointer}
.lv-user-sidebar :is(a,button):focus-visible{outline:2px solid #3b82f6;outline-offset:3px}
.lv-sidebar-desktop{display:none;position:sticky;top:0;height:100vh;height:100dvh;width:264px;flex-shrink:0;z-index:30;transition:width .2s ease}
.lv-sidebar-brand{display:flex;align-items:center;gap:12px;min-height:88px;padding:18px 22px;flex-shrink:0}
.lv-sidebar-logo{display:inline-flex;align-items:center;justify-content:center;border-radius:8px;flex-shrink:0}
.lv-sidebar-logo img{height:48px;width:auto;max-width:116px;object-fit:contain}
.lv-tenant-badge{font-size:10px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;padding:5px 9px;border:1px solid #dbeafe;background:#eff6ff;color:#2563eb;border-radius:6px}
.lv-sidebar-nav{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:12px 14px 24px;scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent}
.lv-nav-heading{padding:0 12px;margin:0 0 12px;font-size:10px;font-weight:650;letter-spacing:.12em;text-transform:uppercase;color:#64748b}
.lv-nav-group{display:grid;gap:5px}
.lv-nav-item{position:relative;display:flex;align-items:center;gap:10px;min-height:46px;padding:8px 12px;border:1px solid transparent;border-radius:11px;color:#526176;font-size:13px;font-weight:500;transition:background .15s,color .15s,border-color .15s}
.lv-nav-item:hover{background:#f8fafc;color:#0f172a}
.lv-nav-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:24px;height:26px;color:#718096}
.lv-nav-label{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lv-nav-item.lv-nav-active{background:#eff6ff;border-color:#dbeafe;color:#1d4ed8;font-weight:650}
.lv-nav-active .lv-nav-icon{color:#2563eb}
.lv-active-dot{height:6px;width:6px;background:#2563eb;border-radius:50%;flex-shrink:0}
.lv-nav-divider{height:1px;background:#eef2f7;margin:23px 12px}
.lv-nav-item.lv-nav-disabled{color:#94a3b8;cursor:default;background:transparent}
.lv-nav-disabled .lv-nav-icon{color:#a3afbf}
.lv-soon{border:1px solid #e2e8f0;border-radius:5px;padding:2px 5px;font-size:9px;line-height:1.4;letter-spacing:.04em;text-transform:uppercase;color:#64748b;background:#f8fafc}
.lv-sidebar-footer{padding:10px 14px 16px;border-top:1px solid #eef2f7;flex-shrink:0;background:#fff}
.lv-collapse{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;margin-bottom:8px;border:0;border-radius:9px;background:transparent;color:#64748b;font-size:12px!important}
.lv-collapse:hover{background:#f8fafc;color:#2563eb}
.lv-sidebar-account{display:flex;align-items:center;gap:10px;padding:12px 10px;border:1px solid #e8edf5;border-radius:13px;background:#fafcff}
.lv-sidebar-avatar{display:flex;align-items:center;justify-content:center;width:36px;height:36px;flex-shrink:0;border-radius:11px;background:#dbeafe;border:1px solid #bfdbfe;color:#1d4ed8;font-size:12px;font-weight:700;overflow:hidden}
.lv-account-copy{min-width:0;flex:1}
.lv-account-copy p{margin:0;font-size:12px;font-weight:650;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lv-account-copy>span{display:block;margin-top:4px;font-size:10px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lv-icon-button{display:flex;align-items:center;justify-content:center;width:34px;height:36px;border:0;background:transparent;border-radius:8px;color:#64748b;flex-shrink:0}
.lv-signout:hover{background:#fff1f2;color:#be123c}
.lv-close{margin-left:auto}
.lv-close:hover{background:#f1f5f9;color:#0f172a}
.lv-sidebar-compact{width:80px}
.lv-user-sidebar[data-collapsed=true] .lv-sidebar-brand{padding:18px 8px;justify-content:center}
.lv-user-sidebar[data-collapsed=true] .lv-sidebar-logo img{max-width:56px;height:40px}
.lv-user-sidebar[data-collapsed=true] .lv-sidebar-nav{padding-left:10px;padding-right:10px}
.lv-user-sidebar[data-collapsed=true] .lv-nav-item{justify-content:center;padding:8px}
.lv-user-sidebar[data-collapsed=true] .lv-sidebar-footer{padding-left:10px;padding-right:10px}
.lv-user-sidebar[data-collapsed=true] .lv-collapse{justify-content:center;padding:10px}
.lv-user-sidebar[data-collapsed=true] .lv-sidebar-account{flex-direction:column;padding:10px 4px;gap:5px}
.lv-sidebar-mobile{position:fixed;inset:0;z-index:60}
.lv-sidebar-backdrop{position:absolute;inset:0;width:100%;height:100%;border:0;background:rgba(15,23,42,.35);backdrop-filter:blur(3px)}
.lv-sidebar-drawer{position:absolute;inset:0 auto 0 0;width:min(296px,88vw);height:100%;box-shadow:16px 0 60px #0f172a20;animation:lv-sidebar-enter .2s ease-out}
@keyframes lv-sidebar-enter{from{transform:translateX(-100%)}to{transform:translateX(0)}}
@media(min-width:768px){.lv-sidebar-desktop{display:block}.lv-sidebar-mobile{display:none}}
@media(prefers-reduced-motion:reduce){.lv-sidebar-desktop,.lv-nav-item{transition:none}.lv-sidebar-drawer{animation:none}}
`

import { createClient } from '@/lib/supabase/server'

interface NavbarProps {
  title: string
}

export default async function UserNavbar({ title }: NavbarProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('full_name')
    .eq('user_id', user?.id ?? '')
    .single()

  const initials = tenant?.full_name
    ? tenant.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-200 shrink-0">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#aadb5a] flex items-center justify-center">
            <span className="text-xs font-semibold text-white">{initials}</span>
          </div>
          <span className="text-sm text-gray-700 hidden sm:block">{tenant?.full_name ?? user?.email}</span>
        </div>

        <form action="/auth/signout?next=/user/login" method="POST">
          <button
            type="submit"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Sign out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  )
}

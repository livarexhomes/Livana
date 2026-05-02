import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import PublicNavbar from '@/components/public/PublicNavbar'
import Footer from '@/components/public/Footer'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let tenantName: string | null = null

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('full_name')
          .eq('user_id', user.id)
          .single()
        if (tenant?.full_name) {
          tenantName = tenant.full_name.split(' ')[0]
        }
      }
    } catch {
      // Supabase not reachable — render navbar in anonymous state
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PublicNavbar tenantName={tenantName} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

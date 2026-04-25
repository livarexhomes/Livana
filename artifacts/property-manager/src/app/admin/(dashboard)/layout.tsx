import Sidebar from '@/components/admin/Sidebar'
import Navbar from '@/components/admin/Navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar title="Dashboard" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

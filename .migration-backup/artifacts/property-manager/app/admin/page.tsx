import { Metadata } from "next";
import AdminDashboard from "@/src/pages/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard | Livarex",
  description: "Admin dashboard for managing properties, users, and platform settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminDashboard />;
}

import { Metadata } from "next";
import UserDashboard from "@/src/pages/user/UserDashboard";

export const metadata: Metadata = {
  title: "My Account | Livarex",
  description: "View your saved properties, enquiries, and account settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UserPage() {
  return <UserDashboard />;
}

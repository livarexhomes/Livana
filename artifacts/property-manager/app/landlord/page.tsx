import { Metadata } from "next";
import LandlordDashboard from "@/src/pages/landlord/LandlordDashboard";

export const metadata: Metadata = {
  title: "Landlord Dashboard | Livarex",
  description: "Manage your property listings, view enquiries, and track your dashboard performance.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LandlordPage() {
  return <LandlordDashboard />;
}

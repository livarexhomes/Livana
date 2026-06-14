import { Metadata } from "next";
import LoginPage from "@/src/pages/LoginPage";

export const metadata: Metadata = {
  title: "Login | Livarex",
  description: "Log in to your Livarex account to manage your properties, saved listings, and enquiries.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Login() {
  return <LoginPage />;
}

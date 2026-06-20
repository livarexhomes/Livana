import { Metadata } from "next";
import RegisterPage from "@/src/pages/RegisterPage";

export const metadata: Metadata = {
  title: "Register | Livarex",
  description: "Create your Livarex account to start browsing verified properties, saving favourites, and contacting landlords.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Register() {
  return <RegisterPage />;
}

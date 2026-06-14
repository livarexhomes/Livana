import { Metadata } from "next";
import PublicNavbar from "@/src/components/PublicNavbar";
import Footer from "@/src/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | Livarex",
  description:
    "Read Livarex's terms of service to understand the rules and regulations for using our platform.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8">
            Terms of Service
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-500 text-sm mb-8">
              Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing or using Livarex, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Use of Platform</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                Livarex provides a platform for property listings and rental services. You agree to use the platform only for lawful purposes and in accordance with these terms.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>You must be at least 18 years old to use our services</li>
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You agree not to post false or misleading information</li>
                <li>You will not use the platform for fraudulent purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Property Listings</h2>
              <p className="text-gray-600 leading-relaxed">
                All property listings are subject to verification. Livarex reserves the right to remove any listing that violates our policies or is found to be fraudulent. We do not guarantee the availability of any property listed on our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Fees and Payments</h2>
              <p className="text-gray-600 leading-relaxed">
                Livarex charges fees for certain services, including but not limited to property inspections and rental processing. All fees are clearly displayed before you confirm any transaction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed">
                Livarex is not liable for any disputes between tenants and landlords. We facilitate connections but do not guarantee the quality of any property or the conduct of any user.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Termination</h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to terminate or suspend your account at any time for violations of these terms or for any other reason at our discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Governing Law</h2>
              <p className="text-gray-600 leading-relaxed">
                These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in the courts of Lagos State.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Contact</h2>
              <p className="text-gray-600 leading-relaxed">
                For any questions about these Terms of Service, please contact us at hello@livarex.com.ng.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-gray-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Terms of Service</h1>
            <p className="text-gray-400 text-sm">Last updated: June 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-14 space-y-10">

          <Section title="1. Acceptance of Terms">
            <p>By accessing or using the Livarex platform (the "Service") at <strong>livarex.com.ng</strong>, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.</p>
          </Section>

          <Section title="2. About Livarex">
            <p>Livarex is a property marketplace that connects tenants with verified landlords in Nigeria. Livarex acts as an intermediary — all communication, inspections, and enquiries between tenants and landlords are coordinated by the Livarex team. Tenants do not contact landlords directly through the platform.</p>
          </Section>

          <Section title="3. User Accounts">
            <ul>
              <li>You must be at least 18 years old to create an account.</li>
              <li>You are responsible for keeping your account credentials secure.</li>
              <li>You must provide accurate and truthful information when registering.</li>
              <li>Livarex reserves the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </Section>

          <Section title="4. Landlord Listings">
            <ul>
              <li>Landlords must complete KYC (Know Your Customer) verification before any listing goes live.</li>
              <li>All listings are manually reviewed and approved by the Livarex team.</li>
              <li>Landlords must ensure all listing information is accurate, up to date, and not misleading.</li>
              <li>Livarex reserves the right to remove any listing that violates our policies or applicable law.</li>
            </ul>
          </Section>

          <Section title="5. Tenant Responsibilities">
            <ul>
              <li>Tenants may submit inspection requests and enquiries through the platform.</li>
              <li>All communication is routed through Livarex — tenants should not attempt to bypass this process.</li>
              <li>Tenants must not use the platform for any fraudulent or unlawful purpose.</li>
            </ul>
          </Section>

          <Section title="6. Inspection & Enquiry Process">
            <p>When a tenant requests an inspection or submits an enquiry, Livarex coordinates directly with the landlord and responds to the tenant. Livarex does not guarantee the availability of any property and is not a party to any rental agreement between a tenant and landlord.</p>
          </Section>

          <Section title="7. Prohibited Conduct">
            <p>You agree not to:</p>
            <ul>
              <li>Post false, misleading, or fraudulent listings or information.</li>
              <li>Harass, abuse, or harm other users or Livarex staff.</li>
              <li>Attempt to circumvent our verification or review processes.</li>
              <li>Use automated tools to scrape or access the platform without permission.</li>
              <li>Impersonate any person or entity.</li>
            </ul>
          </Section>

          <Section title="8. Intellectual Property">
            <p>All content on the Livarex platform — including logos, design, text, and software — is the property of Livarex Limited and may not be reproduced or distributed without prior written permission.</p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>The Service is provided "as is" without any warranties of any kind. Livarex does not guarantee uninterrupted access to the platform, the accuracy of listing information, or the outcome of any inspection or rental transaction.</p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>To the maximum extent permitted by law, Livarex shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Livarex is a facilitator and is not a party to rental agreements between tenants and landlords.</p>
          </Section>

          <Section title="11. Changes to Terms">
            <p>Livarex may update these Terms at any time. Continued use of the Service after changes are posted constitutes acceptance of the updated Terms.</p>
          </Section>

          <Section title="12. Contact Us">
            <p>If you have any questions about these Terms, please contact us:</p>
            <ul>
              <li>Email: <a href="mailto:support@livarex.com.ng" className="text-blue-600 hover:underline">support@livarex.com.ng</a></li>
              <li>WhatsApp: <a href="https://wa.me/2347061370742" className="text-blue-600 hover:underline">+234 706 137 0742</a></li>
            </ul>
          </Section>

        </div>
      </main>

      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-extrabold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  )
}

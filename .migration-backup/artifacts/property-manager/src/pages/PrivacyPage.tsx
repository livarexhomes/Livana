import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-gray-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
            <p className="text-gray-400 text-sm">Last updated: June 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-14 space-y-10">

          <Section title="1. Introduction">
            <p>Livarex Limited ("Livarex", "we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our platform at <strong>livarex.com.ng</strong>.</p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following categories of information:</p>
            <ul>
              <li><strong>Account information:</strong> Name, email address, phone number, and password when you register.</li>
              <li><strong>Profile information:</strong> WhatsApp number, city, state, and profile photo (for landlords).</li>
              <li><strong>KYC documents:</strong> Identity documents submitted by landlords for verification purposes.</li>
              <li><strong>Listing data:</strong> Property details, photos, pricing, and location submitted by landlords.</li>
              <li><strong>Enquiry & inspection data:</strong> Messages and requests submitted through the platform.</li>
              <li><strong>Usage data:</strong> Pages visited, device type, browser, and IP address.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul>
              <li>To create and manage your account.</li>
              <li>To verify landlord identity and approve listings.</li>
              <li>To coordinate inspections and enquiries between tenants and landlords.</li>
              <li>To send notifications about your account, listings, or enquiries.</li>
              <li>To improve and personalise your experience on the platform.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title="4. How We Share Your Information">
            <p>We do not sell your personal data. We may share your information with:</p>
            <ul>
              <li><strong>Livarex support staff</strong> who facilitate inspections and coordinate communications.</li>
              <li><strong>Third-party service providers</strong> (e.g. Supabase for database hosting, email providers) under data processing agreements.</li>
              <li><strong>Law enforcement or regulators</strong> if required by applicable law.</li>
            </ul>
            <p>Tenants' contact details are not shared directly with landlords — all communication goes through Livarex.</p>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us.</p>
          </Section>

          <Section title="6. Cookies & Tracking">
            <p>We use cookies and similar technologies to maintain sessions, remember preferences, and analyse platform usage. You can disable cookies in your browser settings, though some features may not function correctly as a result.</p>
          </Section>

          <Section title="7. Data Security">
            <p>We implement industry-standard security measures including encrypted storage, secure HTTPS connections, and access controls. However, no system is completely secure and we cannot guarantee absolute security of your data.</p>
          </Section>

          <Section title="8. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and personal data.</li>
              <li>Withdraw consent where processing is based on consent.</li>
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:support@livarex.com.ng" className="text-blue-600 hover:underline">support@livarex.com.ng</a>.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>Livarex is not directed at children under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with data, please contact us and we will delete it promptly.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the platform. Continued use of the Service after changes are posted constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="11. Contact Us">
            <p>If you have any questions or concerns about this Privacy Policy, please reach out:</p>
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

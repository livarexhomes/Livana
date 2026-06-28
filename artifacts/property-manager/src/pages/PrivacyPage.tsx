import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <div className="bg-gray-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
            <p className="text-gray-400 text-sm">Last updated: June 27, 2025</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-14 space-y-10">

          <p className="text-gray-600 text-sm leading-relaxed">
            Livarex Homes Limited ("Livarex," "we," "our," or "us") is committed to protecting your privacy and safeguarding your personal information. This Privacy Policy explains how we collect, use, store, disclose, and protect your personal information when you access or use our website, mobile applications, and related services (collectively, the "Platform").
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            By accessing or using the Platform, you acknowledge that you have read and understood this Privacy Policy and consent to the collection and use of your information as described herein.
          </p>

          <Section title="1. Information We Collect">
            <p>To provide our services effectively, we may collect the following categories of information:</p>
            <p className="font-semibold text-gray-800 mt-3">Personal Information</p>
            <ul>
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Residential address</li>
              <li>Profile information</li>
              <li>Government-issued identification (where required for verification)</li>
            </ul>
            <p className="font-semibold text-gray-800 mt-3">Property Information</p>
            <p>For landlords, property owners, caretakers, and authorized agents, we may collect:</p>
            <ul>
              <li>Property address</li>
              <li>Property descriptions</li>
              <li>Property photographs</li>
              <li>Ownership or authorization documents</li>
              <li>Rental pricing and availability information</li>
            </ul>
            <p className="font-semibold text-gray-800 mt-3">Payment Information</p>
            <p>Where payments are processed through Livarex or our approved payment partners, we may collect transaction records, payment references, and payment status information. Livarex does not store sensitive debit card details, banking credentials, or payment authentication data except where required by law or through an approved payment process.</p>
            <p className="font-semibold text-gray-800 mt-3">Technical Information</p>
            <p>When you use our Platform, we may automatically collect IP address, browser type and version, device information, operating system, date and time of access, platform usage activity, and log and diagnostic information.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use your information to:</p>
            <ul>
              <li>Create and manage user accounts.</li>
              <li>Verify users and property listings.</li>
              <li>Facilitate communication between tenants, landlords, and other users.</li>
              <li>Process payments and escrow transactions where applicable.</li>
              <li>Detect, prevent, and investigate fraud or unauthorized activities.</li>
              <li>Improve the functionality, performance, and security of the Platform.</li>
              <li>Respond to customer support requests and inquiries.</li>
              <li>Comply with legal and regulatory obligations.</li>
              <li>Send important service notifications and account updates.</li>
            </ul>
          </Section>

          <Section title="3. Property Verification">
            <p>To maintain a trusted marketplace, Livarex may request identity documents, ownership records, photographs, or other supporting documents necessary to verify users and listed properties. Verification information is used solely for security, compliance, and verification purposes.</p>
          </Section>

          <Section title="4. Sharing of Information">
            <p>Livarex does not sell, rent, or trade users' personal information. We may disclose information only in the following circumstances:</p>
            <p className="font-semibold text-gray-800 mt-3">Service Providers</p>
            <p>We may share information with trusted third-party service providers that assist us with payment processing, cloud hosting, data storage, website maintenance, security monitoring, and customer support. These providers are required to protect your information and use it only for the services they provide on our behalf.</p>
            <p className="font-semibold text-gray-800 mt-3">Legal and Regulatory Authorities</p>
            <p>We may disclose information where required by law, court order, regulatory request, or where necessary to comply with legal obligations, prevent fraud or criminal activity, or protect the rights, property, safety, or security of Livarex, our users, or the public.</p>
            <p className="font-semibold text-gray-800 mt-3">Business Transfers</p>
            <p>In the event of a merger, acquisition, restructuring, financing, or sale of assets, user information may be transferred as part of that transaction, subject to applicable legal requirements.</p>
          </Section>

          <Section title="5. Data Security">
            <p>Livarex implements reasonable administrative, technical, and organizational safeguards designed to protect personal information against unauthorized access, misuse, alteration, loss, or disclosure.</p>
            <p>However, no internet-based platform or electronic storage system can guarantee absolute security. Users are responsible for maintaining the confidentiality of their account credentials.</p>
          </Section>

          <Section title="6. Data Retention">
            <p>We retain personal information only for as long as reasonably necessary to provide our services, maintain business records, resolve disputes, prevent fraud, comply with legal obligations, and enforce our Terms and Conditions. When information is no longer required, it will be securely deleted, anonymized, or otherwise disposed of in accordance with applicable laws.</p>
          </Section>

          <Section title="7. Your Privacy Rights">
            <p>Subject to applicable law, you may have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you.</li>
              <li>Correct inaccurate or incomplete information.</li>
              <li>Update your account information.</li>
              <li>Request deletion of your personal information.</li>
              <li>Withdraw consent where processing is based on consent.</li>
              <li>Object to certain processing activities where permitted by law.</li>
            </ul>
            <p>Requests may be submitted using the contact details provided below.</p>
          </Section>

          <Section title="8. Cookies and Analytics">
            <p>Livarex may use cookies and similar technologies to improve user experience, remember your preferences, analyze website performance, enhance security, and improve our services.</p>
            <p>You may configure your browser settings to refuse or manage cookies, although doing so may affect certain Platform features.</p>
          </Section>

          <Section title="9. Third-Party Services">
            <p>The Platform may contain links to third-party websites, payment providers, or other services. Livarex is not responsible for the privacy practices or content of external websites or services. Users are encouraged to review the privacy policies of any third-party services they access.</p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>Livarex's services are intended solely for individuals who are at least 18 years of age. We do not knowingly collect personal information from children. If we become aware that such information has been collected, we will take reasonable steps to delete it promptly.</p>
          </Section>

          <Section title="11. Compliance with Nigerian Data Protection Laws">
            <p>Livarex processes personal information in accordance with applicable laws of the Federal Republic of Nigeria, including the Nigeria Data Protection Act (NDPA), where applicable.</p>
          </Section>

          <Section title="12. Changes to This Privacy Policy">
            <p>We may update this Privacy Policy periodically to reflect changes in our services, legal requirements, or operational practices. Updated versions will be published on the Platform and become effective immediately upon publication unless otherwise stated.</p>
            <p>Your continued use of the Platform after any updates constitutes your acceptance of the revised Privacy Policy.</p>
          </Section>

          <Section title="13. Contact Information">
            <p>If you have any questions, requests, or concerns regarding this Privacy Policy or how your personal information is handled, please contact us:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:livarexhomes@gmail.com" className="text-blue-600 hover:underline">livarexhomes@gmail.com</a></li>
              <li><strong>Phone:</strong> 07060528437</li>
              <li><strong>Address:</strong> Lagos, Nigeria</li>
              <li><strong>Website:</strong> <a href="https://www.livarex.com.ng" className="text-blue-600 hover:underline">www.livarex.com.ng</a></li>
            </ul>
          </Section>

          <div className="border-t border-gray-100 pt-8">
            <p className="text-gray-500 text-sm leading-relaxed">By using the Livarex Platform, you acknowledge that you have read, understood, and agree to this Privacy Policy.</p>
            <p className="text-gray-900 font-bold text-sm mt-4">Livarex Homes Limited</p>
            <p className="text-gray-400 text-xs italic">"The Bridge to Your New Home."</p>
          </div>

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

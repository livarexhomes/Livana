import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <div className="bg-gray-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Terms and Conditions</h1>
            <p className="text-gray-400 text-sm">Last updated: June 27, 2025</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-14 space-y-10">

          <p className="text-gray-600 text-sm leading-relaxed">
            Welcome to Livarex Homes Limited ("Livarex," "we," "our," or "us"). These Terms and Conditions ("Terms") govern your access to and use of the Livarex website, mobile applications, and all related services (collectively, the "Platform").
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            By accessing or using the Platform, creating an account, or using any of our services, you acknowledge that you have read, understood, and agree to be legally bound by these Terms. If you do not agree with any part of these Terms, you must discontinue use of the Platform.
          </p>

          <Section title="1. About Livarex">
            <p>Livarex Homes Limited is a digital real estate platform that connects tenants, landlords, property owners, caretakers, agents, and other real estate stakeholders.</p>
            <p>The Platform provides property listings, communication tools, property verification services, and payment facilitation services where applicable. Unless expressly stated otherwise, Livarex acts solely as a technology platform and is not the owner, landlord, property manager, or legal agent of any listed property.</p>
          </Section>

          <Section title="2. Eligibility">
            <p>To use the Platform, you must:</p>
            <ul>
              <li>Be at least 18 years of age.</li>
              <li>Have the legal capacity to enter into binding agreements.</li>
              <li>Provide accurate, complete, and truthful information.</li>
              <li>Comply with all applicable laws and regulations.</li>
            </ul>
          </Section>

          <Section title="3. User Accounts">
            <p>Certain services require the creation of an account. By creating an account, you agree to:</p>
            <ul>
              <li>Provide accurate and up-to-date information.</li>
              <li>Keep your login credentials secure and confidential.</li>
              <li>Notify Livarex immediately of any unauthorized access or security breach.</li>
              <li>Accept responsibility for all activities carried out through your account.</li>
            </ul>
            <p>Livarex reserves the right to suspend or terminate accounts that violate these Terms or engage in fraudulent or unlawful activities.</p>
          </Section>

          <Section title="4. Property Listings">
            <p>Landlords, property owners, and authorized representatives are solely responsible for ensuring that:</p>
            <ul>
              <li>Property information is accurate and up to date.</li>
              <li>Images and descriptions fairly represent the property.</li>
              <li>The property is legally available for rent or lease.</li>
              <li>They possess the legal authority to publish the listing.</li>
            </ul>
            <p>While Livarex may verify listings, we do not guarantee the accuracy or completeness of information supplied by users or third parties.</p>
            <p>Livarex reserves the right to edit, reject, suspend, or remove any listing that violates these Terms or applicable laws.</p>
          </Section>

          <Section title="5. Verified Listings">
            <p>Properties identified as <strong>Verified</strong> have undergone Livarex's internal verification procedures, which may include:</p>
            <ul>
              <li>Physical property inspection</li>
              <li>Identity verification</li>
              <li>Property ownership confirmation</li>
              <li>Review of supporting documentation</li>
            </ul>
            <p>Verification does not constitute a legal guarantee of the property's condition or ownership. Users are strongly encouraged to conduct independent inspections and due diligence before entering into any agreement.</p>
          </Section>

          <Section title="6. Payments and Escrow Services">
            <p>Where available, Livarex may facilitate secure payments between tenants and landlords. Under the escrow process:</p>
            <ul>
              <li>The tenant submits payment.</li>
              <li>Livarex securely holds the funds.</li>
              <li>The tenant confirms that agreed conditions have been satisfied.</li>
              <li>Livarex releases the funds to the landlord.</li>
            </ul>
            <p>Livarex may delay or withhold payment where there are disputes, suspected fraud, chargebacks, legal concerns, or violations of these Terms. Applicable service fees may be deducted before payment is released.</p>
          </Section>

          <Section title="7. Refund Policy">
            <p>Refund requests are reviewed individually based on the available evidence and the circumstances surrounding the transaction. Refunds may be denied where:</p>
            <ul>
              <li>The tenant has already taken possession of the property.</li>
              <li>False or misleading information was provided.</li>
              <li>The request violates these Terms.</li>
              <li>The agreed services have already been delivered.</li>
            </ul>
            <p>Livarex reserves the sole discretion to determine refund eligibility.</p>
          </Section>

          <Section title="8. Prohibited Activities">
            <p>Users must not:</p>
            <ul>
              <li>Publish false or misleading property listings.</li>
              <li>Impersonate another individual or organization.</li>
              <li>Upload unlawful, offensive, or fraudulent content.</li>
              <li>Bypass Livarex's payment system where platform fees apply.</li>
              <li>Attempt to hack, disrupt, or interfere with the Platform.</li>
              <li>Use the Platform for any unlawful or fraudulent purpose.</li>
            </ul>
            <p>Violation of these Terms may result in suspension, termination, removal of listings, or legal action.</p>
          </Section>

          <Section title="9. User Responsibilities">
            <p>Users are responsible for:</p>
            <ul>
              <li>Inspecting and verifying the suitability of any property.</li>
              <li>Carefully reviewing lease or rental agreements before signing.</li>
              <li>Conducting reasonable due diligence.</li>
              <li>Providing accurate personal information.</li>
            </ul>
            <p>Livarex encourages all users to exercise caution and independent judgment before entering into any property transaction.</p>
          </Section>

          <Section title="10. Intellectual Property">
            <p>All trademarks, logos, software, website content, graphics, designs, and other intellectual property displayed on the Platform remain the exclusive property of Livarex Homes Limited. No content may be copied, reproduced, distributed, modified, or exploited without prior written consent.</p>
          </Section>

          <Section title="11. Disclaimer and Limitation of Liability">
            <p>Livarex operates solely as a technology platform that facilitates connections between users. Although reasonable efforts are made to verify listings and users, Livarex does not guarantee that every listing or user is free from error, fraud, or misrepresentation.</p>
            <p>To the fullest extent permitted by law, Livarex shall not be liable for:</p>
            <ul>
              <li>Property defects.</li>
              <li>Landlord-tenant disputes.</li>
              <li>Financial losses.</li>
              <li>Fraud committed by third parties.</li>
              <li>Loss of income or business opportunities.</li>
              <li>Indirect, incidental, or consequential damages.</li>
            </ul>
            <p>Rental agreements are entered into solely between the relevant parties and not with Livarex.</p>
          </Section>

          <Section title="12. Account Suspension and Termination">
            <p>Livarex reserves the right to suspend or permanently terminate any account that:</p>
            <ul>
              <li>Violates these Terms.</li>
              <li>Engages in fraudulent or illegal activity.</li>
              <li>Creates legal or operational risks.</li>
              <li>Harms other users or the integrity of the Platform.</li>
            </ul>
            <p>Termination may occur without prior notice where necessary to protect users or the Platform.</p>
          </Section>

          <Section title="13. Privacy">
            <p>Your use of the Platform is also governed by our Privacy Policy. By using Livarex, you consent to the collection, storage, use, and processing of your personal information in accordance with applicable Nigerian data protection laws and our Privacy Policy.</p>
          </Section>

          <Section title="14. Force Majeure">
            <p>Livarex shall not be responsible for delays or failure to perform its obligations where such failure results from circumstances beyond its reasonable control, including natural disasters, internet failures, government actions, civil unrest, labour disputes, or other force majeure events.</p>
          </Section>

          <Section title="15. Dispute Resolution">
            <p>Users are encouraged to first contact Livarex Support to resolve any disputes amicably. Where disputes cannot be resolved through negotiation, they shall be governed by the laws of the Federal Republic of Nigeria and resolved by the appropriate courts or any mutually agreed alternative dispute resolution process.</p>
          </Section>

          <Section title="16. Severability">
            <p>If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall remain valid and enforceable.</p>
          </Section>

          <Section title="17. Amendments">
            <p>Livarex reserves the right to amend these Terms at any time. Any updates become effective immediately upon publication on the Platform. Continued use of the Platform constitutes acceptance of the revised Terms.</p>
          </Section>

          <Section title="18. Entire Agreement">
            <p>These Terms and Conditions, together with the Privacy Policy, constitute the entire agreement between Livarex Homes Limited and users regarding the use of the Platform.</p>
          </Section>

          <Section title="19. Contact Information">
            <ul>
              <li><strong>Email:</strong> <a href="mailto:livarexhomes@gmail.com" className="text-blue-600 hover:underline">livarexhomes@gmail.com</a></li>
              <li><strong>Phone:</strong> 07060528437</li>
              <li><strong>Address:</strong> Lagos, Nigeria</li>
              <li><strong>Website:</strong> <a href="https://www.livarex.com.ng" className="text-blue-600 hover:underline">www.livarex.com.ng</a></li>
            </ul>
          </Section>

          <div className="border-t border-gray-100 pt-8">
            <p className="text-gray-500 text-sm leading-relaxed">By accessing or using the Livarex Platform, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions.</p>
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

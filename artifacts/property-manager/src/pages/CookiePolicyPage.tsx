import { useState } from 'react'
import { Cookie, ShieldCheck, BarChart2, Settings2, Megaphone, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import Footer from '@/components/layout/Footer'
import { Link } from '@/lib/navigation'

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-3 pl-4">{children}</div>
    </section>
  )
}

// ── Collapsible FAQ row ───────────────────────────────────────────────────────
function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-white hover:bg-gray-50 text-left transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 bg-gray-50 text-sm text-gray-600 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Cookie type card ──────────────────────────────────────────────────────────
function CookieCard({
  icon: Icon,
  colour,
  name,
  required,
  purpose,
  examples,
}: {
  icon: React.ElementType
  colour: string
  name: string
  required: boolean
  purpose: string
  examples: string[]
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colour} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-gray-900">{name}</p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
          required ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {required ? 'Required' : 'Optional'}
        </span>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{purpose}</p>
      <div className="flex flex-wrap gap-1.5">
        {examples.map(e => (
          <span key={e} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 font-medium">{e}</span>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gray-900 text-white pt-[88px] pb-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2.5 mb-4">
              <Cookie className="w-5 h-5 text-blue-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Legal</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Cookie Policy</h1>
            <p className="text-gray-400 text-sm">Last updated: July 29, 2025 · Effective for all Livarex users</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-14 space-y-12">

          {/* Intro */}
          <p className="text-gray-600 text-sm leading-relaxed">
            Livarex Homes Limited ("Livarex," "we," "our," or "us") uses cookies and similar tracking technologies
            on our website (<a href="https://livarex.com.ng" className="text-blue-600 hover:underline">livarex.com.ng</a>)
            and mobile applications to provide a fast, secure, and personalised property search experience.
            This Cookie Policy explains what cookies are, which ones we use, why we use them,
            and the choices you have to control them.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            By continuing to use the Livarex platform, you agree to our use of cookies as described in this policy.
            You can withdraw consent at any time by adjusting your browser or device settings.
          </p>

          {/* What are cookies */}
          <Section title="1. What Are Cookies?">
            <p>
              Cookies are small text files that are placed on your device (computer, smartphone, tablet)
              when you visit a website. They are widely used to make websites work more efficiently,
              remember your preferences, and give website owners information about how their site is being used.
            </p>
            <p>
              Cookies are not programmes — they cannot execute code, carry viruses, or access your personal files.
              They simply store a small amount of data related to your browsing session or preferences.
            </p>
            <p>
              Similar technologies we may also use include <strong>web beacons</strong> (tiny transparent pixels used to track
              email open rates and page visits), <strong>local storage</strong> (browser-side data storage for performance), and
              <strong> session storage</strong> (temporary in-session data that is cleared when you close your browser).
            </p>
          </Section>

          {/* Types */}
          <Section title="2. Types of Cookies We Use">
            <p className="mb-2">We group our cookies into four categories:</p>
            <div className="space-y-4 !mt-5">
              <CookieCard
                icon={ShieldCheck}
                colour="bg-blue-50 text-blue-600"
                name="Essential Cookies"
                required={true}
                purpose="These cookies are strictly necessary for the Livarex platform to function. They enable core features like logging in, saving properties, maintaining your session securely, and processing search queries. You cannot opt out of these cookies without disabling the platform itself."
                examples={['Session token', 'Auth state', 'CSRF protection', 'Search filters']}
              />
              <CookieCard
                icon={BarChart2}
                colour="bg-violet-50 text-violet-600"
                name="Analytics Cookies"
                required={false}
                purpose="These cookies help us understand how visitors interact with our platform — which pages are most visited, how users navigate between listings, where they drop off in the registration flow, and how long they spend on each section. This data is aggregated and anonymised. We use this to improve the platform for all users."
                examples={['Google Analytics', 'Page views', 'Session duration', 'Traffic sources']}
              />
              <CookieCard
                icon={Settings2}
                colour="bg-emerald-50 text-emerald-600"
                name="Functional Cookies"
                required={false}
                purpose="These cookies remember choices you make to provide a more personalised experience. For example, remembering your preferred city, your last search filters, your saved properties list, or your chat history so you don't have to re-enter information on each visit."
                examples={['Location preference', 'Saved searches', 'Language/region', 'Chat session']}
              />
              <CookieCard
                icon={Megaphone}
                colour="bg-amber-50 text-amber-600"
                name="Marketing Cookies"
                required={false}
                purpose="These cookies may be used to deliver advertisements that are more relevant to you and your interests, to limit how many times you see an ad, and to measure the effectiveness of advertising campaigns. They are typically placed by third-party advertising partners."
                examples={['Google Ads', 'Facebook Pixel', 'Retargeting', 'Conversion tracking']}
              />
            </div>
          </Section>

          {/* Specifically */}
          <Section title="3. Cookies We Specifically Use">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 rounded-2xl overflow-hidden">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    {['Cookie Name', 'Provider', 'Purpose', 'Duration', 'Type'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { name: 'sb-access-token',   provider: 'Supabase',         purpose: 'Authentication session',             duration: 'Session',   type: 'Essential' },
                    { name: 'sb-refresh-token',  provider: 'Supabase',         purpose: 'Auth token refresh',                 duration: '7 days',    type: 'Essential' },
                    { name: 'livarex_prefs',     provider: 'Livarex',          purpose: 'Search filters & preferences',       duration: '30 days',   type: 'Functional' },
                    { name: '_ga',               provider: 'Google Analytics', purpose: 'Distinguish unique users',           duration: '2 years',   type: 'Analytics' },
                    { name: '_gid',              provider: 'Google Analytics', purpose: 'Track session activity',             duration: '24 hours',  type: 'Analytics' },
                    { name: '_fbp',              provider: 'Meta (Facebook)',   purpose: 'Facebook advertising attribution',   duration: '90 days',   type: 'Marketing' },
                    { name: '_gcl_au',           provider: 'Google Ads',       purpose: 'Ad conversion measurement',          duration: '90 days',   type: 'Marketing' },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-mono text-gray-700">{row.name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.provider}</td>
                      <td className="px-4 py-3 text-gray-600">{row.purpose}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.duration}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          row.type === 'Essential' ? 'bg-blue-50 text-blue-600' :
                          row.type === 'Functional' ? 'bg-emerald-50 text-emerald-600' :
                          row.type === 'Analytics' ? 'bg-violet-50 text-violet-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>{row.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Third party */}
          <Section title="4. Third-Party Cookies">
            <p>
              Some cookies on Livarex are placed by third-party services we use to improve our platform.
              These third parties have their own privacy and cookie policies, and Livarex does not control
              how they use the data they collect.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Google Analytics</strong> — website traffic analysis. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Privacy Policy ↗</a></li>
              <li><strong>Supabase</strong> — authentication and real-time database. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Privacy Policy ↗</a></li>
              <li><strong>Google Maps</strong> — interactive property location maps. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Privacy Policy ↗</a></li>
              <li><strong>Meta (Facebook)</strong> — advertising attribution (if enabled). <a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Meta Privacy Policy ↗</a></li>
            </ul>
          </Section>

          {/* Your choices */}
          <Section title="5. Your Cookie Choices">
            <p>You have several ways to control or limit how cookies are used on your device:</p>

            <div className="space-y-4 !mt-4">
              {[
                {
                  yes: true,
                  title: 'Browser Settings',
                  body: 'All modern browsers allow you to view, manage, and delete cookies through their settings panel. You can set your browser to refuse all cookies or to alert you when a cookie is being sent. Note that disabling essential cookies may prevent you from logging in or using core features.',
                },
                {
                  yes: true,
                  title: 'Google Analytics Opt-Out',
                  body: 'Install the Google Analytics Opt-out Browser Add-on to prevent your data from being used by Google Analytics: analytics.google.com/analytics/web/provision/#/provision',
                },
                {
                  yes: true,
                  title: 'Meta (Facebook) Ad Preferences',
                  body: 'Manage your Facebook ad preferences at facebook.com/ads/preferences to control how Meta uses data for advertising.',
                },
                {
                  yes: false,
                  title: 'Essential Cookies Cannot Be Disabled',
                  body: 'Cookies that are strictly necessary for the platform to function (login sessions, CSRF tokens, search state) cannot be disabled without preventing normal use of Livarex.',
                },
              ].map(item => (
                <div key={item.title} className="flex gap-3 p-4 rounded-2xl border border-gray-200 bg-white">
                  {item.yes
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{item.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Data transfers */}
          <Section title="6. Data Transfers &amp; Security">
            <p>
              Some of the third-party services we use may transfer cookie data outside Nigeria.
              Where this occurs, we rely on the standard contractual clauses and the privacy frameworks
              established by those service providers to ensure your data is protected.
            </p>
            <p>
              We do not sell cookie data or browsing profiles to any third party for commercial purposes.
              Any data collected through cookies is used solely to improve your experience on the Livarex platform
              or for advertising attribution as described in this policy.
            </p>
          </Section>

          {/* Children */}
          <Section title="7. Cookies &amp; Children">
            <p>
              Livarex is not directed at children under the age of 18. We do not knowingly collect or
              process data from minors through cookies or any other means. If you believe a minor has
              provided us with personal data, please contact us at{' '}
              <a href="mailto:support@livarex.com.ng" className="text-blue-600 hover:underline">support@livarex.com.ng</a>.
            </p>
          </Section>

          {/* Updates */}
          <Section title="8. Updates to This Policy">
            <p>
              We may update this Cookie Policy from time to time to reflect changes in technology,
              regulation, or our business practices. When we make material changes, we will update
              the "Last updated" date at the top of this page and, where appropriate, notify you
              via email or a notice on the platform.
            </p>
            <p>
              Continued use of the Livarex platform after any changes constitutes your acceptance
              of the updated Cookie Policy.
            </p>
          </Section>

          {/* FAQ */}
          <Section title="9. Frequently Asked Questions">
            <div className="space-y-3 !mt-4">
              <FAQ q="Do I need to accept cookies to use Livarex?">
                <p>Essential cookies are required for the platform to function — you cannot log in, search, or save properties without them. Optional cookies (analytics, marketing) can be declined through your browser settings without losing core functionality.</p>
              </FAQ>
              <FAQ q="How do I delete cookies that Livarex has already placed?">
                <p>Go to your browser settings → Privacy &amp; Security → Cookies → and search for "livarex.com.ng". You can delete all cookies from our domain directly from there. On mobile, this is usually under Settings → Safari/Chrome → Clear History and Website Data.</p>
              </FAQ>
              <FAQ q="Does Livarex track me across other websites?">
                <p>Livarex only tracks your activity within the Livarex platform. If we use marketing cookies (e.g. Facebook Pixel), those third parties may associate your activity with their own cross-site profiles — you can opt out through their respective ad preference centres.</p>
              </FAQ>
              <FAQ q="Are cookies the only way Livarex collects data?">
                <p>No. We also collect information you provide directly (registration forms, enquiries, KYC documents) and technical data from server logs. Our full <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> explains this in detail.</p>
              </FAQ>
              <FAQ q="How can I contact Livarex about cookie concerns?">
                <p>Email us at <a href="mailto:support@livarex.com.ng" className="text-blue-600 hover:underline">support@livarex.com.ng</a> with the subject "Cookie Policy Query" and our team will respond within 2 business days.</p>
              </FAQ>
            </div>
          </Section>

          {/* Contact block */}
          <div className="rounded-3xl bg-gray-900 text-white p-8 space-y-3">
            <Cookie className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-bold">Questions about our Cookie Policy?</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              If you have any questions, concerns, or requests regarding this Cookie Policy,
              please reach out to our Data Privacy team:
            </p>
            <div className="space-y-1 text-sm text-gray-300">
              <p><strong className="text-white">Livarex Homes Limited</strong></p>
              <p>Email: <a href="mailto:support@livarex.com.ng" className="text-blue-400 hover:text-blue-300">support@livarex.com.ng</a></p>
              <p>Website: <a href="https://livarex.com.ng" className="text-blue-400 hover:text-blue-300">livarex.com.ng</a></p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/privacy" className="text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl">Privacy Policy</Link>
              <Link href="/terms" className="text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl">Terms &amp; Conditions</Link>
              <Link href="/contact" className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 rounded-xl">Contact Us</Link>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}

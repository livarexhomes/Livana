import { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import PublicNavbar from "@/src/components/PublicNavbar";
import Footer from "@/src/components/Footer";

export const metadata: Metadata = {
  title: "Contact Us | Livarex - Nigeria's Verified Property Marketplace",
  description:
    "Get in touch with the Livarex team. We're here to help with your property search, landlord verification, and any questions.",
  openGraph: {
    title: "Contact Us | Livarex",
    description: "Reach out to the Livarex support team for assistance.",
    url: "https://www.livarex.com.ng/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">
              Get in Touch
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Have questions? We're here to help with your property journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Contact info */}
            <div className="space-y-6">
              {[
                {
                  icon: Mail,
                  title: "Email",
                  value: "hello@livarex.com.ng",
                  href: "mailto:hello@livarex.com.ng",
                },
                {
                  icon: Phone,
                  title: "Phone",
                  value: "+234 800 LIVAREX",
                  href: "tel:+2348005482739",
                },
                {
                  icon: MapPin,
                  title: "Office",
                  value: "Lagos, Nigeria",
                },
                {
                  icon: Clock,
                  title: "Hours",
                  value: "Mon–Fri, 9am–6pm WAT",
                },
              ].map(({ icon: Icon, title, value, href }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-100"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      {title}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                Send us a message
              </h2>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                    placeholder="Tell us more..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

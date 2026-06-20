import { MapPin, CheckCircle, ShieldCheck, MessageCircle, Home } from "lucide-react";
import { useState } from "react";

export function FullBleed() {
  const [activeTab, setActiveTab] = useState("Buy");
  const tabs = ["Buy", "Rent", "Lease", "Commercial"];

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col justify-center font-sans bg-black">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1400&q=80"
          alt="Luxury property"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center mt-12">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-sm font-medium mb-8">
          <span className="text-lg leading-none">🇳🇬</span>
          Nigeria's #1 Property Platform
        </div>

        {/* Typography */}
        <h1 className="text-white mb-6 tracking-tight">
          <span className="block text-5xl md:text-7xl font-bold mb-2">Find Your Perfect Home</span>
          <span className="block text-3xl md:text-5xl font-medium text-white/90">Anywhere in Nigeria</span>
        </h1>

        <p className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl">
          Verified landlords. Direct contact. Zero agent fees.
        </p>

        {/* Search Card */}
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-4 md:p-6 mb-10 transform transition-all hover:scale-[1.01]">
          <div className="flex gap-2 overflow-x-auto pb-4 md:pb-6 hide-scrollbar border-b border-gray-100 mb-4 md:mb-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Where do you want to live? e.g. Lekki, Ikoyi..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-gray-900"
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-lg shadow-blue-600/20 md:w-auto w-full">
              Search
            </button>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-white/90">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="font-medium text-sm md:text-base">Verified Landlords</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-sm md:text-base">₦0 Agent Fees</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-400" />
            <span className="font-medium text-sm md:text-base">Direct WhatsApp Contact</span>
          </div>
        </div>
      </div>

      {/* Floating Property Cards */}
      <div className="absolute bottom-0 left-0 right-0 z-10 hidden md:flex justify-center gap-6 px-4 translate-y-12">
        {/* Card 1 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-t-2xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] w-72 transform transition-transform hover:-translate-y-4 cursor-pointer border border-white/20">
          <div className="flex gap-3">
            <img
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&q=80"
              alt="Lekki Villa"
              className="w-20 h-20 object-cover rounded-xl"
            />
            <div className="flex flex-col justify-center">
              <div className="font-bold text-gray-900 mb-1">₦4.5M/yr</div>
              <div className="text-sm text-gray-600 line-clamp-1">4 Bed Duplex</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> Lekki Phase 1
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-t-2xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] w-72 transform transition-transform hover:-translate-y-4 cursor-pointer border border-white/20">
          <div className="flex gap-3">
            <img
              src="https://images.unsplash.com/photo-1600607687931-cecebd802404?w=200&q=80"
              alt="Ikoyi Apartment"
              className="w-20 h-20 object-cover rounded-xl"
            />
            <div className="flex flex-col justify-center">
              <div className="font-bold text-gray-900 mb-1">₦12M/yr</div>
              <div className="text-sm text-gray-600 line-clamp-1">3 Bed Apartment</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> Old Ikoyi
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FullBleed;

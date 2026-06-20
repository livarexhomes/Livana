import React, { useState } from 'react';
import { Search, MapPin, CheckCircle, ArrowRight } from 'lucide-react';

export function SplitScreen() {
  const [activeTab, setActiveTab] = useState('buy');

  return (
    <div className="min-h-screen bg-white flex w-full font-sans overflow-hidden text-slate-900">
      {/* Left Column - Text & Search (55%) */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-12 lg:py-0">
        <div className="max-w-xl">
          {/* Label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
            </span>
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Nigeria's Leading Property Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
            Find Your Next Home in Nigeria
          </h1>

          {/* Subtitle */}
          <p className="text-lg lg:text-xl text-slate-600 mb-10 leading-relaxed max-w-lg">
            Browse verified listings. Contact landlords directly. No agent fees.
          </p>

          {/* Search Card */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-3 mb-12">
            {/* Tabs */}
            <div className="flex space-x-1 mb-4 border-b border-slate-100 px-3 pt-2 pb-3">
              {['buy', 'rent', 'lease', 'commercial'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Input & Button */}
            <div className="flex flex-col sm:flex-row gap-3 px-3 pb-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Lagos, Abuja, Port Harcourt..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
                />
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20">
                <Search className="w-5 h-5" />
                Search
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-8 text-sm text-slate-500">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-slate-900 text-xl">2,400+</span>
              <span>Properties</span>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-slate-900 text-xl">850+</span>
              <span>Landlords</span>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-slate-900 text-xl">₦0</span>
              <span>Agent Fees</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Image (45%) */}
      <div className="hidden lg:block lg:w-[45%] h-screen relative p-4 pl-0">
        <div className="w-full h-full relative rounded-l-[3rem] overflow-hidden shadow-2xl">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80"
            alt="Modern luxury house"
            className="w-full h-full object-cover"
          />
          
          {/* Top Right Badge */}
          <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-sm shadow-xl rounded-full px-4 py-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold">Verified Landlord</span>
          </div>

          {/* Bottom Left Card */}
          <div className="absolute bottom-12 left-8 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 w-[320px] border border-white/20">
            <div className="bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-3">
              Just Listed
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              3 Bed Detached • Lekki
            </h3>
            <p className="text-blue-600 font-bold text-xl mb-4">
              ₦4,500,000<span className="text-sm text-slate-500 font-normal">/yr</span>
            </p>
            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              View Property <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplitScreen;
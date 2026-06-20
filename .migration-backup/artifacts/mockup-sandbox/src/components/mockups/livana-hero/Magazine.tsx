import React, { useState } from 'react';
import { Search, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';

export function Magazine() {
  const [activeType, setActiveType] = useState('Rent');

  return (
    <div className="min-h-screen bg-white flex items-center justify-center overflow-hidden font-sans">
      <div className="container mx-auto px-6 h-screen py-12 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
        
        {/* LEFT SIDE */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center relative z-10 h-full">
          <div className="mb-6 lg:mb-10 mt-auto">
            <span className="text-blue-600 font-bold tracking-[0.2em] text-xs lg:text-sm uppercase">Livana — Real Estate</span>
          </div>

          <div className="flex flex-col leading-[0.8] mb-8 font-black tracking-tighter w-full">
            <h1 className="text-[5rem] sm:text-[6rem] lg:text-[10rem] text-black w-full block">YOUR</h1>
            <h1 className="text-[5rem] sm:text-[6rem] lg:text-[10rem] text-transparent block w-full" style={{ WebkitTextStroke: '3px #2563eb' }}>DREAM</h1>
            <h1 className="text-[5rem] sm:text-[6rem] lg:text-[10rem] text-black w-full block">HOME</h1>
          </div>

          <p className="text-gray-600 text-lg lg:text-xl mb-10 max-w-md font-medium">
            Verified properties across Nigeria. No agents. No fees.
          </p>

          <div className="w-full max-w-lg mb-10">
            <div className="flex gap-2 mb-4">
              {['Rent', 'Buy', 'Shortlet'].map(type => (
                <button 
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    activeType === type 
                      ? 'bg-black text-white' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex gap-2 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="w-5 h-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search Lagos, Abuja..." 
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white shadow-sm text-lg"
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl transition-colors flex items-center justify-center shadow-md">
                <Search className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 font-bold mb-10 uppercase tracking-wide">
            <span>2,400+ Listings</span>
            <span className="text-gray-300">|</span>
            <span>12 Cities</span>
            <span className="text-gray-300">|</span>
            <span className="text-blue-600">₦0 Fees</span>
          </div>

          <div className="mb-auto">
            <a href="#" className="inline-flex items-center gap-2 text-blue-600 font-bold text-lg hover:gap-4 transition-all uppercase tracking-wide">
              Browse All Properties <ArrowRight className="w-6 h-6" />
            </a>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full lg:w-1/2 h-[85vh] relative hidden lg:flex items-center justify-center">
          <div className="w-full h-full relative grid grid-cols-2 grid-rows-[60%_35%] gap-4 lg:gap-6 -rotate-2 scale-[1.02] transform-gpu origin-center">
            
            {/* Top large image */}
            <div className="col-span-2 relative rounded-3xl overflow-hidden shadow-2xl group">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
              <img 
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80" 
                alt="Luxury property" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Floating Card */}
              <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/50 flex items-center gap-4 z-20">
                <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg shadow-blue-600/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-gray-900 text-lg">₦6.2M<span className="text-sm font-medium text-gray-500">/yr</span></div>
                  <div className="text-sm text-gray-600 font-medium tracking-tight">4 Bed • Lekki Phase 1</div>
                </div>
              </div>
            </div>

            {/* Bottom left */}
            <div className="rounded-3xl overflow-hidden shadow-xl mt-4 relative group">
              <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-transparent transition-colors z-10" />
              <img 
                src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80" 
                alt="Interior" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>

            {/* Bottom right */}
            <div className="rounded-3xl overflow-hidden shadow-xl -mt-4 relative group">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
              <img 
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80" 
                alt="Architecture" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}

export default Magazine;

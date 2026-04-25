'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, MapPin, Building2, BedDouble, Check, Hash } from 'lucide-react'
import { useRouter } from 'next/navigation'

const NIGERIAN_CITIES = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano',
  'Lekki, Lagos', 'Ikoyi, Lagos', 'Victoria Island, Lagos',
  'Ikeja, Lagos', 'Asokoro, Abuja', 'Maitama, Abuja'
]

const PROPERTY_TYPES = [
  'Studio Apartment', 'Apartment', 'Detached', 'Semi-Detached', 
  'Terrace', 'Land', 'Bungalow', 'Maisonette', 'Self Contained', 
  'Hostel', 'Penthouse'
]

const BED_OPTIONS = [
  { label: 'Any Size', value: '' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5+', value: '5' },
]

export default function HeroSearch() {
  const router = useRouter()
  const [tab, setTab] = useState<'Buy' | 'Rent' | 'Lease' | 'Commercial'>('Buy')
  const [location, setLocation] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [beds, setBeds] = useState('')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  const [activeDropdown, setActiveDropdown] = useState<'location' | 'type' | 'beds' | 'price' | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = () => {
    const params = new URLSearchParams()
    
    // DB mapping
    const dbType = tab.toLowerCase() === 'buy' ? 'sale' : tab.toLowerCase()
    params.append('type', dbType)
    
    if (location) params.append('city', location.split(',')[0])
    if (selectedTypes.length > 0) params.append('property_type', selectedTypes.join(','))
    if (beds) params.append('beds', beds)
    if (minPrice) params.append('min_price', minPrice.replace(/,/g, ''))
    if (maxPrice) params.append('max_price', maxPrice.replace(/,/g, ''))

    router.push(`/listings?${params.toString()}`)
  }

  const toggleType = (type: string) => {
    if (type === 'Any') {
      setSelectedTypes([])
      return
    }
    setSelectedTypes(prev => {
      if (prev.includes(type)) return prev.filter(t => t !== type)
      return [...prev, type]
    })
  }

  const formatNumber = (val: string) => {
    const num = val.replace(/\D/g, '')
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const filteredCities = NIGERIAN_CITIES.filter(city => city.toLowerCase().includes(location.toLowerCase()))

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-[2.5rem] p-3 md:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] text-left relative z-50">
      {/* Green Tabs (Updated to match the second screenshot) */}
      <div className="inline-flex bg-[#aadb5a] rounded-[2.5rem] p-1.5 mb-4 md:mb-6 shadow-sm overflow-x-auto max-w-full no-scrollbar border border-[#a2d354]">
        {(['Buy', 'Rent', 'Lease', 'Commercial'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 md:px-8 py-2.5 rounded-[2rem] text-[15px] md:text-[16px] font-bold transition-all whitespace-nowrap ${
              tab === t
                ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] text-[#0f172a]'
                : 'text-[#0f172a]/80 hover:bg-white/40'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3" ref={wrapperRef}>
        
        {/* Fields Container */}
        <div className="flex-1 flex flex-col md:flex-row bg-white border border-gray-200 rounded-[2rem] divide-y md:divide-y-0 md:divide-x divide-gray-200">
          
          {/* Location */}
          <div 
            className="flex-1 flex items-center gap-3 p-4 md:px-6 md:py-4 relative cursor-text group rounded-t-[2rem] md:rounded-none md:rounded-l-[2rem] hover:bg-gray-50/50 transition-colors"
            onClick={() => setActiveDropdown('location')}
          >
            <MapPin className="text-gray-400 w-5 h-5 shrink-0" strokeWidth={1.5} />
            <div className="flex flex-col flex-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Location</span>
              <input 
                type="text" 
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value)
                  setActiveDropdown('location')
                }}
                placeholder="Lagos, Abuja..." 
                className="w-full bg-transparent border-none p-0 text-[15px] font-semibold text-gray-900 focus:ring-0 placeholder:text-gray-800/60"
              />
            </div>
            
            {activeDropdown === 'location' && (
              <div className="absolute top-[105%] left-0 w-full md:w-[320px] bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] z-50 py-3 max-h-[300px] overflow-y-auto">
                <div className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white sticky top-0">Popular Destinations</div>
                {filteredCities.length > 0 ? filteredCities.map(city => (
                  <div 
                    key={city}
                    onClick={(e) => { e.stopPropagation(); setLocation(city); setActiveDropdown(null) }}
                    className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-[15px] font-medium text-gray-800">{city}</span>
                  </div>
                )) : (
                  <div className="px-5 py-4 text-sm font-medium text-gray-500 text-center">No locations found.</div>
                )}
              </div>
            )}
          </div>

          {/* Property Type Dropdown */}
          <div 
            className="flex-1 flex items-center gap-3 p-4 md:px-6 md:py-4 relative cursor-pointer hover:bg-gray-50/50 transition-colors group"
            onClick={() => setActiveDropdown('type')}
          >
            <Building2 className="text-gray-400 w-5 h-5 shrink-0" strokeWidth={1.5} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Property Type</span>
              <div className="text-[15px] font-semibold text-gray-900 truncate">
                {selectedTypes.length === 0 
                  ? 'Any Type' 
                  : selectedTypes.length === 1 
                    ? selectedTypes[0] 
                    : `${selectedTypes.length} Selected`}
              </div>
            </div>

            {activeDropdown === 'type' && (
              <div className="absolute top-[105%] left-0 w-full min-w-[280px] bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] z-50 p-5">
                <div className="text-lg font-bold text-gray-900 mb-1">Property Type</div>
                <div className="text-[13px] text-gray-500 font-medium mb-4">You can select multiple property types</div>
                
                <div className="max-h-[280px] overflow-y-auto flex flex-col gap-4 pr-2 custom-scrollbar">
                  <label className="flex items-center gap-3 cursor-pointer group/item">
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${selectedTypes.length === 0 ? 'bg-[#115E41] border-[#115E41]' : 'border-gray-300 group-hover/item:border-gray-400'}`}>
                      {selectedTypes.length === 0 && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-[15px] font-medium text-gray-700">Any</span>
                    <input type="checkbox" className="hidden" checked={selectedTypes.length === 0} onChange={() => toggleType('Any')} />
                  </label>
                  
                  {PROPERTY_TYPES.map(pt => (
                    <label key={pt} className="flex items-center gap-3 cursor-pointer group/item">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${selectedTypes.includes(pt) ? 'bg-[#115E41] border-[#115E41]' : 'border-gray-300 group-hover/item:border-gray-400'}`}>
                        {selectedTypes.includes(pt) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-[15px] font-medium text-gray-700">{pt}</span>
                      <input type="checkbox" className="hidden" checked={selectedTypes.includes(pt)} onChange={() => toggleType(pt)} />
                    </label>
                  ))}
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveDropdown(null) }} 
                  className="w-full bg-[#115E41] text-white font-bold py-3.5 rounded-xl mt-5 hover:bg-[#0e4d35] transition-colors shadow-md"
                >
                  Apply Filter
                </button>
              </div>
            )}
          </div>

          {/* Bedrooms */}
          <div 
            className="flex-1 flex items-center gap-3 p-4 md:px-6 md:py-4 relative cursor-pointer hover:bg-gray-50/50 transition-colors group"
            onClick={() => setActiveDropdown('beds')}
          >
            <BedDouble className="text-gray-400 w-5 h-5 shrink-0" strokeWidth={1.5} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Bedrooms</span>
              <div className="text-[15px] font-semibold text-gray-900 truncate">
                {BED_OPTIONS.find(b => b.value === beds)?.label || 'Any Size'}
              </div>
            </div>

            {activeDropdown === 'beds' && (
              <div className="absolute top-[105%] left-0 w-full min-w-[200px] bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] z-50 p-3">
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Select Beds</div>
                {BED_OPTIONS.map(b => (
                  <div 
                    key={b.value}
                    onClick={(e) => { e.stopPropagation(); setBeds(b.value); setActiveDropdown(null) }}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer rounded-xl flex items-center justify-between transition-colors"
                  >
                    <span className={`text-[15px] font-medium ${beds === b.value ? 'text-[#115E41] font-bold' : 'text-gray-700'}`}>{b.label}</span>
                    {beds === b.value && <Check className="w-4 h-4 text-[#115E41]" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Range */}
          <div 
            className="flex-1 flex items-center gap-3 p-4 md:px-6 md:py-4 relative cursor-pointer hover:bg-gray-50/50 transition-colors group rounded-b-[2rem] md:rounded-none md:rounded-r-[2rem]"
            onClick={() => setActiveDropdown('price')}
          >
            <Hash className="text-gray-400 w-5 h-5 shrink-0" strokeWidth={1.5} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Price Range</span>
              <div className="text-[15px] font-semibold text-gray-900 truncate">
                {minPrice || maxPrice ? `₦${minPrice || '0'} - ₦${maxPrice || 'Any'}` : 'Any Price'}
              </div>
            </div>

            {activeDropdown === 'price' && (
              <div className="absolute top-[105%] right-0 w-full md:w-[360px] bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] z-50 p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <div className="text-lg font-bold text-gray-900">Price</div>
                  <button 
                    onClick={() => { setMinPrice(''); setMaxPrice('') }} 
                    className="text-[#115E41] font-bold text-sm hover:text-[#0e4d35] transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {/* Range inputs */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 border border-gray-200 rounded-xl p-3 flex items-center focus-within:border-[#115E41] focus-within:ring-1 focus-within:ring-[#115E41] transition-all">
                    <span className="text-gray-500 font-bold mr-1">₦</span>
                    <input 
                      type="text" 
                      placeholder="0" 
                      className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-gray-900 font-semibold text-sm" 
                      value={minPrice} 
                      onChange={e => setMinPrice(formatNumber(e.target.value))} 
                    />
                  </div>
                  <span className="text-gray-300 font-bold">-</span>
                  <div className="flex-1 border border-gray-200 rounded-xl p-3 flex items-center focus-within:border-[#115E41] focus-within:ring-1 focus-within:ring-[#115E41] transition-all">
                    <span className="text-gray-500 font-bold mr-1">₦</span>
                    <input 
                      type="text" 
                      placeholder="500,000,000" 
                      className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-gray-900 font-semibold text-sm" 
                      value={maxPrice} 
                      onChange={e => setMaxPrice(formatNumber(e.target.value))} 
                    />
                  </div>
                </div>
                
                {/* Visual Fake Slider */}
                <div className="relative h-2 bg-gray-100 rounded-full my-6 mx-2">
                  <div className="absolute left-0 right-0 h-full bg-[#115E41] rounded-full"></div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-6 h-6 bg-white border-[3px] border-[#115E41] rounded-full shadow-md"></div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-6 h-6 bg-white border-[3px] border-[#115E41] rounded-full shadow-md"></div>
                </div>
                
                <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 mb-6 px-2">
                  <span>₦0</span>
                  <span>₦500,000,000+</span>
                </div>

                <button 
                  onClick={() => setActiveDropdown(null)} 
                  className="w-full bg-[#115E41] text-white font-bold py-3.5 rounded-xl hover:bg-[#0e4d35] transition-colors shadow-md"
                >
                  Apply Filter
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Search Button */}
        <button 
          onClick={handleSearch}
          className="w-full md:w-[72px] h-[64px] md:h-auto bg-black text-white rounded-[2rem] flex items-center justify-center shrink-0 hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(0,0,0,0.15)] mt-3 md:mt-0"
        >
          <Search className="w-6 h-6" strokeWidth={2.5} />
          <span className="md:hidden ml-2 font-bold text-lg">Search</span>
        </button>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E5E7EB;
          border-radius: 20px;
        }
      `}</style>
    </div>
  )
}

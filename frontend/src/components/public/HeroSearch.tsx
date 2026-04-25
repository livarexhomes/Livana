'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, MapPin, Building2, BedDouble } from 'lucide-react'
import { useRouter } from 'next/navigation'

const NIGERIAN_CITIES = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano',
  'Lekki, Lagos', 'Ikoyi, Lagos', 'Victoria Island, Lagos',
  'Ikeja, Lagos', 'Asokoro, Abuja', 'Maitama, Abuja'
]

const PROPERTY_TYPES = [
  { label: 'Any Type', value: '' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Detached Duplex', value: 'detached' },
  { label: 'Semi-Detached', value: 'semi-detached' },
  { label: 'Terrace', value: 'terrace' },
  { label: 'Land', value: 'land' },
  { label: 'Commercial', value: 'commercial' },
]

const BED_OPTIONS = [
  { label: 'Any Size', value: '' },
  { label: '1 Bedroom', value: '1' },
  { label: '2 Bedrooms', value: '2' },
  { label: '3 Bedrooms', value: '3' },
  { label: '4 Bedrooms', value: '4' },
  { label: '5+ Bedrooms', value: '5' },
]

export default function HeroSearch() {
  const router = useRouter()
  const [type, setType] = useState<'buy' | 'rent' | 'lease'>('buy')
  const [location, setLocation] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [beds, setBeds] = useState('')

  const [activeDropdown, setActiveDropdown] = useState<'location' | 'type' | 'beds' | null>(null)
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
    // Database type is 'sale' or 'rent'
    const dbType = type === 'buy' ? 'sale' : 'rent'
    params.append('type', dbType)
    if (location) params.append('city', location.split(',')[0]) // Optional: just take the city part for broader search
    if (propertyType) params.append('property_type', propertyType)
    if (beds) params.append('beds', beds)

    router.push(`/listings?${params.toString()}`)
  }

  const filteredCities = NIGERIAN_CITIES.filter(city => city.toLowerCase().includes(location.toLowerCase()))

  return (
    <div className="w-full bg-white rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] p-4 md:p-5 transition-all text-left">
      {/* Tabs */}
      <div className="inline-flex bg-[#F4F4F5] rounded-[1.25rem] p-1.5 mb-5 shadow-inner">
        {(['buy', 'rent', 'lease'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-8 py-2.5 rounded-xl text-[15px] font-bold transition-all capitalize ${
              type === t
                ? 'bg-white shadow-sm text-black'
                : 'text-gray-500 hover:text-black hover:bg-white/50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4" ref={wrapperRef}>
        {/* Input Wrapper */}
        <div className="flex-1 flex flex-col md:flex-row rounded-[1.5rem] border border-gray-100 bg-white divide-y md:divide-y-0 md:divide-x divide-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative">

          {/* Location */}
          <div 
            className="flex-1 flex items-center gap-4 p-4 md:px-6 md:py-5 relative cursor-text group"
            onClick={() => setActiveDropdown('location')}
          >
            <div className="w-10 h-10 rounded-full bg-[#F4F4F5] flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
              <MapPin className="text-gray-500 w-5 h-5" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.15em] mb-1">Location</span>
              <input 
                type="text" 
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value)
                  setActiveDropdown('location')
                }}
                placeholder="Lagos, Abuja..." 
                className="w-full bg-transparent border-none p-0 text-[15px] font-bold text-gray-900 focus:ring-0 placeholder:text-gray-400 placeholder:font-medium"
              />
            </div>
            
            {/* Location Dropdown */}
            {activeDropdown === 'location' && (
              <div className="absolute top-[110%] left-0 w-full md:w-[320px] bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 py-2 max-h-[260px] overflow-y-auto">
                <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white sticky top-0">Popular Destinations</div>
                {filteredCities.length > 0 ? filteredCities.map(city => (
                  <div 
                    key={city}
                    onClick={(e) => { e.stopPropagation(); setLocation(city); setActiveDropdown(null) }}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-[15px] font-semibold text-gray-800">{city}</span>
                  </div>
                )) : (
                  <div className="px-4 py-4 text-sm font-medium text-gray-500 text-center">No locations found.</div>
                )}
              </div>
            )}
          </div>

          {/* Property Type */}
          <div 
            className="flex-1 flex items-center gap-4 p-4 md:px-6 md:py-5 relative cursor-pointer hover:bg-gray-50/50 transition-colors group"
            onClick={() => setActiveDropdown('type')}
          >
            <div className="w-10 h-10 rounded-full bg-[#F4F4F5] flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
              <Building2 className="text-gray-500 w-5 h-5" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.15em] mb-1">Property Type</span>
              <div className="text-[15px] font-bold text-gray-900 truncate">
                {PROPERTY_TYPES.find(pt => pt.value === propertyType)?.label || 'Any Type'}
              </div>
            </div>

            {/* Property Type Dropdown */}
            {activeDropdown === 'type' && (
              <div className="absolute top-[110%] left-0 w-full bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 py-2">
                {PROPERTY_TYPES.map(pt => (
                  <div 
                    key={pt.value}
                    onClick={(e) => { e.stopPropagation(); setPropertyType(pt.value); setActiveDropdown(null) }}
                    className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className={`text-[15px] font-semibold ${propertyType === pt.value ? 'text-black' : 'text-gray-600'}`}>{pt.label}</span>
                    {propertyType === pt.value && <div className="w-2 h-2 rounded-full bg-black"></div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bedrooms */}
          <div 
            className="flex-1 flex items-center gap-4 p-4 md:px-6 md:py-5 relative cursor-pointer hover:bg-gray-50/50 transition-colors md:rounded-r-[1.5rem] group"
            onClick={() => setActiveDropdown('beds')}
          >
            <div className="w-10 h-10 rounded-full bg-[#F4F4F5] flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
              <BedDouble className="text-gray-500 w-5 h-5" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.15em] mb-1">Bedrooms</span>
              <div className="text-[15px] font-bold text-gray-900 truncate">
                {BED_OPTIONS.find(b => b.value === beds)?.label || 'Any Size'}
              </div>
            </div>

            {/* Beds Dropdown */}
            {activeDropdown === 'beds' && (
              <div className="absolute top-[110%] left-0 w-full bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 py-2">
                {BED_OPTIONS.map(b => (
                  <div 
                    key={b.value}
                    onClick={(e) => { e.stopPropagation(); setBeds(b.value); setActiveDropdown(null) }}
                    className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className={`text-[15px] font-semibold ${beds === b.value ? 'text-black' : 'text-gray-600'}`}>{b.label}</span>
                    {beds === b.value && <div className="w-2 h-2 rounded-full bg-black"></div>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Search Button */}
        <button 
          onClick={handleSearch}
          className="w-full md:w-[96px] min-h-[72px] md:h-auto bg-black text-white rounded-[1.5rem] flex items-center justify-center shrink-0 hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
        >
          <Search className="w-6 h-6 md:w-7 md:h-7" />
          <span className="md:hidden ml-2 font-bold">Search</span>
        </button>
      </div>
    </div>
  )
}

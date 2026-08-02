import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, MapPin, Navigation, CheckCircle, Loader2, ExternalLink, X,
} from 'lucide-react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { cn } from '@/lib/utils'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

export interface LocationResult {
  latitude: number
  longitude: number
  address: string
}

interface Props {
  /** Called whenever coordinates (and possibly a nicer address) resolve. */
  onLocation: (loc: LocationResult) => void
  /** Initial coordinates for edit mode. */
  initialLatitude?: number | null
  initialLongitude?: number | null
  /** Initial address text shown in the search box. */
  initialAddress?: string
}

interface GeocodeHit {
  lat: number
  lng: number
  displayName: string
}

// Parse a Google Maps URL for an explicit @lat,lng or ?q=lat,lng.
function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  const at = url.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)
  if (at) {
    const lat = Number(at[1])
    const lng = Number(at[2])
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
  }
  const q = url.match(/[?&]q=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/)
  if (q) {
    const lat = Number(q[1])
    const lng = Number(q[2])
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
  }
  return null
}

// Google Geocoding API
async function googleGeocode(query: string): Promise<GeocodeHit | null> {
  const params = new URLSearchParams({ address: query, key: GOOGLE_MAPS_API_KEY })
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`)
  if (!res.ok) return null
  const json = await res.json()
  if (json.status !== 'OK' || !json.results?.[0]) return null
  const r = json.results[0]
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    displayName: r.formatted_address ?? query,
  }
}

// OpenStreetMap Nominatim (free fallback)
async function nominatimGeocode(query: string): Promise<GeocodeHit | null> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    limit: '1',
    addressdetails: '1',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json', 'Accept-Language': 'en' },
  })
  if (!res.ok) return null
  const json = await res.json()
  if (!Array.isArray(json) || json.length === 0) return null
  const r = json[0]
  return {
    lat: Number(r.lat),
    lng: Number(r.lon),
    displayName: r.display_name ?? query,
  }
}

async function geocode(query: string): Promise<GeocodeHit | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  // Google Maps link → extract explicit coordinates when present
  if (/maps\.google\./i.test(trimmed) || /goo\.gl\/maps/i.test(trimmed)) {
    const coords = extractCoordsFromUrl(trimmed)
    if (coords) {
      return { lat: coords.lat, lng: coords.lng, displayName: trimmed }
    }
  }

  if (GOOGLE_MAPS_API_KEY) {
    const hit = await googleGeocode(trimmed)
    if (hit) return hit
  }
  return nominatimGeocode(trimmed)
}

export default function LocationField({
  onLocation,
  initialLatitude,
  initialLongitude,
  initialAddress,
}: Props) {
  const [address, setAddress] = useState(initialAddress ?? '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() =>
    initialLatitude != null && initialLongitude != null
      ? { lat: initialLatitude, lng: initialLongitude }
      : null,
  )
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [resolvedLabel, setResolvedLabel] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastEmittedRef = useRef<string>('')
  const coordsRef = useRef(coords)
  coordsRef.current = coords

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: 'livarex-location-field',
    ...(!GOOGLE_MAPS_API_KEY ? { language: 'en' as const } : {}),
  })

  const emit = useCallback((lat: number, lng: number, label: string) => {
    lastEmittedRef.current = label
    onLocation({ latitude: lat, longitude: lng, address: label })
  }, [onLocation])

  const applyHit = useCallback((hit: GeocodeHit) => {
    setCoords({ lat: hit.lat, lng: hit.lng })
    setError('')
    setResolvedLabel(hit.displayName)
    emit(hit.lat, hit.lng, hit.displayName)
  }, [emit])

  // Debounced address search
  const onAddressChange = (value: string) => {
    setAddress(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = value.trim()
    if (trimmed.length < 4) return
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setError('')
      try {
        const hit = await geocode(trimmed)
        if (hit) {
          applyHit(hit)
        } else {
          setError('Could not find that address. Try a more specific address or paste a Google Maps link.')
        }
      } catch {
        setError('Could not reach the location service. Please try again.')
      } finally {
        setSearching(false)
      }
    }, 600)
  }

  const searchNow = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = address.trim()
    if (!trimmed) { setError('Please enter an address.'); return }
    setSearching(true)
    setError('')
    try {
      const hit = await geocode(trimmed)
      if (hit) applyHit(hit)
      else setError('Could not find that address. Try a more specific address or paste a Google Maps link.')
    } catch {
      setError('Could not reach the location service. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        setResolvedLabel('Current location')
        emit(latitude, longitude, 'Current location')
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission was denied. Allow location access and try again, or search for an address.')
        } else {
          setError('Could not retrieve your location. Please try again or search for an address.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const clearLocation = () => {
    setCoords(null)
    setResolvedLabel('')
    setError('')
    onLocation({ latitude: 0, longitude: 0, address: '' })
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const mapsUrl = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
    : null

  return (
    <div className="space-y-3">
      {/* Address search */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
          <Search className="w-3.5 h-3.5 text-gray-400" /> Property Address *
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Type or paste a full address, e.g. 15 Admiralty Way, Lekki Phase 1, Lagos"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          <button
            type="button"
            onClick={searchNow}
            disabled={searching || !address.trim()}
            className="shrink-0 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Find</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          We'll find the address and pin it on the map automatically. You can also paste a Google Maps link.
        </p>
      </div>

      {/* Use current location */}
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={locating}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-colors disabled:opacity-60"
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Navigation className="w-4 h-4 text-blue-600" />}
        {locating ? 'Locating…' : 'Use Current Location'}
      </button>

      {/* Map preview */}
      {coords ? (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <div className="h-48 w-full">
            {GOOGLE_MAPS_API_KEY && isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={coords}
                zoom={15}
                options={{
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                }}
              >
                <Marker position={coords} />
              </GoogleMap>
            ) : (
              <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-2 text-gray-500">
                <MapPin className="w-7 h-7 text-blue-600" />
                <p className="text-sm font-medium">{resolvedLabel || address || 'Location pinned'}</p>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Open in Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-gray-100">
            <span className="text-xs text-gray-500 truncate flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {resolvedLabel || 'Location set'}
            </span>
            <button
              type="button"
              onClick={clearLocation}
              className="text-xs text-gray-400 hover:text-red-500 inline-flex items-center gap-1 transition-colors shrink-0"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center">
          <MapPin className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No location set yet — search an address or use your current location.</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

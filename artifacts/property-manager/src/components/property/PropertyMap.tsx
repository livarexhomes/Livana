import { useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import type { PropertyWithLandlord } from '@/types'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

const CITY_COORDS: Record<string, google.maps.LatLngLiteral> = {
  'Lagos':           { lat: 6.5244, lng: 3.3792 },
  'Ikeja':           { lat: 6.6018, lng: 3.3515 },
  'Lekki':           { lat: 6.4331, lng: 3.5852 },
  'Victoria Island': { lat: 6.4281, lng: 3.4219 },
  'VI':              { lat: 6.4281, lng: 3.4219 },
  'Ajah':            { lat: 6.4698, lng: 3.5852 },
  'Yaba':            { lat: 6.5144, lng: 3.3736 },
  'Surulere':        { lat: 6.4969, lng: 3.3483 },
  'Ikorodu':         { lat: 6.6194, lng: 3.5108 },
  'Badagry':         { lat: 6.4121, lng: 2.8890 },
  'Maryland':        { lat: 6.5524, lng: 3.3603 },
  'Magodo':          { lat: 6.6016, lng: 3.3962 },
  'Sangotedo':       { lat: 6.4488, lng: 3.6009 },
  'Ogun':            { lat: 7.1604, lng: 3.3483 },
  'Abeokuta':        { lat: 7.1558, lng: 3.3452 },
  'Sagamu':          { lat: 6.8333, lng: 3.6500 },
  'Ijebu-Ode':       { lat: 6.8190, lng: 3.9160 },
  'Mowe':            { lat: 6.9167, lng: 3.4167 },
  'Sango':           { lat: 6.8377, lng: 3.2505 },
}

function getCityCoords(city: string): google.maps.LatLngLiteral | null {
  if (!city) return null
  const key = Object.keys(CITY_COORDS).find(k =>
    city.toLowerCase().includes(k.toLowerCase())
  )
  return key ? CITY_COORDS[key] : null
}

function jitter(coords: google.maps.LatLngLiteral, index: number): google.maps.LatLngLiteral {
  const seed = index * 0.0007
  return {
    lat: coords.lat + Math.sin(seed * 13) * 0.003,
    lng: coords.lng + Math.cos(seed * 7) * 0.003,
  }
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (price >= 1_000) return `₦${(price / 1_000).toFixed(0)}K`
  return `₦${price}`
}

const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  zoomControlOptions: { position: 9 /* RIGHT_CENTER */ } as google.maps.ZoomControlOptions,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
}

interface Props {
  properties: PropertyWithLandlord[]
  hoveredId: string | null
  onMarkerClick: (id: string) => void
  height?: number | string
}

export default function PropertyMap({ properties, hoveredId, onMarkerClick, height = '100%' }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: 'livarex-google-map',
  })

  const mapRef = useRef<google.maps.Map | null>(null)

  const positioned = properties
    .map((p, i) => {
      const base = p.latitude && p.longitude
        ? { lat: p.latitude, lng: p.longitude }
        : getCityCoords(p.city)
      if (!base) return null
      return { p, coords: jitter(base, i) }
    })
    .filter(Boolean) as { p: PropertyWithLandlord; coords: google.maps.LatLngLiteral }[]

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    if (positioned.length === 0) return
    if (positioned.length === 1) {
      map.setCenter(positioned[0].coords)
      map.setZoom(14)
      return
    }
    const bounds = new window.google.maps.LatLngBounds()
    positioned.forEach(({ coords }) => bounds.extend(coords))
    map.fitBounds(bounds, 40)
  }, [positioned.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) {
    return (
      <div
        style={{ width: '100%', height }}
        className="bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm"
      >
        Map unavailable
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div style={{ width: '100%', height }} className="bg-gray-100 animate-pulse rounded-xl" />
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={{ lat: 6.5244, lng: 3.3792 }}
        zoom={10}
        onLoad={onLoad}
        options={MAP_OPTIONS}
      >
        {positioned.map(({ p, coords }) => (
          <OverlayView
            key={p.id}
            position={coords}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h - 6 })}
          >
            <div
              onClick={() => onMarkerClick(p.id)}
              style={{
                background: hoveredId === p.id ? '#16a34a' : '#1e293b',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,.3)',
                border: '2px solid #fff',
                cursor: 'pointer',
                transition: 'background 0.15s',
                userSelect: 'none',
              }}
            >
              {formatPrice(p.price)}
            </div>
          </OverlayView>
        ))}
      </GoogleMap>
    </div>
  )
}

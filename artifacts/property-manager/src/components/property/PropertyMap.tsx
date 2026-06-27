import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { PropertyWithLandlord } from '@/types'

// Fix default marker icons broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (price >= 1_000) return `₦${(price / 1_000).toFixed(0)}K`
  return `₦${price}`
}

function makePriceIcon(price: number, highlighted: boolean) {
  const label = formatPrice(price)
  const bg = highlighted ? '#16a34a' : '#1e293b'
  const html = `
    <div style="
      background:${bg};
      color:#fff;
      padding:4px 9px;
      border-radius:20px;
      font-size:12px;
      font-weight:700;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
      border:2px solid #fff;
      cursor:pointer;
      transition:transform .15s;
    ">${label}</div>`
  return L.divIcon({ html, className: '', iconAnchor: [0, 0] })
}

const CITY_COORDS: Record<string, [number, number]> = {
  'Lagos': [6.5244, 3.3792],
  'Ikeja': [6.6018, 3.3515],
  'Lekki': [6.4331, 3.5852],
  'Victoria Island': [6.4281, 3.4219],
  'Ajah': [6.4698, 3.5852],
  'Yaba': [6.5144, 3.3736],
  'Surulere': [6.4969, 3.3483],
  'Ikorodu': [6.6194, 3.5108],
  'Badagry': [6.4121, 2.8890],
  'Ogun': [7.1604, 3.3483],
  'Abeokuta': [7.1558, 3.3452],
  'Sagamu': [6.8333, 3.6500],
  'Ijebu-Ode': [6.8190, 3.9160],
  'Mowe': [6.9167, 3.4167],
}

function getCityCoords(city: string): [number, number] | null {
  if (!city) return null
  const key = Object.keys(CITY_COORDS).find(k => city.toLowerCase().includes(k.toLowerCase()))
  return key ? CITY_COORDS[key] : null
}

function jitter(coords: [number, number], index: number): [number, number] {
  const seed = index * 0.0007
  return [coords[0] + Math.sin(seed * 13) * 0.003, coords[1] + Math.cos(seed * 7) * 0.003]
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length === 0) return
    if (coords.length === 1) { map.setView(coords[0], 14); return }
    const lats = coords.map(c => c[0])
    const lngs = coords.map(c => c[1])
    map.fitBounds([
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ], { padding: [40, 40], maxZoom: 15 })
  }, [coords.length])
  return null
}

interface Props {
  properties: PropertyWithLandlord[]
  hoveredId: string | null
  onMarkerClick: (id: string) => void
  height?: number | string
}

export default function PropertyMap({ properties, hoveredId, onMarkerClick, height = '100%' }: Props) {
  const positioned = properties
    .map((p, i) => {
      const coords = getCityCoords(p.city)
      if (!coords) return null
      return { p, coords: jitter(coords, i) }
    })
    .filter(Boolean) as { p: PropertyWithLandlord; coords: [number, number] }[]

  const allCoords = positioned.map(x => x.coords)
  const defaultCenter: [number, number] = [6.5244, 3.3792]

  return (
    <div style={{ width: '100%', height }}>
      <MapContainer
        center={defaultCenter}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds coords={allCoords} />
        {positioned.map(({ p, coords }) => (
          <Marker
            key={`${p.id}-${hoveredId === p.id}`}
            position={coords}
            icon={makePriceIcon(p.price, hoveredId === p.id)}
            eventHandlers={{ click: () => onMarkerClick(p.id) }}
          >
            <Popup>
              <div className="text-sm font-semibold">{p.title}</div>
              <div className="text-xs text-gray-500">{p.city}</div>
              <div className="text-sm font-bold text-green-700 mt-1">
                ₦{Number(p.price).toLocaleString()}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

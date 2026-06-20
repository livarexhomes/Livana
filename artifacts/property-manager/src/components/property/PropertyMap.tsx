import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
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
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      border:2px solid #fff;
      transform:translateX(-50%);
      position:relative;
    ">
      ${label}
      <div style="
        position:absolute;
        bottom:-7px;
        left:50%;
        transform:translateX(-50%);
        width:0;height:0;
        border-left:6px solid transparent;
        border-right:6px solid transparent;
        border-top:7px solid ${bg};
      "></div>
    </div>`
  return L.divIcon({ html, className: '', iconAnchor: [0, 36] })
}

// Nigerian city → approximate lat/lng
const CITY_COORDS: Record<string, [number, number]> = {
  lagos: [6.5244, 3.3792],
  abuja: [9.0579, 7.4951],
  'port harcourt': [4.8156, 7.0498],
  kano: [12.0022, 8.5920],
  ibadan: [7.3775, 3.9470],
  benin: [6.3350, 5.6270],
  warri: [5.5167, 5.7500],
  enugu: [6.4584, 7.5464],
  kaduna: [10.5222, 7.4383],
  onitsha: [6.1667, 6.7833],
  aba: [5.1066, 7.3667],
  jos: [9.8965, 8.8583],
  ilorin: [8.4966, 4.5426],
  maiduguri: [11.8333, 13.1500],
  zaria: [11.0667, 7.7000],
}

function getCityCoords(city: string): [number, number] | null {
  const key = city.toLowerCase()
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (key.includes(k)) return v
  }
  return null
}

// Scatter markers slightly so they don't stack
function jitter(coord: [number, number], index: number): [number, number] {
  const angle = (index * 137.5 * Math.PI) / 180
  const radius = 0.008 + (index % 4) * 0.004
  return [coord[0] + Math.sin(angle) * radius, coord[1] + Math.cos(angle) * radius]
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length === 0) return
    if (coords.length === 1) {
      map.setView(coords[0], 13)
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 14 })
    }
  }, [coords.length])
  return null
}

interface Props {
  properties: PropertyWithLandlord[]
  hoveredId: string | null
  onMarkerClick: (id: string) => void
}

export default function PropertyMap({ properties, hoveredId, onMarkerClick }: Props) {
  // Build positioned properties
  const positioned = properties
    .map((p, i) => {
      const coords = getCityCoords(p.city)
      if (!coords) return null
      return { p, coords: jitter(coords, i) }
    })
    .filter(Boolean) as { p: PropertyWithLandlord; coords: [number, number] }[]

  const allCoords = positioned.map(x => x.coords)
  const defaultCenter: [number, number] = [6.5244, 3.3792] // Lagos

  return (
    <MapContainer
      center={defaultCenter}
      zoom={10}
      className="w-full h-full"
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
  )
}

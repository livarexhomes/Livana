import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeControl: false,
  streetViewControl: true,
  fullscreenControl: false,
  scrollwheel: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
}

interface Props {
  lat: number
  lng: number
  title: string
}

export default function PropertyDetailMap({ lat, lng, title }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: 'livarex-google-map',
  })

  const center = { lat, lng }

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        Map unavailable
      </div>
    )
  }

  if (!isLoaded) {
    return <div className="w-full h-full bg-gray-100 animate-pulse" />
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center}
      zoom={15}
      options={MAP_OPTIONS}
    >
      <Marker
        position={center}
        title={title}
      />
    </GoogleMap>
  )
}

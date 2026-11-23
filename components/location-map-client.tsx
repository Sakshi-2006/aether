'use client'

import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'

type MapPlace = {
  name: string
  country: string
  latitude: number
  longitude: number
}

function FitLocations({ places }: { places: MapPlace[] }) {
  const map = useMap()
  const bounds = useMemo(() => places.map((place) => [place.latitude, place.longitude] as [number, number]), [places])

  useEffect(() => {
    if (bounds.length === 1) map.setView(bounds[0], 5)
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 4 })
  }, [bounds, map])

  return null
}

export default function LocationMapClient({ center, selectedName, places }: { center: [number, number]; selectedName: string; places: MapPlace[] }) {
  return (
    <MapContainer center={center} zoom={4} scrollWheelZoom={false} className="weather-map">
      <FitLocations places={places} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => {
        const isSelected = place.name === selectedName
        return (
          <CircleMarker
            key={`${place.name}-${place.latitude}-${place.longitude}`}
            center={[place.latitude, place.longitude]}
            radius={isSelected ? 9 : 6}
            pathOptions={{ color: isSelected ? '#176b49' : '#ffffff', weight: 3, fillColor: isSelected ? '#55a67a' : '#8ba994', fillOpacity: 1 }}
          >
            <Popup>{place.name}{place.country ? `, ${place.country}` : ''}</Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

'use client'

import dynamic from 'next/dynamic'

type MapPlace = {
  name: string
  country: string
  latitude: number
  longitude: number
}

const LocationMapClient = dynamic(() => import('./location-map-client'), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Loading location map…</div>,
})

export function LocationMap({ selected, saved }: { selected: MapPlace; saved: MapPlace[] }) {
  const places = [selected, ...saved.filter((place) => place.name !== selected.name)]

  return (
    <div className="map-frame" role="region" aria-label={`Map showing ${selected.name} and saved locations`}>
      <LocationMapClient center={[selected.latitude, selected.longitude]} selectedName={selected.name} places={places} />
    </div>
  )
}

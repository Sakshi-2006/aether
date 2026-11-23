import { NextRequest, NextResponse } from 'next/server'

const forecastEndpoint = 'https://api.open-meteo.com/v1/forecast'
const geocodingEndpoint = 'https://geocoding-api.open-meteo.com/v1/search'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const city = params.get('city')
  const latitude = params.get('latitude')
  const longitude = params.get('longitude')
  let lat = latitude
  let lon = longitude
  let place = city || params.get('name') || 'Weather location'
  let country = params.get('country') || ''
  let timezone = 'auto'

  try {
    if (city) {
      const geocode = await fetch(`${geocodingEndpoint}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`, { next: { revalidate: 86400 } })
      if (!geocode.ok) throw new Error('Location search is temporarily unavailable.')
      const result = await geocode.json()
      const match = result.results?.[0]
      if (!match) return NextResponse.json({ error: `We couldn't find “${city}”. Try a nearby city name.` }, { status: 404 })
      lat = String(match.latitude)
      lon = String(match.longitude)
      place = match.name
      country = match.country || ''
      timezone = match.timezone || 'auto'
    }

    if (!lat || !lon || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
      return NextResponse.json({ error: 'A valid city or coordinates are required.' }, { status: 400 })
    }

    const query = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,precipitation_probability,precipitation,relative_humidity_2m,wind_speed_10m,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      precipitation_unit: 'mm',
      timezone,
      forecast_days: '7',
    })
    const response = await fetch(`${forecastEndpoint}?${query}`, { next: { revalidate: 900 } })
    if (!response.ok) throw new Error('The forecast provider returned an error. Please try again shortly.')
    const weather = await response.json()
    return NextResponse.json({ ...weather, location: { name: place, country, latitude: Number(lat), longitude: Number(lon), timezone: weather.timezone || timezone } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load weather right now.' }, { status: 502 })
  }
}

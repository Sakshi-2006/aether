'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowDown, ArrowUp, Bell, CalendarDays, ChevronDown, Cloud, CloudDrizzle, CloudRain, CloudSun, Download, Droplets, LocateFixed, MapPin, Menu, Moon, Search, Sun, Wind, X } from 'lucide-react'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

type WeatherData = {
  current: { time: string; temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; is_day: number; precipitation: number; weather_code: number; wind_speed_10m: number; wind_direction_10m: number }
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; precipitation: number[]; relative_humidity_2m: number[]; wind_speed_10m: number[]; weather_code: number[] }
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; precipitation_sum: number[]; sunrise: string[]; sunset: string[]; uv_index_max: number[] }
  location: { name: string; country: string; latitude: number; longitude: number; timezone: string }
}

type Alert = { title: string; detail: string; level: 'High' | 'Moderate' | 'Low'; icon: typeof CloudRain }

const chartConfig = { temperature: { label: 'Temperature', color: 'var(--chart-1)' }, rain: { label: 'Rain chance', color: 'var(--chart-2)' } } satisfies ChartConfig
const starterPlaces = [
  { name: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 },
  { name: 'London', country: 'United Kingdom', latitude: 51.5072, longitude: -0.1276 },
  { name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
]

function weatherLabel(code: number) {
  if (code === 0) return 'Clear sky'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  if (code >= 95) return 'Thunderstorm'
  return 'Cloudy'
}

function WeatherIcon({ code, className = '' }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} aria-hidden="true" />
  if (code <= 2) return <CloudSun className={className} aria-hidden="true" />
  if (code >= 51 && code <= 82) return <CloudRain className={className} aria-hidden="true" />
  if (code >= 95) return <CloudDrizzle className={className} aria-hidden="true" />
  return <Cloud className={className} aria-hidden="true" />
}

function localTime(value: string, timezone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en', { ...options, timeZone: timezone }).format(new Date(value))
}

function windDirection(degrees: number) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8]
}

function buildAlerts(weather: WeatherData): Alert[] {
  const alerts: Alert[] = []
  const next12Rain = Math.max(...weather.hourly.precipitation_probability.slice(0, 12))
  const todayHigh = weather.daily.temperature_2m_max[0] ?? weather.current.temperature_2m
  const maxWind = Math.max(...weather.hourly.wind_speed_10m.slice(0, 24))
  const humidity = weather.current.relative_humidity_2m
  if (next12Rain >= 60) alerts.push({ title: 'Rain expected soon', detail: `${next12Rain}% chance of precipitation in the next 12 hours.`, level: next12Rain >= 80 ? 'High' : 'Moderate', icon: CloudRain })
  if (todayHigh >= 35) alerts.push({ title: 'High temperature', detail: `Today's forecast reaches ${Math.round(todayHigh)}°C. Stay hydrated outdoors.`, level: todayHigh >= 40 ? 'High' : 'Moderate', icon: Sun })
  if (maxWind >= 45) alerts.push({ title: 'Strong winds', detail: `Winds may reach ${Math.round(maxWind)} km/h in the next 24 hours.`, level: maxWind >= 65 ? 'High' : 'Moderate', icon: Wind })
  if (humidity >= 85) alerts.push({ title: 'High humidity', detail: `Humidity is ${humidity}% right now.`, level: 'Low', icon: Droplets })
  if (alerts.length === 0) alerts.push({ title: 'No active weather alerts', detail: 'Conditions look favorable for the next 24 hours.', level: 'Low', icon: Sun })
  return alerts
}

export function WeatherDashboard() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [selected, setSelected] = useState(starterPlaces[0])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unit, setUnit] = useState<'C' | 'F'>('C')
  const [mobileMenu, setMobileMenu] = useState(false)

  const loadWeather = useCallback(async (place: typeof starterPlaces[number], byName = false) => {
    setLoading(true)
    setError('')
    try {
      const params = byName ? `city=${encodeURIComponent(place.name)}` : `latitude=${place.latitude}&longitude=${place.longitude}`
      const response = await fetch(`/api/weather?${params}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Weather is temporarily unavailable.')
      setWeather(result)
      setSelected(result.location)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to load weather.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadWeather(starterPlaces[0]) }, [loadWeather])

  const alerts = useMemo(() => weather ? buildAlerts(weather) : [], [weather])
  const hourlyChart = useMemo(() => {
    if (!weather) return []
    const now = Date.now()
    return weather.hourly.time.map((time, index) => ({ time, temperature: weather.hourly.temperature_2m[index], rain: weather.hourly.precipitation_probability[index] })).filter((item) => new Date(item.time).getTime() >= now).slice(0, 24).filter((_, index) => index % 2 === 0).map((item) => ({ ...item, label: localTime(item.time, weather.location.timezone, { hour: 'numeric' }) }))
  }, [weather])

  const displayTemp = (value: number) => `${Math.round(unit === 'C' ? value : value * 9 / 5 + 32)}°`
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!query.trim() || event.nativeEvent instanceof SubmitEvent && (event.nativeEvent as SubmitEvent & { isComposing?: boolean }).isComposing) return
    void loadWeather({ name: query.trim(), country: '', latitude: 0, longitude: 0 }, true)
    setQuery('')
  }

  const exportReport = () => {
    if (!weather) return
    const rows = [['date', 'temperature_high_c', 'temperature_low_c', 'rain_chance_percent', 'precipitation_mm', 'uv_index'], ...weather.daily.time.map((date, index) => [date, weather.daily.temperature_2m_max[index], weather.daily.temperature_2m_min[index], weather.daily.precipitation_probability_max[index], weather.daily.precipitation_sum[index], weather.daily.uv_index_max[index]])]
    const csv = rows.map((row) => row.join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = `weather-${weather.location.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <main className="weather-app">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" aria-label="Atmos home"><span className="brand-mark"><CloudSun size={21} /></span><span>atmos<span className="brand-dot">.</span></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#overview"><Activity size={17} /> Overview</a>
          <a className="nav-link" href="#forecast"><CalendarDays size={17} /> 7-day forecast</a>
          <a className="nav-link" href="#alerts"><Bell size={17} /> Alerts <span className="nav-count">{alerts.filter((alert) => alert.level !== 'Low').length}</span></a>
        </nav>
        <div className="sidebar-section"><div className="workspace-label">SAVED LOCATIONS</div>
          {starterPlaces.map((place) => <button className={`location-link ${selected.name === place.name ? 'location-active' : ''}`} key={place.name} onClick={() => { void loadWeather(place); setMobileMenu(false) }}><span className="location-pin"><MapPin size={14} /></span><span>{place.name}<small>{place.country}</small></span>{selected.name === place.name && <span className="location-dot" />}</button>)}
        </div>
        <div className="sidebar-bottom"><div className="data-note"><span className="live-dot" /> Live weather data <span>Open-Meteo</span></div><div className="profile"><div className="avatar">W</div><div><strong>Weather workspace</strong><small>Student edition</small></div><ChevronDown size={15} /></div></div>
      </aside>

      <section className="main-area">
        <header className="topbar"><button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X size={19} /> : <Menu size={19} />}</button><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="top-actions"><form className="search-box" onSubmit={handleSearch}><Search size={16} /><input aria-label="Search a city" placeholder="Search any city..." value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }} /><kbd>Enter</kbd></form><span className="top-divider" /><button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="top-avatar">W</div></div></header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> WEATHER OVERVIEW <span className="eyebrow-divider">/</span> {weather ? localTime(new Date().toISOString(), weather.location.timezone, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase() : 'TODAY'}</div><h1>Good morning<span className="heading-period">.</span></h1><p className="heading-subtitle">Here&apos;s what&apos;s happening with the weather today.</p></div><button className="export-button" onClick={exportReport} disabled={!weather}><Download size={16} /> Export report</button></div>
          {error && <div className="error-banner" role="alert">{error}<button onClick={() => void loadWeather(selected)}>Try again</button></div>}
          <section className="hero-weather" aria-label="Current weather">
            <div className="hero-main"><div className="hero-location"><MapPin size={15} /> {weather?.location.name || selected.name}, {weather?.location.country || selected.country}<button aria-label="Use selected saved location" onClick={() => void loadWeather(selected)}><LocateFixed size={14} /></button></div><div className="current-weather"><div className="temperature">{weather ? displayTemp(weather.current.temperature_2m) : '--°'}<button className="unit-toggle" onClick={() => setUnit(unit === 'C' ? 'F' : 'C')} aria-label="Toggle temperature unit">°{unit}<ChevronDown size={13} /></button></div><div className="condition"><WeatherIcon code={weather?.current.weather_code ?? 2} className="condition-icon" /><div><strong>{weather ? weatherLabel(weather.current.weather_code) : 'Loading forecast'}</strong><span>Feels like {weather ? displayTemp(weather.current.apparent_temperature) : '--°'}</span></div></div></div><div className="hero-meta"><span><ArrowUp size={14} /> {weather ? displayTemp(weather.daily.temperature_2m_max[0]) : '--°'} <small>High</small></span><span><ArrowDown size={14} /> {weather ? displayTemp(weather.daily.temperature_2m_min[0]) : '--°'} <small>Low</small></span><span className="hero-coordinates"><MapPin size={13} /> {weather ? `${weather.location.latitude.toFixed(2)}°, ${weather.location.longitude.toFixed(2)}°` : '—'}</span></div></div>
            <div className="hero-sun"><div className="sun-glow" /><Sun className="hero-sun-icon" size={93} strokeWidth={1.15} /><div className="sun-orbit orbit-one" /><div className="sun-orbit orbit-two" /><span className="sun-caption">{weather?.current.is_day ? 'DAYLIGHT' : 'NIGHT SKY'} <strong>{weather ? localTime(new Date().toISOString(), weather.location.timezone, { hour: 'numeric', minute: '2-digit' }) : '--:--'}</strong></span><div className="sun-times"><span><Sun size={14} /> Sunrise <strong>{weather ? localTime(weather.daily.sunrise[0], weather.location.timezone, { hour: 'numeric', minute: '2-digit' }) : '--'}</strong></span><span><Moon size={14} /> Sunset <strong>{weather ? localTime(weather.daily.sunset[0], weather.location.timezone, { hour: 'numeric', minute: '2-digit' }) : '--'}</strong></span></div></div>
          </section>

          <section className="metrics-grid" aria-label="Current conditions"><Metric icon={<Droplets />} label="Humidity" value={weather ? `${weather.current.relative_humidity_2m}%` : '--'} hint="Relative humidity" progress={weather?.current.relative_humidity_2m ?? 0} tone="blue" /><Metric icon={<Wind />} label="Wind speed" value={weather ? `${Math.round(weather.current.wind_speed_10m)} km/h` : '--'} hint={weather ? `From the ${windDirection(weather.current.wind_direction_10m)}` : 'Current direction'} progress={Math.min((weather?.current.wind_speed_10m ?? 0) * 2, 100)} tone="green" /><Metric icon={<CloudRain />} label="Precipitation" value={weather ? `${weather.current.precipitation} mm` : '--'} hint="Rain expected today" progress={weather?.daily.precipitation_probability_max[0] ?? 0} tone="orange" /><Metric icon={<Sun />} label="UV index" value={weather ? `${weather.daily.uv_index_max[0]}` : '--'} hint={weather ? weather.daily.uv_index_max[0] >= 6 ? 'High exposure' : 'Low exposure' : 'Today'} progress={Math.min((weather?.daily.uv_index_max[0] ?? 0) * 10, 100)} tone="purple" /></section>

          <div className="section-heading" id="forecast"><div><h2>Today&apos;s forecast</h2><p>Temperature and precipitation over the next 24 hours</p></div><div className="chart-legend"><span><i className="legend-temp" /> Temperature</span><span><i className="legend-rain" /> Rain chance</span></div></div>
          <section className="forecast-panel"><div className="chart-wrap">{!weather && loading ? <div className="chart-loading">Loading hourly forecast…</div> : <ChartContainer config={chartConfig} className="h-[220px] w-full"><AreaChart accessibilityLayer data={hourlyChart} margin={{ top: 15, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="temp-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-temperature)" stopOpacity={0.2} /><stop offset="95%" stopColor="var(--color-temperature)" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e8ece9" /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12} interval={2} tick={{ fill: '#919b96', fontSize: 11 }} /><YAxis yAxisId="temp" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${Math.round(unit === 'C' ? value : value * 9 / 5 + 32)}°`} tick={{ fill: '#919b96', fontSize: 11 }} /><YAxis yAxisId="rain" orientation="right" domain={[0, 100]} hide /><Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e8ece9', boxShadow: '0 8px 24px #12251b12' }} labelStyle={{ color: '#59665e', fontWeight: 600 }} formatter={(value, name) => [name === 'temperature' ? `${displayTemp(Number(value))}°${unit}` : `${value}%`, name === 'temperature' ? 'Temperature' : 'Rain chance']} /><Area yAxisId="rain" type="monotone" dataKey="rain" stroke="var(--color-rain)" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} /><Area yAxisId="temp" type="monotone" dataKey="temperature" stroke="var(--color-temperature)" strokeWidth={3} fill="url(#temp-fill)" dot={false} activeDot={{ r: 5, fill: '#4c9b75', stroke: '#fff', strokeWidth: 3 }} /></AreaChart></ChartContainer>}</div><div className="hourly-strip">{weather && hourlyChart.filter((_, index) => index % 3 === 0).slice(0, 8).map((hour) => <div className="hour-item" key={hour.time}><span>{localTime(hour.time, weather.location.timezone, { hour: 'numeric' })}</span><WeatherIcon code={weather.hourly.weather_code[weather.hourly.time.indexOf(hour.time)] ?? 2} /><strong>{displayTemp(hour.temperature)}</strong><small><Droplets size={11} /> {hour.rain}%</small></div>)}</div></section>

          <div className="lower-grid"><section className="weekly-section" id="weekly"><div className="section-heading compact"><div><h2>7-day outlook</h2><p>A look at the week ahead</p></div><button className="text-link" onClick={exportReport}>View report <Download size={14} /></button></div><div className="week-panel">{weather?.daily.time.map((date, index) => <div className="day-row" key={date}><span className="day-name">{index === 0 ? 'Today' : localTime(`${date}T12:00:00`, weather.location.timezone, { weekday: 'short' })}</span><span className="day-date">{localTime(`${date}T12:00:00`, weather.location.timezone, { month: 'short', day: 'numeric' })}</span><WeatherIcon code={weather.daily.weather_code[index]} /><span className="day-condition">{weatherLabel(weather.daily.weather_code[index])}</span><span className="day-rain"><Droplets size={12} /> {weather.daily.precipitation_probability_max[index]}%</span><div className="temp-range"><span>{displayTemp(weather.daily.temperature_2m_min[index])}</span><i><b style={{ left: `${Math.max(0, Math.min(78, (weather.daily.temperature_2m_min[index] + 5) * 2))}%`, width: `${Math.max(18, Math.min(92, (weather.daily.temperature_2m_max[index] - weather.daily.temperature_2m_min[index]) * 3))}%` }} /></i><strong>{displayTemp(weather.daily.temperature_2m_max[index])}</strong></div></div>) || <div className="week-empty">{loading ? 'Loading 7-day forecast…' : 'Forecast unavailable'}</div>}</div></section>
            <section className="alerts-section" id="alerts"><div className="section-heading compact"><div><h2>Weather alerts <span className="alert-total">{alerts.filter((item) => item.level !== 'Low').length}</span></h2><p>Conditions to keep an eye on</p></div><button className="icon-button alert-settings" aria-label="Alert settings"><Bell size={16} /></button></div><div className="alert-list">{alerts.map((alert) => { const Icon = alert.icon; return <article className={`alert-card alert-${alert.level.toLowerCase()}`} key={alert.title}><div className="alert-icon"><Icon size={17} /></div><div className="alert-copy"><div className="alert-title-line"><strong>{alert.title}</strong><span>{alert.level}</span></div><p>{alert.detail}</p></div></article> })}</div><div className="alert-footnote"><span className="live-dot" /> Updated just now <button onClick={() => void loadWeather(selected)}>Refresh</button></div></section></div>
          <footer className="footer"><span>Forecast data by <strong>Open-Meteo</strong> · Free weather API</span><span>{weather ? `Updated ${localTime(weather.current.time || new Date().toISOString(), weather.location.timezone, { hour: 'numeric', minute: '2-digit' })}` : 'Connecting to forecast…'} <button onClick={() => void loadWeather(selected)} aria-label="Refresh weather data"><Activity size={13} /></button></span></footer>
        </div>
      </section>
      {mobileMenu && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    </main>
  )
}

function Metric({ icon, label, value, hint, progress, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; progress: number; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-hint">{hint}</div><div className="metric-progress"><i className={tone} style={{ width: `${Math.max(4, Math.min(progress, 100))}%` }} /></div></article>
}

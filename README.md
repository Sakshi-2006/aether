# Aether Weather Dashboard

Aether is a responsive weather forecast dashboard for searching locations, reviewing current conditions, exploring hourly and seven-day forecasts, and exporting forecast data. It uses live data from Open-Meteo and requires no API key.

**Live app:** [https://aether-webss.vercel.app](https://aether-webss.vercel.app)

## Features

- Search weather by city name or coordinates
- View current temperature, apparent temperature, humidity, wind, precipitation, sunrise, and sunset
- Explore a 24-hour temperature and rain-chance chart
- Review a seven-day weather outlook
- Receive rule-based rain, heat, wind, and humidity alerts
- Switch between Celsius and Fahrenheit
- Export the daily forecast as a CSV file
- Responsive desktop and mobile interface

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS and custom CSS
- Recharts for forecast charts
- Lucide React for icons
- FastAPI and Python for the optional backend API
- Pydantic, httpx, and SQLite
- Open-Meteo geocoding and forecast services

## Project Structure

```text
app/
  api/weather/route.ts       Next.js server-side weather proxy
  layout.tsx                 Root layout and metadata
  page.tsx                   Application entry page
  globals.css                Global styles
components/
  weather-dashboard.tsx      Main dashboard, charts, alerts, and CSV export
  ui/                        Reusable shadcn-style UI components
lib/
  utils.ts                   Shared utilities
backend/
  main.py                    Standalone FastAPI implementation
  requirements.txt           Python dependencies
  tests/                     Backend test fixtures and checks
public/                      Static assets
```

## How It Works

The dashboard sends a city name or coordinates to `/api/weather`. The Next.js route geocodes city names with Open-Meteo, requests current, hourly, and seven-day forecast fields, and returns a normalized JSON response. The React dashboard renders that response through cards, charts, alerts, and the weekly forecast view.

An independent FastAPI service provides the same weather functionality with Pydantic validation, CORS configuration, and a short-lived SQLite forecast cache.

## Run Locally

### Frontend

Requirements: Node.js 20.9 or later and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

### Optional Python API

Requirements: Python 3.10 or later.

```bash
python -m venv .venv
```

Activate the environment:

```bash
# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install dependencies and start the API:

```bash
python -m pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```

Useful API endpoints:

```text
http://localhost:8000/health
http://localhost:8000/docs
http://localhost:8000/api/weather?city=Delhi
http://localhost:8000/api/weather?latitude=28.61&longitude=77.20
```

No API key is required by default.

## Configuration

The optional backend supports environment variables:

```dotenv
WEATHER_DATABASE=weather_cache.sqlite3
WEATHER_CACHE_SECONDS=900
CORS_ORIGINS=http://localhost:3000
```

Copy `backend/.env.example` to `backend/.env` only if local overrides are needed.

## API Data

Aether uses the Open-Meteo forecast and geocoding APIs. Data is requested in Celsius, km/h, and millimeters. The application derives rain, heat, wind, and humidity notices locally; these are planning aids, not official severe-weather warnings.

## Safety and Limitations

- Forecast availability depends on Open-Meteo and network access.
- Weather alerts use demonstration thresholds and are not official safety guidance.
- The default setup has no login or persistent user profiles.
- The backend cache expires after 15 minutes by default.
- Check local meteorological authorities for official warnings.

## License

No license is currently specified. A license should be added before public redistribution or commercial use.

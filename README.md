# Weather Forecast & Alert Application

A GitHub-ready student project that combines a live weather dashboard with a small Python API. Search a city, inspect current conditions and the next 24 hours, compare a seven-day forecast, review threshold-based alerts, and export daily forecast data as CSV.

> Weather is sourced from [Open-Meteo](https://open-meteo.com/), a public forecast provider. No API key is required. The web app has a Next.js API route; a standalone FastAPI implementation is included in `backend/` as the Python course deliverable.

## Project overview

**Simple explanation:** Enter a city and Atmos fetches its forecast, summarizes the conditions, and points out practical risks such as heavy rain, heat, or high wind. You can use the forecast to plan a trip, an outdoor event, farm work, or a delivery schedule.

**Technical explanation:** The Next.js App Router serves a responsive dashboard and a server-side weather route. Open-Meteo's geocoding service resolves city names, then its forecast endpoint supplies current, hourly, and daily data. The client renders an hourly Recharts visualization, seven-day forecast, derived weather alerts, and a CSV download. `backend/main.py` provides an independent FastAPI version with validated inputs and a short-lived SQLite forecast cache.

**Problem it addresses:** Weather details are difficult to act on when spread across raw numbers. This project turns a public data feed into a clear summary, trends, and rule-based warnings. Similar patterns are used in outdoor operations, logistics, agriculture, renewable energy, travel, and event planning.

### Data flow

```text
User searches / chooses city
           │
           ▼
Next.js dashboard ──► /api/weather (server route)
                           │
                ┌──────────┴───────────┐
                ▼                      ▼
       Open-Meteo geocoding      Open-Meteo forecast
                └──────────┬───────────┘
                           ▼
       Normalize response + assess forecast thresholds
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
       Current cards   Charts & outlook  CSV report

Optional Python service: browser/client ─► FastAPI ─► Open-Meteo
                                                  └─► SQLite cache
```

## Ten-phase student walkthrough

| Phase | What to do | Why | Expected result | Common beginner mistake |
| --- | --- | --- | --- | --- |
| 1. Setup | Install Node.js 20.9+ and Python 3.10+; choose Option B above. | Keep the UI and Python API independently runnable. | Both runtimes are available. | Mixing Python packages into the Node project or vice versa. |
| 2. Project structure | Review `app/`, `components/`, and `backend/`. | Separate presentation, web routes, and Python API responsibilities. | You can locate each feature before changing it. | Putting every feature into one file. |
| 3. Provider configuration | Start with Open-Meteo, which needs no key; copy `backend/.env.example` only for local optional settings. | A zero-key provider makes the first run reproducible. | No credential is needed to fetch a forecast. | Committing a real `.env` file or assuming a key is required. |
| 4. Fetch data | The server resolves the city and requests the forecast with explicit units and a timeout. | Provider calls should not block indefinitely or leak provider details into UI code. | Current, hourly, and daily JSON arrives from the API. | Sending a city name where coordinates are required. |
| 5. Parse JSON | Read named current fields and align hourly/daily values by index and timestamp. | API arrays represent time series; labels and values must stay aligned. | Cards and charts use normalized values. | Assuming every optional field always exists. |
| 6. Analyze forecast | Compare the upcoming series with the documented rain, heat, wind, and humidity rules. | Raw values become useful, explainable signals. | Each fired rule has a title, severity, and reason. | Confusing units or presenting sample thresholds as official warnings. |
| 7. Generate alerts | Review the `evaluate_alerts` function and run the synthetic scenarios. | Deterministic fixtures make alert behavior testable without live weather. | `/api/simulate?scenario=rain` produces a repeatable rain alert. | Depending on a particular real forecast to test a rule. |
| 8. Visualize | Run the dashboard and inspect cards, the hourly chart, and seven-day outlook. | Trends are easier to interpret visually than raw JSON. | A responsive dashboard renders forecast values. | Showing a chart without units or accessible labels. |
| 9. Save a report | Use the dashboard CSV action or request `/api/report?city=Oslo`. | Portable reports support spreadsheets and evidence capture. | A CSV downloads with daily forecast columns. | Saving credentials or personal data in the report/repository. |
| 10. Publish proof | Review `.gitignore`, capture the requested screenshots, commit in focused steps, then push. | A reproducible README and small commits make the work verifiable. | A clean GitHub repository demonstrates the project. | Uploading `.env`, cache databases, or generated secrets. |

For a repeatable demo without network access, use the Python simulation endpoint: `http://localhost:8000/api/simulate?scenario=normal`, `rain`, `heat`, or `wind`. The endpoint uses fixed sample inputs and the same alert-rule function as the live API; it does not claim to be a forecast.

## Features

- Live current conditions, feels-like temperature, humidity, wind, precipitation, sunrise and sunset.
- Search for cities worldwide and quick selection of saved example locations.
- Toggle between Celsius and Fahrenheit for displayed temperatures.
- Hourly temperature and precipitation-probability chart, plus a seven-day outlook.
- Derived rain, heat, wind, and humidity notices with severity labels.
- Export the seven-day forecast to CSV.
- Friendly loading, invalid-city, and upstream-provider error states.
- FastAPI alternative with Pydantic query validation, CORS allow-list, health check, and SQLite cache.
- No keys or paid services required for the default Open-Meteo setup.

## Technology choices

| Option | Stack | Level | Expected result |
| --- | --- | --- | --- |
| A — Starter | Python, `urllib`/`requests`, JSON, `datetime`, terminal output | Beginner | One-city current conditions and threshold alerts |
| B — Recommended | Python, FastAPI, `httpx`, SQLite, Next.js, Tailwind, Recharts | Intermediate | This project: documented API, live dashboard, caching, and CSV export |
| C — Extended | Option B plus scheduled refresh, Docker, persistent database, AQI/maps, email or Telegram | Advanced | A deployable multi-location monitoring service |

**Recommended for a student portfolio:** Option B. It demonstrates Python, API integration, validation, data handling, HTTP endpoints, visual communication, and documentation without requiring an API key or infrastructure account.

## Repository layout

```text
weather-forecast-alert-application/
├── app/                         # Next.js App Router, metadata, and API route
│   └── api/weather/route.ts     # Geocoding + weather provider proxy
├── backend/
│   ├── main.py                  # Standalone FastAPI API and SQLite cache
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Optional backend configuration
├── components/
│   └── weather-dashboard.tsx    # Dashboard, chart, search, alerts, CSV export
├── public/                      # Static assets
├── README.md                    # Setup, architecture, portfolio, and interview guide
├── package.json                 # Next.js scripts/dependencies
└── .gitignore                   # Excludes build products and local secrets
```

## Requirements and installation

- Node.js 20.9 or later and pnpm (the repository declares its package manager).
- Python 3.10 or later only if you want to run the FastAPI service.
- An internet connection for live Open-Meteo data. No account or API key is necessary for this educational demo.

### Run the dashboard

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Search for a city such as `Oslo`, `Nairobi`, or `Sydney`, or choose Delhi, London, or Tokyo from the sidebar. The report button downloads a CSV of the selected place's daily outlook.

### Run the Python API (optional)

From the repository root:

```bash
python -m venv .venv
```

Activate the environment:

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

Install and run the API:

```bash
python -m pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```

Try `http://localhost:8000/health`, `http://localhost:8000/docs`, or `http://localhost:8000/api/weather?city=Delhi`. To query coordinates, use `/api/weather?latitude=28.61&longitude=77.20`. Alerts are available at `/api/alerts?city=Delhi`. The first request may take a moment; subsequent requests for the same coordinates use the 15-minute SQLite cache.

The frontend currently uses its own Next.js route so the dashboard works from one dev server. The FastAPI service is an equivalent standalone Python implementation for learning, API testing, and future integration. It is not required to run the dashboard.

### Optional environment configuration

Copy `backend/.env.example` to `backend/.env` and edit only if needed:

```dotenv
WEATHER_DATABASE=weather_cache.sqlite3
WEATHER_CACHE_SECONDS=900
CORS_ORIGINS=http://localhost:3000
```

The defaults are suitable for local development. Open-Meteo does not require a private key. Never commit `.env`, credentials, or real notification tokens. `.env.example` contains names and safe defaults only.

## How it works

1. **Input:** the user selects a saved location or searches for a city.
2. **Geocoding:** the server asks Open-Meteo to resolve a city to coordinates and timezone.
3. **Fetch:** the server requests current conditions, hourly series, and seven days of daily forecasts in Celsius, km/h, and mm.
4. **Validate and handle errors:** network failures become a useful error response; invalid cities return 404; missing inputs are rejected.
5. **Analyze:** the dashboard checks forecast values against visible sample rules: rain probability at least 60% in the next 12 hours, high temperature at least 35°C, high wind at least 45 km/h, and current humidity at least 85%.
6. **Present:** cards, a chart, the forecast table, and alerts are shown in the location's timezone.
7. **Report:** the user exports a CSV containing date, high/low, rain probability, precipitation, and UV index.

These thresholds are demonstration defaults, not official public-safety warnings. They should be tuned to the location, season, and use case before operational deployment.

## Virtual simulation and testing ideas

The app uses real public data by default. To demonstrate the rule logic without depending on live weather, create a small fixture object containing a current temperature/humidity, hourly rain probabilities, hourly wind speeds, and daily highs. Test at least one case per rule:

| Scenario | Example values | Expected result |
| --- | --- | --- |
| Ordinary day | 22°C high, 20% rain, 12 km/h wind, 45% humidity | No active warning |
| Rain | One of the next 12 hourly rain probabilities is 75% | Rain notice, moderate severity |
| Heat | Daily high is 39°C | Heat notice, moderate severity |
| Extreme heat | Daily high is 41°C | Heat notice, high severity |
| Wind | A next-24-hour wind value is 50 km/h | Wind notice, moderate severity |
| Humidity | Current relative humidity is 90% | Humidity notice |

A useful next code change is to extract alert evaluation into a pure function and cover these cases with `pytest`. For production-like use, also test missing provider fields, invalid city names, provider timeouts, timezone boundaries, empty forecast arrays, and duplicate hourly timestamps. Keep the units explicit when comparing values: Open-Meteo is requested in °C, km/h, and millimeters here.

## Reports and screenshots for a portfolio

Capture these after running the project with a real city:

1. The repository tree showing `app/`, `backend/`, `components/`, and `README.md`.
2. The dashboard's current-weather cards and selected city.
3. The hourly chart and its tooltip at a visible hour.
4. The seven-day outlook and at least one alert state (if conditions permit).
5. The generated CSV opened in a spreadsheet or text editor.
6. FastAPI's `/docs` page and one successful `/api/weather` response.
7. The GitHub repository page with README rendered.

Save portfolio images in an `images/` directory and reference them with relative links, for example `![Weather dashboard](images/dashboard.png)`. Do not commit `.env`, API tokens, personal location history, or user data. This project does not require an API key.

## GitHub upload steps

1. Create a GitHub repository named `weather-forecast-alert-application` with the description below. Choose a license only if you are ready to publish under its terms; do not initialize GitHub with a second README if you already have one locally.
2. Review the repository ignore rules and inspect the files you intend to publish. Keep `.env`, SQLite cache files, virtual environments, build output, and private data out of Git.
3. Initialize or connect the local project to the repository using GitHub's documented workflow. Stage only project source, tests, and documentation; inspect the staged diff before committing.
4. Use clear commits, for example `feat: add Open-Meteo forecast API`, `feat: add deterministic alert scenarios`, and `docs: add setup and portfolio guide`.
5. Push the project branch, then review the rendered README and verify the screenshots and links on GitHub. Never place an access token in a Git URL, source file, screenshot, or shell history.

Suggested repository name: `weather-forecast-alert-application`  
Suggested description: `A student-built weather dashboard and FastAPI service with live Open-Meteo forecasts, rule-based alerts, and CSV exports.`  
Suggested topics: `python`, `fastapi`, `weather-api`, `nextjs`, `data-visualization`, `portfolio-project`.

Build the work in small, reviewable commits:

| Day / milestone | Commit example | Proof to capture |
| --- | --- | --- |
| 1 — Setup and layout | `chore: scaffold weather dashboard` | Repository tree and running shell |
| 2 — Provider integration | `feat: fetch live Open-Meteo forecast` | Successful API response; never show secrets |
| 3 — Data processing | `feat: normalize hourly and daily forecast data` | Current conditions and forecast cards |
| 4 — Alert rules | `feat: derive rain heat and wind alerts` | Alert panel plus scenario notes |
| 5 — Visualization and report | `feat: add forecast chart and CSV export` | Chart and exported CSV |
| 6 — Documentation | `docs: explain setup architecture and demo` | README rendered on GitHub |

When ready to publish: create a public repository with the suggested name, ensure `.gitignore` is active, review staged files for secrets, commit the project, then push to the repository. Never upload keys, `.env` files, local SQLite cache files, or private data. If using the v0 project workflow, publish the project using its GitHub connection/publish action rather than copying secret values into source.

## Industry relevance and extensions

The core skills map to API integration, data normalization, caching, rule evaluation, web service design, and communicating time-series data. These patterns appear in logistics routing, crop irrigation planning, renewable-energy maintenance, outdoor-event planning, travel, and school heat advisories.

Reasonable next steps:

- Add a user-managed list of saved locations with a persistent database.
- Add scheduled refresh and alert de-duplication before sending notifications.
- Add air-quality metrics from a public provider, with a clearly stated source and units.
- Add an interactive map using Leaflet or Mapbox and a legitimate weather tile layer.
- Add email/Telegram delivery using a secrets manager and per-user consent.
- Add provider adapters and tests before supporting multiple weather services.
- Containerize the FastAPI backend; schedule refreshes with cron or a managed scheduler.

Do not send real SMS or email while testing without explicit consent and configured credentials. A production notifier should record delivery status, deduplicate repeated alerts, protect recipient information, and define retry behavior.

## Interview preparation

### 1. “Explain your project.”
I built a weather forecast and alert application with a Next.js dashboard and a Python FastAPI service. It retrieves public Open-Meteo data, displays current conditions and hourly/seven-day forecasts, applies simple rules for rain, heat, wind, and humidity, and can export a CSV report. I kept the provider calls on the server, validated inputs, added a small cache to the Python API, and documented the limitations of the sample alert thresholds.

### 2. What problem does it solve?
It turns forecast values into a concise view that can help travelers, event planners, farmers, and operations teams make routine plans without manually interpreting raw data. It is a planning aid, not an official warning system.

### 3. How does the application fetch weather data?
The user selects or enters a city. The server resolves the location through Open-Meteo Geocoding, then requests forecast data using coordinates, a timezone, and explicit units. It returns only the response the dashboard needs and handles provider errors without exposing provider implementation details to the browser.

### 4. What is JSON and why is it used?
JSON is a text format for structured data. The weather provider returns named fields and arrays in JSON, which the API can validate and the frontend can map into cards and charts.

### 5. How do the alert rules work?
The application evaluates forecast series against readable thresholds. For example, it checks the maximum rain probability in the next 12 hours and compares it to a configured percentage. The rule output contains a title, explanation, and severity. A real deployment would validate thresholds with domain experts and add tests and de-duplication.

### 6. How did you handle API errors?
The server checks HTTP success, applies timeouts, handles an unknown city as a not-found response, and returns a clear message when the provider is unavailable. The UI preserves the rest of the page and offers a retry instead of presenting a raw stack trace.

### 7. Why use a backend instead of calling the provider from the browser?
A backend centralizes input validation, caching, and provider behavior, avoids coupling UI code to provider details, and is the appropriate place for secrets if a future provider requires them. The Open-Meteo demo itself does not require a key.

### 8. What does the project produce?
It produces current conditions, a 24-hour chart, a seven-day forecast, weather notices, and an optional CSV report. The API also provides health and forecast endpoints.

### 9. How would you improve it for production?
I would add automated tests, persistent user-managed locations, scheduled refresh, observability, rate limiting, provider fallbacks, alert de-duplication, and an explicit operational policy for severe weather. I would also tune thresholds by geography and validate the data source's license and service limits.

### 10. How would you explain it to a non-technical person?
It is a weather dashboard that checks a city's forecast and highlights conditions worth planning around, like likely rain or high heat.

**HR / short introduction:** I am building practical projects that combine Python, APIs, and data presentation. This project demonstrates how I can take a public data source, validate and process it, expose useful results through an API, and communicate them through a user-friendly dashboard.

**Technical summary:** Next.js App Router + TypeScript handles the interface and provider proxy. Open-Meteo supplies city geocoding and forecast data. Recharts renders the hourly trend; the dashboard derives alerts and exports CSV. A standalone FastAPI service demonstrates Python endpoints, Pydantic validation, async HTTP calls, CORS configuration, error handling, and parameterized SQLite cache reads/writes.

## Limitations and safety

- Forecasts and alert notices depend on a third-party provider and network availability.
- Thresholds are educational defaults and are not official severe-weather guidance.
- No login or user-specific persistence is implemented in this learning demo.
- The web version uses short server-side forecast revalidation; the standalone Python service caches responses for 15 minutes.
- Do not make safety-critical decisions solely from this demo. Check local meteorological authorities for official alerts.

## License and attribution

Open-Meteo provides the forecast data used by this project; review its current terms and attribution requirements before public or commercial use. The application source can be adapted for learning; choose and add a repository license before redistributing it.

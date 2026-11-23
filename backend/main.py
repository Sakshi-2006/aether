from __future__ import annotations

import asyncio
import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any, Literal
import csv

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).with_name(".env"))

DATABASE_PATH = Path(os.getenv("WEATHER_DATABASE", "weather_cache.sqlite3"))
OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
GEOCODING = "https://geocoding-api.open-meteo.com/v1/search"
CACHE_SECONDS = int(os.getenv("WEATHER_CACHE_SECONDS", "900"))


def initialize_database() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS forecast_cache (
                cache_key TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                fetched_at TEXT NOT NULL
            )
        """)
        connection.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Atmos Weather API",
    description="A small educational weather API backed by Open-Meteo.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Accept", "Content-Type"],
)


class Location(BaseModel):
    name: str
    country: str = ""
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timezone: str = "auto"


def read_cache(cache_key: str) -> dict[str, Any] | None:
    if not DATABASE_PATH.exists():
        return None
    with sqlite3.connect(DATABASE_PATH) as connection:
        row = connection.execute(
            "SELECT payload, fetched_at FROM forecast_cache WHERE cache_key = ?",
            (cache_key,),
        ).fetchone()
    if not row:
        return None
    fetched_at = datetime.fromisoformat(row[1])
    age = (datetime.now(timezone.utc) - fetched_at).total_seconds()
    if age > CACHE_SECONDS:
        return None
    import json

    return json.loads(row[0])


def write_cache(cache_key: str, payload: dict[str, Any]) -> None:
    import json

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            "INSERT INTO forecast_cache(cache_key, payload, fetched_at) VALUES (?, ?, ?) "
            "ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload, fetched_at=excluded.fetched_at",
            (cache_key, json.dumps(payload), datetime.now(timezone.utc).isoformat()),
        )
        connection.commit()


async def resolve_city(client: httpx.AsyncClient, city: str) -> Location:
    response = await client.get(
        GEOCODING,
        params={"name": city, "count": 1, "language": "en", "format": "json"},
    )
    response.raise_for_status()
    match = (response.json().get("results") or [None])[0]
    if not match:
        raise HTTPException(status_code=404, detail=f"No location found for '{city}'.")
    return Location(
        name=match["name"], country=match.get("country", ""),
        latitude=match["latitude"], longitude=match["longitude"],
        timezone=match.get("timezone", "auto"),
    )


async def fetch_forecast(location: Location) -> dict[str, Any]:
    cache_key = f"{location.latitude:.4f},{location.longitude:.4f}"
    cached = await asyncio.to_thread(read_cache, cache_key)
    if cached:
        return cached

    params = {
        "latitude": location.latitude,
        "longitude": location.longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
        "hourly": "temperature_2m,precipitation_probability,precipitation,relative_humidity_2m,wind_speed_10m,weather_code",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max",
        "temperature_unit": "celsius", "wind_speed_unit": "kmh",
        "precipitation_unit": "mm", "timezone": location.timezone,
        "forecast_days": 7,
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(OPEN_METEO, params=params)
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Weather provider is temporarily unavailable.") from error

    payload = response.json()
    payload["location"] = location.model_dump()
    await asyncio.to_thread(write_cache, cache_key, payload)
    return payload


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/weather")
async def weather(
    city: str | None = Query(default=None, min_length=1, max_length=120),
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
) -> dict[str, Any]:
    if city:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                location = await resolve_city(client, city.strip())
        except httpx.HTTPError as error:
            raise HTTPException(status_code=502, detail="Location search is temporarily unavailable.") from error
    elif latitude is not None and longitude is not None:
        location = Location(name="Selected location", latitude=latitude, longitude=longitude)
    else:
        raise HTTPException(status_code=400, detail="Provide a city or both latitude and longitude.")
    return await fetch_forecast(location)


def evaluate_alerts(forecast: dict[str, Any]) -> list[dict[str, str]]:
    current = forecast["current"]
    daily = forecast["daily"]
    hourly = forecast["hourly"]
    active: list[dict[str, str]] = []
    rain = max(hourly.get("precipitation_probability", [])[:12], default=0)
    high = (daily.get("temperature_2m_max") or [0])[0]
    wind = max(hourly.get("wind_speed_10m", [])[:24], default=0)
    humidity = current.get("relative_humidity_2m", 0)
    if rain >= 60:
        active.append({"severity": "high" if rain >= 80 else "moderate", "title": "Rain expected soon", "detail": f"{rain}% chance of precipitation in the next 12 hours."})
    if high >= 35:
        active.append({"severity": "high" if high >= 40 else "moderate", "title": "High temperature", "detail": f"Today's high may reach {round(high)}°C."})
    if wind >= 45:
        active.append({"severity": "high" if wind >= 65 else "moderate", "title": "Strong winds", "detail": f"Winds may reach {round(wind)} km/h."})
    if humidity >= 85:
        active.append({"severity": "low", "title": "High humidity", "detail": f"Humidity is {humidity}% right now."})
    return active


@app.get("/api/alerts")
async def alerts(city: str = Query(min_length=1, max_length=120)) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            location = await resolve_city(client, city)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Location search is temporarily unavailable.") from error
    forecast = await fetch_forecast(location)
    return {"location": location.model_dump(), "generated_at": datetime.now(timezone.utc).isoformat(), "alerts": evaluate_alerts(forecast)}


@app.get("/api/simulate")
async def simulate(scenario: Literal["normal", "rain", "heat", "wind"] = "normal") -> dict[str, Any]:
    samples = {
        "normal": (22, 45, 25, 10, 12),
        "rain": (22, 60, 26, 85, 18),
        "heat": (30, 35, 41, 10, 20),
        "wind": (18, 42, 24, 10, 70),
    }
    temperature, humidity, high, rain, wind = samples[scenario]
    forecast = {
        "current": {"temperature_2m": temperature, "relative_humidity_2m": humidity},
        "hourly": {"precipitation_probability": [rain], "wind_speed_10m": [wind]},
        "daily": {"temperature_2m_max": [high]},
    }
    return {"simulation": True, "scenario": scenario, "alerts": evaluate_alerts(forecast)}


@app.get("/api/report")
async def report(city: str = Query(min_length=1, max_length=120)) -> StreamingResponse:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            location = await resolve_city(client, city)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Location search is temporarily unavailable.") from error
    forecast = await fetch_forecast(location)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "temperature_high_c", "temperature_low_c", "rain_chance_percent", "precipitation_mm", "uv_index"])
    daily = forecast["daily"]
    for index, date in enumerate(daily["time"]):
        writer.writerow([date, daily["temperature_2m_max"][index], daily["temperature_2m_min"][index], daily["precipitation_probability_max"][index], daily["precipitation_sum"][index], daily["uv_index_max"][index]])
    output.seek(0)
    safe_city = "".join(character.lower() if character.isalnum() else "-" for character in location.name).strip("-")
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="weather-{safe_city}.csv"'})

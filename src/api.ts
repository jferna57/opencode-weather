import type { DailyForecast, GeocodedCity, Unit } from "./types";

interface GeocodeResponse {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }[];
}

interface ForecastResponse {
  current?: {
    temperature_2m: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
  };
}

export async function geocode(city: string): Promise<GeocodedCity[]> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}` +
    `&count=5&language=es&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding falló (HTTP ${res.status})`);

  const data = (await res.json()) as GeocodeResponse;
  if (!data.results?.length) return [];

  return data.results.map((result) => {
    const detail = [result.admin1, result.country].filter(Boolean).join(", ");
    return {
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      detail,
    };
  });
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  unit: Unit,
): Promise<number> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m",
  });
  if (unit === "fahrenheit") params.set("temperature_unit", "fahrenheit");

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Pronóstico falló (HTTP ${res.status})`);

  const data = (await res.json()) as ForecastResponse;
  const temp = data.current?.temperature_2m;
  if (temp === undefined) throw new Error("Respuesta sin temperatura");

  return temp;
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
  unit: Unit,
): Promise<DailyForecast[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "temperature_2m_max,temperature_2m_min,weathercode",
    forecast_days: "7",
  });
  if (unit === "fahrenheit") params.set("temperature_unit", "fahrenheit");

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Pronóstico falló (HTTP ${res.status})`);

  const data = (await res.json()) as ForecastResponse;
  const daily = data.daily;
  if (!daily?.time?.length) throw new Error("Respuesta sin pronóstico diario");

  return daily.time.map((date, i) => ({
    date,
    tempMax: daily.temperature_2m_max[i] ?? 0,
    tempMin: daily.temperature_2m_min[i] ?? 0,
    weathercode: daily.weathercode[i] ?? 0,
  }));
}

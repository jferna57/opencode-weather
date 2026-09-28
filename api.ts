import type { GeocodedCity, Unit } from "./types";

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
}

export async function geocode(city: string): Promise<GeocodedCity | null> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}` +
    `&count=1&language=es&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding falló (HTTP ${res.status})`);

  const data = (await res.json()) as GeocodeResponse;
  const result = data.results?.[0];
  if (!result) return null;

  const detail = [result.admin1, result.country].filter(Boolean).join(", ");
  return {
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    detail,
  };
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

import type { City, CityAlerts, DailyForecast, GeocodedCity, Unit } from "./types";
import { evaluateDay, groupCapeByDay } from "./alerts";

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

interface AlertsResponse {
  daily?: {
    time: string[];
    weather_code?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    wind_gusts_10m_max?: number[];
    temperature_2m_max?: number[];
  };
  hourly?: {
    time: string[];
    cape?: (number | null)[];
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

/**
 * Evalúa los umbrales de alerta para toda la lista de ciudades en una
 * sola petición.
 *
 * Open-Meteo acepta varias coordenadas por comas y devuelve un array en
 * el mismo orden de entrada, lo que permite emparejarlo con `cities`.
 * Con una única ciudad la respuesta llega como objeto, no como array,
 * por lo que siempre se normaliza.
 *
 * `cape` es una variable horaria: Open-Meteo rechaza `daily=cape` con
 * HTTP 400, así que se pide a nivel `hourly` y se agrega por día aquí.
 */
export async function fetchAlerts(
  cities: City[],
  unit: Unit,
): Promise<CityAlerts[]> {
  if (cities.length === 0) return [];

  const params = new URLSearchParams({
    latitude: cities.map((city) => city.latitude).join(","),
    longitude: cities.map((city) => city.longitude).join(","),
    daily:
      "weather_code,precipitation_sum,precipitation_probability_max," +
      "wind_gusts_10m_max,temperature_2m_max",
    hourly: "cape",
    forecast_days: "7",
    timezone: "auto",
  });
  if (unit === "fahrenheit") params.set("temperature_unit", "fahrenheit");

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Alertas fallaron (HTTP ${res.status})`);

  const data = (await res.json()) as AlertsResponse | AlertsResponse[];
  const responses = Array.isArray(data) ? data : [data];

  return cities.map((city, index) => {
    const response = responses[index];
    const daily = response?.daily;
    if (!response || !daily?.time?.length) {
      throw new Error(`Respuesta sin pronóstico para ${city.name}`);
    }

    const capeByDay = groupCapeByDay(
      response.hourly?.time ?? [],
      response.hourly?.cape ?? [],
    );

    const alerts = daily.time.flatMap((date, dayIndex) =>
      evaluateDay(
        {
          date,
          weatherCode: daily.weather_code?.[dayIndex] ?? 0,
          precipSum: daily.precipitation_sum?.[dayIndex] ?? 0,
          precipProbMax: daily.precipitation_probability_max?.[dayIndex] ?? 0,
          gustsMax: daily.wind_gusts_10m_max?.[dayIndex] ?? 0,
          tempMax: daily.temperature_2m_max?.[dayIndex] ?? 0,
          capeMax: capeByDay.get(date) ?? 0,
        },
        unit,
      ),
    );

    return { city, alerts };
  });
}

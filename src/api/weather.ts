import type { DailyForecast, Unit } from "../types";

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

/** Temperatura actual en la unidad indicada. */
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

/** Pronóstico diario de 7 días en la unidad indicada. */
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

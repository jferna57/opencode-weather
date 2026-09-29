import type { City, CityAlerts, Unit } from "../types";
import { evaluateDay, groupCapeByDay } from "../utils/alerts";

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

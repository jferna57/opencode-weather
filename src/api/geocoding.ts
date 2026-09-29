import type { GeocodedCity } from "../types";

interface GeocodeResponse {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }[];
}

/** Busca coordenadas por nombre. Devuelve hasta 5 coincidencias. */
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

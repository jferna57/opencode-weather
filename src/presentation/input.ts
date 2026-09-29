import type { City, GeocodedCity, Unit } from "../types";
import { ask } from "./prompt";

export async function askCityName(): Promise<string | null> {
  const { name } = await ask<{ name: string }>(
    {
      type: "text",
      name: "name",
      message: "Nombre de la ciudad",
      validate: (value: string) => value.trim().length > 0 || "Nombre requerido",
    },
    { name: "" },
  );
  return name.trim() || null;
}

/** Con una sola coincidencia no se pregunta nada. */
export async function pickGeocodedCity(
  candidates: GeocodedCity[],
): Promise<GeocodedCity | null> {
  if (candidates.length === 1) return candidates[0]!;
  const { index } = await ask<{ index: number }>(
    {
      type: "select",
      name: "index",
      message: "Elige una ubicación",
      choices: candidates.map((c, i) => ({
        title: c.detail ? `${c.name} — ${c.detail}` : c.name,
        value: i,
      })),
    },
    { index: -1 },
  );
  return candidates[index] ?? null;
}

export async function confirmAdd(cityName: string, detail: string): Promise<boolean> {
  const location = detail ? `${cityName} — ${detail}` : cityName;
  const { ok } = await ask<{ ok: boolean }>(
    {
      type: "confirm",
      name: "ok",
      message: `¿Agregar "${location}"?`,
      initial: true,
    },
    { ok: false },
  );
  return ok;
}

export async function pickCity(
  cities: City[],
  message: string,
): Promise<City | null> {
  const { id } = await ask<{ id: number }>(
    {
      type: "select",
      name: "id",
      message,
      choices: cities.map((city) => ({
        title: `${city.id}. ${city.name}${city.is_default ? " (default)" : ""}`,
        value: city.id,
      })),
    },
    { id: -1 },
  );
  return cities.find((city) => city.id === id) ?? null;
}

export async function confirmDelete(city: City): Promise<boolean> {
  const { ok } = await ask<{ ok: boolean }>(
    {
      type: "confirm",
      name: "ok",
      message: `¿Eliminar "${city.name}"?`,
      initial: false,
    },
    { ok: false },
  );
  return ok;
}

export async function pickUnit(current: Unit): Promise<Unit | null> {
  const { unit } = await ask<{ unit: string }>(
    {
      type: "select",
      name: "unit",
      message: "Unidad de temperatura",
      initial: current === "celsius" ? 0 : 1,
      choices: [
        { title: "Celsius (°C)", value: "celsius" },
        { title: "Fahrenheit (°F)", value: "fahrenheit" },
      ],
    },
    { unit: "" },
  );
  return unit === "celsius" || unit === "fahrenheit" ? unit : null;
}

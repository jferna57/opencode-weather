import prompts from "prompts";
import type { City, Unit } from "./types";

const LINE = "═".repeat(41);

export const MENU_OPTIONS = [1, 2, 3, 4, 5, 8, 9] as const;
export type MenuOption = (typeof MENU_OPTIONS)[number];

async function ask<T extends Record<string, unknown>>(
  questions: Parameters<typeof prompts>[0],
  fallback: T,
): Promise<T> {
  try {
    const answers = (await prompts(questions)) as T;
    return { ...fallback, ...answers };
  } catch {
    return fallback;
  }
}

export function printHeader(): void {
  console.log(`\n${LINE}\n         WEATHER CLI\n${LINE}`);
}

export function printMenu(cityCount: number, unit: Unit): void {
  const unitLabel = unit === "celsius" ? "°C" : "°F";
  printHeader();
  console.log("  1. Clima de ciudad default");
  console.log(`  2. Clima de todas las ciudades (${cityCount})`);
  console.log("  3. Buscar y agregar ciudad");
  console.log("  4. Eliminar ciudad");
  console.log("  5. Establecer ciudad default");
  console.log(`  8. Ajustes (${unitLabel})`);
  console.log("  9. Salir");
  console.log(LINE);
}

export async function askMenuOption(): Promise<MenuOption> {
  const { option } = await ask<{ option: string }>(
    {
      type: "text",
      name: "option",
      message: "Selecciona una opción",
      validate: (value: string) =>
        MENU_OPTIONS.includes(Number(value.trim()) as MenuOption) ||
        "Opción inválida",
    },
    { option: "9" },
  );

  return Number(option.trim()) as MenuOption;
}

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

export function printWeather(cityName: string, temperature: number, unit: Unit): void {
  const unitLabel = unit === "celsius" ? "°C" : "°F";
  console.log(`  ${cityName}: ${temperature.toFixed(1)} ${unitLabel}`);
}

export function printError(message: string): void {
  console.error(`  ✖ ${message}`);
}

export function printInfo(message: string): void {
  console.log(`  ℹ ${message}`);
}

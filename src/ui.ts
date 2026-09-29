import kleur from "kleur";
import prompts from "prompts";
import type { City, DailyForecast, GeocodedCity, Unit } from "./types";

const LINE = "═".repeat(41);

export const MENU_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
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
  console.log(`\n${LINE}\n${kleur.cyan("         WEATHER CLI")}\n${LINE}`);
}

export function printMenu(cityCount: number, unit: Unit): void {
  const unitLabel = unit === "celsius" ? "°C" : "°F";
  printHeader();
  console.log(kleur.cyan("  1. Clima de ciudad default"));
  console.log(kleur.cyan(`  2. Clima de todas las ciudades (${cityCount})`));
  console.log(kleur.cyan("  3. Buscar y agregar ciudad"));
  console.log(kleur.cyan("  4. Eliminar ciudad"));
  console.log(kleur.cyan("  5. Establecer ciudad default"));
  console.log(kleur.cyan("  6. Pronóstico 7 días (default)"));
  console.log(kleur.cyan("  7. Pronóstico 7 días (elegir ciudad)"));
  console.log(kleur.cyan(`  8. Ajustes (${unitLabel})`));
  console.log(kleur.cyan("  9. Salir"));
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

export function printWeather(cityName: string, temperature: number, unit: Unit): void {
  const unitLabel = unit === "celsius" ? "°C" : "°F";
  console.log(`  ${cityName}: ${kleur.yellow(`${temperature.toFixed(1)} ${unitLabel}`)}`);
}

const WEATHER_CODES: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcial nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna",
  55: "Llovizna densa",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia fuerte",
  71: "Nieve ligera",
  73: "Nieve",
  75: "Nieve fuerte",
  80: "Chubascos ligeros",
  81: "Chubascos",
  82: "Chubascos fuertes",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta fuerte con granizo",
};

function describeWeatherCode(code: number): string {
  return WEATHER_CODES[code] ?? `Código ${code}`;
}

export function printForecast(
  cityName: string,
  forecast: DailyForecast[],
  unit: Unit,
): void {
  const unitLabel = unit === "celsius" ? "°C" : "°F";
  console.log(`\n  ${kleur.bold(`${cityName} — próximos 7 días`)}`);
  for (const day of forecast) {
    const max = kleur.yellow(`${day.tempMax.toFixed(1)}${unitLabel}`);
    const min = kleur.yellow(`${day.tempMin.toFixed(1)}${unitLabel}`);
    console.log(
      `    ${day.date}  ↑${max}  ↓${min}  ${describeWeatherCode(day.weathercode)}`,
    );
  }
  console.log();
}

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function startSpinner(message: string): () => void {
  let i = 0;
  const frame = setInterval(() => {
    process.stdout.write(`\r  ${kleur.cyan(FRAMES[i % FRAMES.length]!)} ${message}`);
    i++;
  }, 80);

  return () => {
    clearInterval(frame);
    process.stdout.write("\r" + " ".repeat(message.length + 6) + "\r");
  };
}

export function printError(message: string): void {
  console.error(`  ${kleur.red("✖")} ${kleur.red(message)}`);
}

export function printInfo(message: string): void {
  console.log(`  ${kleur.green("ℹ")} ${message}`);
}

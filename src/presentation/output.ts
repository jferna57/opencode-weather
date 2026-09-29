import kleur from "kleur";
import type { CityAlerts, DailyForecast, Unit } from "../types";
import { SEVERITY_BADGE } from "../utils/colors";
import { LINE } from "../utils/constants";
import { formatDayDate, formatTemperature } from "../utils/format";
import { describeWmoCode } from "../utils/wmo";

export function printWeather(
  cityName: string,
  temperature: number,
  unit: Unit,
): void {
  const value = kleur.yellow(formatTemperature(temperature, unit));
  console.log(`  ${cityName}: ${value}`);
}

export function printForecast(
  cityName: string,
  forecast: DailyForecast[],
  unit: Unit,
): void {
  const suffix = unit === "celsius" ? "°C" : "°F";
  console.log(`\n  ${kleur.bold(`${cityName} — próximos 7 días`)}`);
  for (const day of forecast) {
    const max = kleur.yellow(`${day.tempMax.toFixed(1)}${suffix}`);
    const min = kleur.yellow(`${day.tempMin.toFixed(1)}${suffix}`);
    console.log(
      `    ${formatDayDate(day.date)}  ↑${max}  ↓${min}  ${describeWmoCode(day.weathercode)}`,
    );
  }
  console.log();
}

/** Una línea por ciudad guardada, con la default marcada. */
export function printCityList(
  cities: { id: number; name: string; is_default: boolean }[],
): void {
  console.log();
  for (const city of cities) {
    const suffix = city.is_default ? kleur.green(" (default)") : "";
    console.log(`  ${kleur.cyan(String(city.id))}. ${kleur.bold(city.name)}${suffix}`);
  }
  console.log();
}

/**
 * Muestra solo las ciudades que tienen alertas activas. Si ninguna la
 * tiene, se informa con un mensaje verde en lugar de un listado vacío.
 */
export function printAlerts(results: CityAlerts[]): void {
  const active = results.filter(({ alerts }) => alerts.length > 0);

  if (active.length === 0) {
    console.log();
    printInfo(`Sin alertas activas en tus ${results.length} ciudades.`);
    console.log();
    return;
  }

  console.log();
  console.log(`  ${kleur.magenta(kleur.bold("⚠ ALERTAS METEOROLÓGICAS"))}`);
  console.log(`  ${LINE}`);

  for (const { city, alerts } of active) {
    const suffix = city.is_default ? " (default)" : "";
    console.log(`\n  ${kleur.bold(`${city.name}${suffix}`)}`);
    for (const alert of alerts) {
      const badge = SEVERITY_BADGE[alert.severity];
      const suffix = alert.detail ? ` — ${kleur.italic(alert.detail)}` : "";
      console.log(
        `    ${badge.color(kleur.bold(badge.text))}  ` +
          `${formatDayDate(alert.date)}  ${alert.title}${suffix}`,
      );
    }
  }

  const count = active.length;
  console.log(
    `\n  ${kleur.magenta(`⚠ ${count} ${count === 1 ? "ciudad" : "ciudades"} con avisos`)}`,
  );
  console.log();
}

export function printError(message: string): void {
  console.error(`  ${kleur.red("✖")} ${kleur.red(message)}`);
}

export function printInfo(message: string): void {
  console.log(`  ${kleur.green("ℹ")} ${message}`);
}

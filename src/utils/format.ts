import kleur from "kleur";
import type { Unit } from "../types";
import { MONTHS, WEEKDAYS } from "./constants";

/**
 * Formatea una fecha `YYYY-MM-DD` como `lunes 09-septiembre-2026`.
 * Los sábados y domingos se muestran en verde.
 */
export function formatDayDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;

  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const label =
    `${WEEKDAYS[weekdayIndex]} ` +
    `${String(day).padStart(2, "0")}-${MONTHS[month - 1]}-${year}`;

  const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;
  return isWeekend ? kleur.green(label) : label;
}

/** Sufijo de la unidad activa (`°C` o `°F`). */
export function unitLabel(unit: Unit): string {
  return unit === "celsius" ? "°C" : "°F";
}

/** Temperatura con un decimal y su unidad (`21.5 °C`). */
export function formatTemperature(value: number, unit: Unit): string {
  return `${value.toFixed(1)} ${unitLabel(unit)}`;
}

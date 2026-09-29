import type { AlertSeverity, Unit, WeatherAlert } from "./types";
import { describeWmoCode, SNOW_CODES, STORM_CODES } from "./wmo";

/**
 * Métricas agregadas para un día concreto.
 *
 * `tempMax` viene expresada en la unidad activa (celsius/fahrenheit),
 * igual que el resto de la app.
 */
export interface DayMetrics {
  date: string;
  weatherCode: number;
  precipSum: number;
  precipProbMax: number;
  gustsMax: number;
  tempMax: number;
  capeMax: number;
}

export const THRESHOLDS = {
  precipSumMm: 20,
  precipProbPct: 70,
  gustsKmh: 60,
  capeJkg: 1500,
  tempMaxC: 38,
} as const;

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

/** Umbral de calor máximo convertido a la unidad activa. */
export function tempThreshold(unit: Unit): number {
  return unit === "fahrenheit" ? THRESHOLDS.tempMaxC * 9 / 5 + 32 : THRESHOLDS.tempMaxC;
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Evalúa los umbrales fijos de alerta sobre un día.
 *
 * Las siete reglas se evalúan de forma independiente, salvo que se
 * documenta: cuando el código WMO ya describe una tormenta explícita no
 * se emite además la alerta de "tormenta potencial" por CAPE, porque
 * sería una repetición de la misma fenomenología en menor severidad.
 */
export function evaluateDay(day: DayMetrics, unit: Unit = "celsius"): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  if (day.precipSum >= THRESHOLDS.precipSumMm) {
    alerts.push({
      kind: "lluvia",
      severity: "warning",
      title: "Lluvia intensa",
      detail: `Acumulado ${fmt(day.precipSum)} mm`,
      date: day.date,
    });
  }

  if (day.precipProbMax >= THRESHOLDS.precipProbPct) {
    alerts.push({
      kind: "lluvia",
      severity: "info",
      title: "Lluvia probable",
      detail: `Probabilidad ${fmt(day.precipProbMax)}%`,
      date: day.date,
    });
  }

  if (STORM_CODES.has(day.weatherCode)) {
    alerts.push({
      kind: "tormenta",
      severity: "danger",
      title: describeWmoCode(day.weatherCode),
      date: day.date,
    });
  } else if (day.capeMax >= THRESHOLDS.capeJkg) {
    alerts.push({
      kind: "tormenta",
      severity: "warning",
      title: "Tormenta potencial",
      detail: `CAPE máx ${fmt(day.capeMax)} J/kg`,
      date: day.date,
    });
  }

  if (day.gustsMax >= THRESHOLDS.gustsKmh) {
    alerts.push({
      kind: "viento",
      severity: "warning",
      title: "Viento fuerte",
      detail: `Rachas máx ${fmt(day.gustsMax)} km/h`,
      date: day.date,
    });
  }

  if (SNOW_CODES.has(day.weatherCode)) {
    alerts.push({
      kind: "nieve",
      severity: "warning",
      title: describeWmoCode(day.weatherCode),
      date: day.date,
    });
  }

  if (day.tempMax >= tempThreshold(unit)) {
    const unitLabel = unit === "fahrenheit" ? "°F" : "°C";
    alerts.push({
      kind: "calor",
      severity: "warning",
      title: "Calor extremo",
      detail: `Máx ${fmt(day.tempMax)} ${unitLabel}`,
      date: day.date,
    });
  }

  return alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/**
 * Agrega `hourly.cape` (única variable de inestabilidad disponible en
 * Open-Meteo, inexistente a nivel `daily`) en el máximo por día local.
 *
 * Los timestamps de Open-Meteo vienen como `2026-10-01T14:00`, de modo que
 * el día local es simplemente el prefijo de 10 caracteres.
 */
export function groupCapeByDay(
  times: string[],
  cape: (number | null)[],
): Map<string, number> {
  const byDay = new Map<string, number>();

  for (let i = 0; i < times.length && i < cape.length; i++) {
    const value = cape[i];
    if (value === null || value === undefined || Number.isNaN(value)) continue;

    const day = times[i]!.slice(0, 10);
    const current = byDay.get(day);
    if (current === undefined || value > current) byDay.set(day, value);
  }

  return byDay;
}

import type { City } from "./City";

export type AlertSeverity = "info" | "warning" | "danger";

export type AlertKind = "lluvia" | "tormenta" | "viento" | "nieve" | "calor";

export interface WeatherAlert {
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  /** Presente solo cuando hay una métrica que añadir al título. */
  detail?: string;
  date: string;
}

export interface CityAlerts {
  city: City;
  alerts: WeatherAlert[];
}

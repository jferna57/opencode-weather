export type Unit = "celsius" | "fahrenheit";

export interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

export interface GeocodedCity {
  name: string;
  latitude: number;
  longitude: number;
  detail: string;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  weathercode: number;
}

export interface Forecast {
  current: number;
  daily: DailyForecast[];
}

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

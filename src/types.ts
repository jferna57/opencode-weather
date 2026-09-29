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

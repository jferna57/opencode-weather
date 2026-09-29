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

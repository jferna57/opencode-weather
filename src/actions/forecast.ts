import { fetchForecast } from "../api";
import { pickCity, printForecast, printInfo, startSpinner } from "../presentation";
import { getAllCities, getDefaultCity, getUnit } from "../storage";
import type { City } from "../types";

async function showCityForecast(city: City): Promise<void> {
  const unit = getUnit();
  const stop = startSpinner(`Consultando pronóstico de ${city.name}…`);
  try {
    const forecast = await fetchForecast(city.latitude, city.longitude, unit);
    stop();
    printForecast(city.name, forecast, unit);
  } catch (error) {
    stop();
    throw error;
  }
}

export async function getDefaultForecast(): Promise<void> {
  const city = getDefaultCity();
  if (!city) {
    printInfo("No hay ciudad default. Usa la opción 5.");
    return;
  }
  await showCityForecast(city);
}

export async function getPickForecast(): Promise<void> {
  const cities = getAllCities();
  if (cities.length === 0) {
    printInfo("No hay ciudades guardadas. Usa la opción 3.");
    return;
  }
  const city = await pickCity(cities, "Ciudad para el pronóstico");
  if (!city) return;
  await showCityForecast(city);
}

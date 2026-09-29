import { fetchWeather } from "../api";
import { printInfo, printWeather } from "../presentation";
import { startSpinner } from "../presentation";
import { getAllCities, getDefaultCity, getUnit } from "../storage";
import type { City } from "../types";

async function showCityWeather(city: City): Promise<void> {
  const unit = getUnit();
  const stop = startSpinner(`Consultando clima de ${city.name}…`);
  try {
    const temperature = await fetchWeather(city.latitude, city.longitude, unit);
    stop();
    printWeather(city.name, temperature, unit);
  } catch (error) {
    stop();
    throw error;
  }
}

export async function getDefaultWeather(): Promise<void> {
  const city = getDefaultCity();
  if (!city) {
    printInfo("No hay ciudad default. Usa la opción 5.");
    return;
  }
  console.log();
  await showCityWeather(city);
}

export async function getAllWeather(): Promise<void> {
  const cities = getAllCities();
  if (cities.length === 0) {
    printInfo("No hay ciudades guardadas. Usa la opción 3.");
    return;
  }
  console.log();
  for (const city of cities) {
    await showCityWeather(city);
  }
}

import { fetchWeather, geocode } from "./api";
import {
  addCity,
  deleteCity,
  getAllCities,
  getDefaultCity,
  getUnit,
  setDefaultCity,
  setUnit,
} from "./db";
import type { City } from "./types";
import * as ui from "./ui";

async function showCityWeather(city: City): Promise<void> {
  const unit = getUnit();
  const temperature = await fetchWeather(city.latitude, city.longitude, unit);
  ui.printWeather(city.name, temperature, unit);
}

async function optionDefaultWeather(): Promise<void> {
  const city = getDefaultCity();
  if (!city) {
    ui.printInfo("No hay ciudad default. Usa la opción 5.");
    return;
  }
  console.log();
  await showCityWeather(city);
}

async function optionAllWeather(): Promise<void> {
  const cities = getAllCities();
  if (cities.length === 0) {
    ui.printInfo("No hay ciudades guardadas. Usa la opción 3.");
    return;
  }
  console.log();
  for (const city of cities) {
    await showCityWeather(city);
  }
}

async function optionAddCity(): Promise<void> {
  const name = await ui.askCityName();
  if (!name) return;

  const found = await geocode(name);
  if (!found) {
    ui.printError(`No se encontró "${name}"`);
    return;
  }
  if (getAllCities().some((c) => c.name === found.name && c.latitude === found.latitude)) {
    ui.printInfo(`"${found.name}" ya está guardada.`);
    return;
  }
  if (!(await ui.confirmAdd(found.name, found.detail))) return;

  addCity(found);
  ui.printInfo(`"${found.name}" agregada${getDefaultCity()?.name === found.name ? " (default)" : ""}.`);
}

async function optionDeleteCity(): Promise<void> {
  const cities = getAllCities();
  if (cities.length === 0) {
    ui.printInfo("No hay ciudades guardadas.");
    return;
  }
  const city = await ui.pickCity(cities, "Ciudad a eliminar");
  if (!city) return;
  if (!(await ui.confirmDelete(city))) return;

  deleteCity(city.id);
  ui.printInfo(`"${city.name}" eliminada.`);
}

async function optionSetDefault(): Promise<void> {
  const cities = getAllCities();
  if (cities.length === 0) {
    ui.printInfo("No hay ciudades guardadas. Usa la opción 3.");
    return;
  }
  const city = await ui.pickCity(cities, "Nueva ciudad default");
  if (!city) return;

  setDefaultCity(city.id);
  ui.printInfo(`"${city.name}" ahora es la ciudad default.`);
}

async function optionSettings(): Promise<void> {
  const unit = await ui.pickUnit(getUnit());
  if (!unit) return;

  setUnit(unit);
  ui.printInfo(`Unidad: ${unit === "celsius" ? "°C" : "°F"}`);
}

async function main(): Promise<void> {
  while (true) {
    ui.printMenu(getAllCities().length, getUnit());
    const option = await ui.askMenuOption();

    try {
      switch (option) {
        case 1:
          await optionDefaultWeather();
          break;
        case 2:
          await optionAllWeather();
          break;
        case 3:
          await optionAddCity();
          break;
        case 4:
          await optionDeleteCity();
          break;
        case 5:
          await optionSetDefault();
          break;
        case 8:
          await optionSettings();
          break;
        case 9:
          console.log();
          return;
      }
    } catch (error) {
      ui.printError(error instanceof Error ? error.message : String(error));
    }
  }
}

await main();

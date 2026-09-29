import { geocode } from "../api/geocoding";
import {
  confirmAdd,
  askCityName,
  pickGeocodedCity,
  printError,
  printInfo,
  startSpinner,
} from "../presentation";
import { addCity, getAllCities, getDefaultCity } from "../storage";

export async function addCityAction(): Promise<void> {
  const name = await askCityName();
  if (!name) return;

  const stop = startSpinner(`Buscando "${name}"…`);
  let candidates;
  try {
    candidates = await geocode(name);
  } finally {
    stop();
  }
  if (candidates.length === 0) {
    printError(`No se encontró "${name}"`);
    return;
  }

  const found = await pickGeocodedCity(candidates);
  if (!found) return;

  const duplicate = getAllCities().some(
    (c) => c.name === found.name && c.latitude === found.latitude,
  );
  if (duplicate) {
    printInfo(`"${found.name}" ya está guardada.`);
    return;
  }
  if (!(await confirmAdd(found.name, found.detail))) return;

  addCity(found);
  const isDefault = getDefaultCity()?.name === found.name;
  printInfo(`"${found.name}" agregada${isDefault ? " (default)" : ""}.`);
}

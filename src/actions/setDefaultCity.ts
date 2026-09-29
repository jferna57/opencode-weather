import { pickCity, printInfo } from "../presentation";
import { getAllCities, setDefaultCity } from "../storage";

export async function setDefaultCityAction(): Promise<void> {
  const cities = getAllCities();
  if (cities.length === 0) {
    printInfo("No hay ciudades guardadas. Usa la opción 3.");
    return;
  }
  const city = await pickCity(cities, "Nueva ciudad default");
  if (!city) return;

  setDefaultCity(city.id);
  printInfo(`"${city.name}" ahora es la ciudad default.`);
}

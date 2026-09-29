import { printCityList, printInfo } from "../presentation";
import { getAllCities } from "../storage";

export async function listCitiesAction(): Promise<void> {
  const cities = getAllCities();
  if (cities.length === 0) {
    printInfo("No hay ciudades guardadas. Usa la opción 3.");
    return;
  }
  printCityList(cities);
}

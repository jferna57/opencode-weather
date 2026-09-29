import { confirmDelete, pickCity, printInfo } from "../presentation";
import { deleteCity, getAllCities } from "../storage";

export async function removeCityAction(): Promise<void> {
  const cities = getAllCities();
  if (cities.length === 0) {
    printInfo("No hay ciudades guardadas.");
    return;
  }
  const city = await pickCity(cities, "Ciudad a eliminar");
  if (!city) return;
  if (!(await confirmDelete(city))) return;

  deleteCity(city.id);
  printInfo(`"${city.name}" eliminada.`);
}

import { fetchAlerts } from "../api/alerts";
import { printAlerts, printInfo, startSpinner } from "../presentation";
import { getAllCities, getUnit } from "../storage";

export async function alertsAction(): Promise<void> {
  const cities = getAllCities();
  if (cities.length === 0) {
    printInfo("No hay ciudades guardadas. Usa la opción 3.");
    return;
  }

  const stop = startSpinner(`Revisando alertas de ${cities.length} ciudades…`);
  try {
    const results = await fetchAlerts(cities, getUnit());
    stop();
    printAlerts(results);
  } catch (error) {
    stop();
    throw error;
  }
}

import {
  addCityAction,
  alertsAction,
  getAllWeather,
  getDefaultForecast,
  getDefaultWeather,
  getPickForecast,
  listCitiesAction,
  removeCityAction,
  setDefaultCityAction,
  settingsAction,
} from "./actions";
import { askMenuOption, printError, printMenu } from "./presentation";
import { getAllCities, getUnit } from "./storage";

async function main(): Promise<void> {
  while (true) {
    printMenu(getAllCities().length, getUnit());
    const option = await askMenuOption();

    try {
      switch (option) {
        case 1:
          await getDefaultWeather();
          break;
        case 2:
          await getAllWeather();
          break;
        case 3:
          await addCityAction();
          break;
        case 4:
          await removeCityAction();
          break;
        case 5:
          await setDefaultCityAction();
          break;
        case 6:
          await getDefaultForecast();
          break;
        case 7:
          await getPickForecast();
          break;
        case 8:
          await settingsAction();
          break;
        case 9:
          await alertsAction();
          break;
        case 10:
          await listCitiesAction();
          break;
        case 0:
          console.log();
          return;
      }
    } catch (error) {
      printError(error instanceof Error ? error.message : String(error));
    }
  }
}

await main();

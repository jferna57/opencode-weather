import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import "./helpers/sandbox";
import * as realActions from "../src/actions";
import * as realPresentation from "../src/presentation";
import * as realStorage from "../src/storage";
import { mockWithRestore } from "./helpers/modules";
import { silenceConsole } from "./helpers/console";
import type { City, MenuOption, Unit } from "../src/types";

/**
 * `src/index.ts` arranca solo con un `await main()` en el nivel superior y no
 * exporta nada, así que importarlo ejecuta el bucle del menú. Para poder
 * repetirlo en cada prueba se importa con una query distinta cada vez: Bun
 * evalúa de nuevo el módulo cuando cambia, en lugar de devolver el de la
 * caché. Sin esto, el bloat solo podría probarse una vez en todo el proceso.
 */

const actions = {
  addCityAction: mock(async () => {}),
  alertsAction: mock(async () => {}),
  getAllWeather: mock(async () => {}),
  getDefaultForecast: mock(async () => {}),
  getDefaultWeather: mock(async () => {}),
  getPickForecast: mock(async () => {}),
  listCitiesAction: mock(async () => {}),
  removeCityAction: mock(async () => {}),
  setDefaultCityAction: mock(async () => {}),
  settingsAction: mock(async () => {}),
};

const presentation = {
  askMenuOption: mock(async (): Promise<MenuOption> => 0),
  printError: mock((_message: string) => {}),
  printMenu: mock((_cityCount: number, _unit: Unit) => {}),
};

const storage = {
  getAllCities: mock((): City[] => []),
  getUnit: mock((): Unit => "celsius"),
};

let options: MenuOption[] = [];
presentation.askMenuOption.mockImplementation(async () => options.shift() ?? 0);

mockWithRestore("./src/actions", realActions, () => actions);
mockWithRestore("./src/presentation", realPresentation, () => presentation);
mockWithRestore("./src/storage", realStorage, () => storage);

let run = 0;


/** Ejecuta el bucle del menú con la secuencia de opciones indicada. */
async function runMenu(sequence: MenuOption[]): Promise<void> {
  options = sequence;
  run += 1;
  await import(`../src/index?run=${run}`);
}

let restoreConsole: () => void;
beforeEach(() => {
  restoreConsole = silenceConsole();
});
afterEach(() => {
  restoreConsole();
  for (const fn of Object.values(actions)) fn.mockReset();
  for (const fn of Object.values(presentation)) fn.mockReset();
  for (const fn of Object.values(storage)) fn.mockReset();
  presentation.askMenuOption.mockImplementation(async () => options.shift() ?? 0);
  storage.getAllCities.mockImplementation(() => []);
  storage.getUnit.mockImplementation(() => "celsius");
  options = [];
});

describe("menu loop", () => {
  test("dispatches every option to its own action, then exits", async () => {
    await runMenu([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0]);

    expect(actions.getDefaultWeather).toHaveBeenCalledTimes(1);
    expect(actions.getAllWeather).toHaveBeenCalledTimes(1);
    expect(actions.addCityAction).toHaveBeenCalledTimes(1);
    expect(actions.removeCityAction).toHaveBeenCalledTimes(1);
    expect(actions.setDefaultCityAction).toHaveBeenCalledTimes(1);
    expect(actions.getDefaultForecast).toHaveBeenCalledTimes(1);
    expect(actions.getPickForecast).toHaveBeenCalledTimes(1);
    expect(actions.settingsAction).toHaveBeenCalledTimes(1);
    expect(actions.alertsAction).toHaveBeenCalledTimes(1);
    expect(actions.listCitiesAction).toHaveBeenCalledTimes(1);
  });

  test("exits without dispatching anything", async () => {
    await runMenu([0]);

    for (const fn of Object.values(actions)) expect(fn).not.toHaveBeenCalled();
  });

  test("waits for each action before showing the menu again", async () => {
    const order: string[] = [];
    actions.getDefaultWeather.mockImplementation(async () => {
      order.push("accion");
    });
    presentation.printMenu.mockImplementation(() => {
      order.push("menu");
    });

    await runMenu([1, 0]);

    // Menú, acción, menú y exit: el `await` del switch es lo que garantiza que
    // la acción larga no se solape con el siguiente menú.
    expect(order).toEqual(["menu", "accion", "menu"]);
  });

  test("redraws the menu on every iteration with the current state", async () => {
    storage.getAllCities.mockImplementation(() => [
      { id: 1, name: "Madrid", latitude: 40.4, longitude: -3.7, is_default: true },
    ]);
    storage.getUnit.mockImplementation(() => "fahrenheit");

    await runMenu([1, 2, 0]);

    expect(presentation.printMenu).toHaveBeenCalledTimes(3);
    expect(presentation.printMenu).toHaveBeenCalledWith(1, "fahrenheit");
  });

  test("reports the error of a failing action and carries on", async () => {
    actions.getDefaultWeather.mockImplementation(async () => {
      throw new Error("Pronóstico falló (HTTP 500)");
    });

    await runMenu([1, 2, 0]);

    expect(presentation.printError).toHaveBeenCalledWith("Pronóstico falló (HTTP 500)");
    // El bucle no se cae: la siguiente opción se sigue atendiendo.
    expect(actions.getAllWeather).toHaveBeenCalledTimes(1);
  });

  test("stringifies a rejection that is not an Error", async () => {
    actions.listCitiesAction.mockImplementation(async () => {
      throw "fallo raro";
    });

    await runMenu([10, 0]);

    expect(presentation.printError).toHaveBeenCalledWith("fallo raro");
  });

  test("keeps looping while the user keeps choosing options", async () => {
    await runMenu([1, 1, 1, 1, 0]);

    expect(actions.getDefaultWeather).toHaveBeenCalledTimes(4);
    expect(presentation.printMenu).toHaveBeenCalledTimes(5);
  });

  test("does not report anything when no action fails", async () => {
    await runMenu([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0]);

    expect(presentation.printError).not.toHaveBeenCalled();
  });
});

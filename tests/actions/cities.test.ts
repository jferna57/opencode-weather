import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { silenceConsole } from "../helpers/console";
import {
  mockActionDeps,
  resetActionMocks,
  resetStorage,
  seedCity,
  storage,
} from "../helpers/actionHarness";
import type { City } from "../../src/types";


const harness = mockActionDeps();
const { presentation } = harness;
const { listCitiesAction } = await import("../../src/actions/listCities");
const { removeCityAction } = await import("../../src/actions/removeCity");
const { setDefaultCityAction } = await import("../../src/actions/setDefaultCity");

let restoreConsole: () => void;
beforeEach(() => {
  resetStorage();
  restoreConsole = silenceConsole();
});
afterEach(() => {
  restoreConsole();
  resetActionMocks(harness);
});

describe("listCitiesAction", () => {
  test("explains that there are no saved cities", async () => {
    await listCitiesAction();

    expect(presentation.printInfo).toHaveBeenCalledWith(
      "No hay ciudades guardadas. Usa la opción 3.",
    );
    expect(presentation.printCityList).not.toHaveBeenCalled();
  });

  test("prints the stored cities", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);

    await listCitiesAction();

    expect(presentation.printCityList).toHaveBeenCalledTimes(1);
    const printed = presentation.printCityList.mock.calls[0]![0] as City[];
    expect(printed.map((c) => c.name)).toEqual(["Madrid", "París"]);
    expect(printed[0]?.is_default).toBe(true);
  });
});

describe("removeCityAction", () => {
  test("explains that there are no saved cities", async () => {
    await removeCityAction();

    expect(presentation.printInfo).toHaveBeenCalledWith("No hay ciudades guardadas.");
    expect(presentation.pickCity).not.toHaveBeenCalled();
  });

  test("asks which city to delete", async () => {
    const madrid = seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);
    presentation.pickCity.mockResolvedValue(madrid);

    await removeCityAction();

    expect(presentation.pickCity).toHaveBeenCalledWith(
      storage.getAllCities(),
      "Ciudad a eliminar",
    );
  });

  test("does nothing when the selection is cancelled", async () => {
    seedCity("Madrid", 40.4168, -3.7038);

    await removeCityAction();

    expect(presentation.confirmDelete).not.toHaveBeenCalled();
    expect(storage.getAllCities()).toHaveLength(1);
    expect(presentation.printInfo).not.toHaveBeenCalled();
  });

  test("does nothing when the confirmation is declined", async () => {
    const madrid = seedCity("Madrid", 40.4168, -3.7038);
    presentation.pickCity.mockResolvedValue(madrid);

    await removeCityAction();

    expect(presentation.confirmDelete).toHaveBeenCalledWith(madrid);
    expect(storage.getAllCities()).toHaveLength(1);
  });

  test("deletes the confirmed city and says so", async () => {
    const madrid = seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);
    presentation.pickCity.mockResolvedValue(madrid);
    presentation.confirmDelete.mockResolvedValue(true);

    await removeCityAction();

    expect(storage.getAllCities().map((c) => c.name)).toEqual(["París"]);
    expect(presentation.printInfo).toHaveBeenCalledWith('"Madrid" eliminada.');
  });

  test("leaves the remaining cities untouched", async () => {
    const madrid = seedCity("Madrid", 40.4168, -3.7038);
    const paris = seedCity("París", 48.8566, 2.3522);
    presentation.pickCity.mockResolvedValue(paris);
    presentation.confirmDelete.mockResolvedValue(true);

    await removeCityAction();

    const left = storage.getAllCities();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ name: "Madrid", is_default: true });
    expect(madrid.is_default).toBe(true);
  });
});

describe("setDefaultCityAction", () => {
  test("explains that there are no saved cities", async () => {
    await setDefaultCityAction();

    expect(presentation.printInfo).toHaveBeenCalledWith(
      "No hay ciudades guardadas. Usa la opción 3.",
    );
    expect(presentation.pickCity).not.toHaveBeenCalled();
  });

  test("does nothing when the selection is cancelled", async () => {
    const madrid = seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);

    await setDefaultCityAction();

    expect(presentation.pickCity).toHaveBeenCalledWith(
      storage.getAllCities(),
      "Nueva ciudad default",
    );
    expect(storage.getDefaultCity()?.id).toBe(madrid.id);
  });

  test("moves the default flag to the chosen city", async () => {
    const madrid = seedCity("Madrid", 40.4168, -3.7038);
    const paris = seedCity("París", 48.8566, 2.3522);
    presentation.pickCity.mockResolvedValue(paris);

    await setDefaultCityAction();

    expect(storage.getDefaultCity()?.id).toBe(paris.id);
    expect(storage.getAllCities().find((c) => c.id === madrid.id)?.is_default).toBe(false);
    expect(presentation.printInfo).toHaveBeenCalledWith(
      '"París" ahora es la ciudad default.',
    );
  });

  test("keeps every city, only the flag changes", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);
    seedCity("Zaragoza", 41.6488, -0.8891);

    const target = storage.getAllCities().find((c) => c.name === "Zaragoza")!;
    presentation.pickCity.mockResolvedValue(target);

    await setDefaultCityAction();

    expect(storage.getAllCities()).toHaveLength(3);
    expect(storage.getAllCities().filter((c) => c.is_default)).toHaveLength(1);
    expect(storage.getDefaultCity()?.name).toBe("Zaragoza");
  });
});

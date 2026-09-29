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
const { api, presentation } = harness;
const { getDefaultForecast, getPickForecast } = await import(
  "../../src/actions/forecast"
);

const FORECAST = [
  { date: "2026-10-01", tempMax: 21, tempMin: 11, weathercode: 0 },
  { date: "2026-10-02", tempMax: 22, tempMin: 12, weathercode: 3 },
];

let restoreConsole: () => void;
beforeEach(() => {
  resetStorage();
  restoreConsole = silenceConsole();
  api.fetchForecast.mockImplementation(async () => FORECAST);
});
afterEach(() => {
  restoreConsole();
  resetActionMocks(harness);
});

describe("getDefaultForecast", () => {
  test("explains that there is no default city", async () => {
    await getDefaultForecast();

    expect(presentation.printInfo).toHaveBeenCalledWith(
      "No hay ciudad default. Usa la opción 5.",
    );
    expect(api.fetchForecast).not.toHaveBeenCalled();
  });

  test("forecasts the default city and prints the result", async () => {
    seedCity("Madrid", 40.4168, -3.7038);

    await getDefaultForecast();

    expect(api.fetchForecast).toHaveBeenCalledWith(40.4168, -3.7038, "celsius");
    expect(presentation.printForecast).toHaveBeenCalledWith(
      "Madrid",
      FORECAST,
      "celsius",
    );
  });

  test("uses the unit stored in the settings", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    storage.setUnit("fahrenheit");

    await getDefaultForecast();

    expect(api.fetchForecast).toHaveBeenCalledWith(40.4168, -3.7038, "fahrenheit");
    expect(presentation.printForecast).toHaveBeenCalledWith(
      "Madrid",
      FORECAST,
      "fahrenheit",
    );
  });

  test("spins while the request is in flight", async () => {
    seedCity("Madrid", 40.4168, -3.7038);

    await getDefaultForecast();

    expect(presentation.startSpinner).toHaveBeenCalledWith(
      "Consultando pronóstico de Madrid…",
    );
    expect(presentation.startSpinner.mock.results[0]!.value).toHaveBeenCalled();
  });

  test("stops the spinner and propagates the error when the API fails", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    api.fetchForecast.mockRejectedValue(new Error("Pronóstico falló (HTTP 500)"));

    await expect(getDefaultForecast()).rejects.toThrow("HTTP 500");

    expect(presentation.startSpinner.mock.results[0]!.value).toHaveBeenCalled();
    expect(presentation.printForecast).not.toHaveBeenCalled();
  });
});

describe("getPickForecast", () => {
  test("explains that there are no saved cities", async () => {
    await getPickForecast();

    expect(presentation.printInfo).toHaveBeenCalledWith(
      "No hay ciudades guardadas. Usa la opción 3.",
    );
    expect(presentation.pickCity).not.toHaveBeenCalled();
  });

  test("asks which city to forecast", async () => {
    const madrid = seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);
    presentation.pickCity.mockResolvedValue(madrid);

    await getPickForecast();

    expect(presentation.pickCity).toHaveBeenCalledWith(
      storage.getAllCities(),
      "Ciudad para el pronóstico",
    );
    expect(api.fetchForecast).toHaveBeenCalledWith(40.4168, -3.7038, "celsius");
  });

  test("forecasts the city that was chosen, not the default one", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    const paris = seedCity("París", 48.8566, 2.3522);
    presentation.pickCity.mockImplementation(async (cities: City[]) => cities[1]!);

    await getPickForecast();

    expect(api.fetchForecast).toHaveBeenCalledWith(48.8566, 2.3522, "celsius");
    expect(presentation.printForecast.mock.calls[0]?.[0]).toBe("París");
    expect(paris.is_default).toBe(false);
  });

  test("does nothing when the user cancels the selection", async () => {
    seedCity("Madrid", 40.4168, -3.7038);

    await getPickForecast();

    expect(presentation.pickCity).toHaveBeenCalled();
    expect(api.fetchForecast).not.toHaveBeenCalled();
    expect(presentation.startSpinner).not.toHaveBeenCalled();
  });

  test("stops the spinner and propagates the error when the API fails", async () => {
    const madrid = seedCity("Madrid", 40.4168, -3.7038);
    presentation.pickCity.mockResolvedValue(madrid);
    api.fetchForecast.mockRejectedValue(new Error("HTTP 503"));

    await expect(getPickForecast()).rejects.toThrow("HTTP 503");

    expect(presentation.startSpinner.mock.results[0]!.value).toHaveBeenCalled();
  });
});

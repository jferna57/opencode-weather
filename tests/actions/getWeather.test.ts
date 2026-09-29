import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { silenceConsole } from "../helpers/console";
import {
  mockActionDeps,
  resetActionMocks,
  resetStorage,
  seedCity,
  storage,
} from "../helpers/actionHarness";


const harness = mockActionDeps();
const { api, presentation } = harness;
const { getDefaultWeather, getAllWeather } = await import("../../src/actions/getWeather");

let restoreConsole: () => void;
beforeEach(() => {
  resetStorage();
  restoreConsole = silenceConsole();
});
afterEach(() => {
  restoreConsole();
  resetActionMocks(harness);
});

describe("getDefaultWeather", () => {
  test("explains that there is no default city instead of failing", async () => {
    await getDefaultWeather();

    expect(presentation.printInfo).toHaveBeenCalledWith(
      "No hay ciudad default. Usa la opción 5.",
    );
    expect(api.fetchWeather).not.toHaveBeenCalled();
    expect(presentation.startSpinner).not.toHaveBeenCalled();
  });

  test("queries and prints the default city", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    api.fetchWeather.mockResolvedValue(21.5);

    await getDefaultWeather();

    expect(api.fetchWeather).toHaveBeenCalledWith(40.4168, -3.7038, "celsius");
    expect(presentation.printWeather).toHaveBeenCalledWith("Madrid", 21.5, "celsius");
  });

  test("uses the unit stored in the settings", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    storage.setUnit("fahrenheit");

    await getDefaultWeather();

    expect(api.fetchWeather).toHaveBeenCalledWith(40.4168, -3.7038, "fahrenheit");
    expect(presentation.printWeather).toHaveBeenCalledWith("Madrid", 21.5, "fahrenheit");
  });

  test("only asks for the city marked as default", async () => {
    const madrid = seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);
    storage.setDefaultCity(madrid.id);

    await getDefaultWeather();

    expect(presentation.printWeather).toHaveBeenCalledTimes(1);
    expect(presentation.printWeather).toHaveBeenCalledWith("Madrid", 21.5, "celsius");
  });

  test("starts and stops the spinner around the request", async () => {
    seedCity("Madrid", 40.4168, -3.7038);

    await getDefaultWeather();

    expect(presentation.startSpinner).toHaveBeenCalledWith("Consultando clima de Madrid…");
    const stop = presentation.startSpinner.mock.results[0]!.value;
    expect(stop).toHaveBeenCalled();
  });

  test("stops the spinner and propagates the error when the API fails", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    api.fetchWeather.mockRejectedValue(new Error("Pronóstico falló (HTTP 500)"));

    await expect(getDefaultWeather()).rejects.toThrow("HTTP 500");

    const stop = presentation.startSpinner.mock.results[0]!.value;
    expect(stop).toHaveBeenCalled();
    expect(presentation.printWeather).not.toHaveBeenCalled();
  });
});

describe("getAllWeather", () => {
  test("explains that there are no saved cities", async () => {
    await getAllWeather();

    expect(presentation.printInfo).toHaveBeenCalledWith(
      "No hay ciudades guardadas. Usa la opción 3.",
    );
    expect(api.fetchWeather).not.toHaveBeenCalled();
  });

  test("prints the weather of every saved city in order", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);

    await getAllWeather();

    expect(presentation.printWeather).toHaveBeenCalledTimes(2);
    // `getAllCities` ordena por default y luego por nombre, así que Madrid
    // (la primera añadida, que queda como default) va primero.
    expect(presentation.printWeather.mock.calls.map((c) => c[0])).toEqual([
      "Madrid",
      "París",
    ]);
  });

  test("spins once per city", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);

    await getAllWeather();

    expect(presentation.startSpinner).toHaveBeenCalledTimes(2);
    expect(presentation.startSpinner).toHaveBeenNthCalledWith(
      1,
      "Consultando clima de Madrid…",
    );
    expect(presentation.startSpinner).toHaveBeenNthCalledWith(
      2,
      "Consultando clima de París…",
    );
  });

  test("stops the spinner and propagates the error when a city fails", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    api.fetchWeather.mockRejectedValue(new Error("HTTP 503"));

    await expect(getAllWeather()).rejects.toThrow("HTTP 503");

    const stop = presentation.startSpinner.mock.results[0]!.value;
    expect(stop).toHaveBeenCalled();
  });
});

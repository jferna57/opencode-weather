import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { silenceConsole } from "../helpers/console";
import {
  mockActionDeps,
  resetActionMocks,
  resetStorage,
  seedCity,
  storage,
} from "../helpers/actionHarness";
import type { CityAlerts } from "../../src/types";


const harness = mockActionDeps();
const { api, presentation } = harness;
const { alertsAction } = await import("../../src/actions/alerts");

let restoreConsole: () => void;
beforeEach(() => {
  resetStorage();
  restoreConsole = silenceConsole();
});
afterEach(() => {
  restoreConsole();
  resetActionMocks(harness);
});

function results(): CityAlerts[] {
  return [
    {
      city: storage.getAllCities()[0]!,
      alerts: [
        {
          kind: "tormenta",
          severity: "danger",
          title: "Tormenta fuerte con granizo",
          date: "2026-10-01",
        },
      ],
    },
  ];
}

describe("alertsAction", () => {
  test("explains that there are no saved cities", async () => {
    await alertsAction();

    expect(presentation.printInfo).toHaveBeenCalledWith(
      "No hay ciudades guardadas. Usa la opción 3.",
    );
    expect(api.fetchAlerts).not.toHaveBeenCalled();
    expect(presentation.startSpinner).not.toHaveBeenCalled();
  });

  test("evaluates every saved city in one go", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);
    api.fetchAlerts.mockImplementation(async () => results());

    await alertsAction();

    expect(api.fetchAlerts).toHaveBeenCalledWith(storage.getAllCities(), "celsius");
    expect(presentation.printAlerts).toHaveBeenCalledTimes(1);
  });

  test("passes the whole list so the API can answer in a single request", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);
    seedCity("Zaragoza", 41.6488, -0.8891);

    await alertsAction();

    const cities = api.fetchAlerts.mock.calls[0]![0];
    expect(cities).toHaveLength(3);
    expect(api.fetchAlerts).toHaveBeenCalledTimes(1);
  });

  test("uses the unit stored in the settings", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    storage.setUnit("fahrenheit");

    await alertsAction();

    expect(api.fetchAlerts).toHaveBeenCalledWith(storage.getAllCities(), "fahrenheit");
  });

  test("announces how many cities it is checking", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    seedCity("París", 48.8566, 2.3522);

    await alertsAction();

    expect(presentation.startSpinner).toHaveBeenCalledWith(
      "Revisando alertas de 2 ciudades…",
    );
  });

  test("prints whatever the API returned", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    const evaluated = results();
    api.fetchAlerts.mockImplementation(async () => evaluated);

    await alertsAction();

    expect(presentation.printAlerts).toHaveBeenCalledWith(evaluated);
  });

  test("stops the spinner and propagates the error when the API fails", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    api.fetchAlerts.mockRejectedValue(new Error("Alertas fallaron (HTTP 500)"));

    await expect(alertsAction()).rejects.toThrow("HTTP 500");

    expect(presentation.startSpinner.mock.results[0]!.value).toHaveBeenCalled();
    expect(presentation.printAlerts).not.toHaveBeenCalled();
  });
});

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "weather-cli-test-"));
process.env.WEATHER_CONFIG_DIR = tempDir;

// El import es dinámico a propósito: `WEATHER_CONFIG_DIR` debe fijarse
// antes de que los módulos de almacenamiento abran la base de datos.
const cities = await import("../../src/storage/citiesStorage");
const settings = await import("../../src/storage/settingsStorage");

beforeEach(() => {
  cities.deleteAllCities();
  settings.setUnit("celsius");
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("cities storage", () => {
  test("adds a city and returns it", () => {
    const city = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    expect(city.id).toBeGreaterThan(0);
    expect(city.name).toBe("Madrid");
    expect(city.is_default).toBe(true);
  });

  test("first city becomes default automatically", () => {
    cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    cities.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });
    expect(cities.getDefaultCity()?.name).toBe("Madrid");
    expect(cities.getAllCities()).toHaveLength(2);
  });

  test("setDefaultCity switches the default", () => {
    const a = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    const b = cities.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });
    cities.setDefaultCity(b.id);
    expect(cities.getDefaultCity()?.name).toBe("Paris");
    expect(cities.getAllCities().find((c) => c.id === a.id)?.is_default).toBe(false);
  });

  test("deleteCity removes the city", () => {
    const city = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    cities.deleteCity(city.id);
    expect(cities.getAllCities()).toHaveLength(0);
    expect(cities.getDefaultCity()).toBeNull();
  });

  test("cities are ordered with default first then by name", () => {
    const a = cities.addCity({ name: "Zaragoza", latitude: 41.6, longitude: -0.9 });
    cities.addCity({ name: "Barcelona", latitude: 41.4, longitude: 2.2 });
    cities.setDefaultCity(a.id);
    const names = cities.getAllCities().map((c) => c.name);
    expect(names).toEqual(["Zaragoza", "Barcelona"]);
  });
});

describe("settings storage", () => {
  test("defaults to celsius", () => {
    expect(settings.getUnit()).toBe("celsius");
  });

  test("persists unit changes", () => {
    settings.setUnit("fahrenheit");
    expect(settings.getUnit()).toBe("fahrenheit");
    settings.setUnit("celsius");
    expect(settings.getUnit()).toBe("celsius");
  });
});

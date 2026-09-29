import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "weather-cli-test-"));
process.env.WEATHER_CONFIG_DIR = tempDir;

const db = await import("./db");

beforeEach(() => {
  db.deleteAllCities();
  db.setUnit("celsius");
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("cities storage", () => {
  test("adds a city and returns it", () => {
    const city = db.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    expect(city.id).toBeGreaterThan(0);
    expect(city.name).toBe("Madrid");
    expect(city.is_default).toBe(true);
  });

  test("first city becomes default automatically", () => {
    db.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    db.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });
    expect(db.getDefaultCity()?.name).toBe("Madrid");
    expect(db.getAllCities()).toHaveLength(2);
  });

  test("setDefaultCity switches the default", () => {
    const a = db.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    const b = db.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });
    db.setDefaultCity(b.id);
    expect(db.getDefaultCity()?.name).toBe("Paris");
    expect(db.getAllCities().find((c) => c.id === a.id)?.is_default).toBe(false);
  });

  test("deleteCity removes the city", () => {
    const city = db.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    db.deleteCity(city.id);
    expect(db.getAllCities()).toHaveLength(0);
    expect(db.getDefaultCity()).toBeNull();
  });

  test("cities are ordered with default first then by name", () => {
    const a = db.addCity({ name: "Zaragoza", latitude: 41.6, longitude: -0.9 });
    db.addCity({ name: "Barcelona", latitude: 41.4, longitude: 2.2 });
    db.setDefaultCity(a.id);
    const names = db.getAllCities().map((c) => c.name);
    expect(names).toEqual(["Zaragoza", "Barcelona"]);
  });
});

describe("settings storage", () => {
  test("defaults to celsius", () => {
    expect(db.getUnit()).toBe("celsius");
  });

  test("persists unit changes", () => {
    db.setUnit("fahrenheit");
    expect(db.getUnit()).toBe("fahrenheit");
    db.setUnit("celsius");
    expect(db.getUnit()).toBe("celsius");
  });
});

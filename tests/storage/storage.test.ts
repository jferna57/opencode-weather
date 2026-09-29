import { beforeEach, describe, expect, test } from "bun:test";
import "../helpers/sandbox";

// `database.ts` abre la conexión SQLite al importarse y es un singleton del
// proceso, así que el import tiene que ser dinámico: es la única forma de
// garantizar que el sandbox ya ha fijado `WEATHER_CONFIG_DIR`. Con un `import`
// estático se evalúan antes que el cuerpo del módulo y la base de datos se
// abriría en el directorio real del usuario.
const cities = await import("../../src/storage/citiesStorage");
const settings = await import("../../src/storage/settingsStorage");
const { db } = await import("../../src/storage/database");


beforeEach(() => {
  cities.deleteAllCities();
  settings.setUnit("celsius");
});

describe("cities storage", () => {
  test("adds a city and returns it", () => {
    const city = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    expect(city.id).toBeGreaterThan(0);
    expect(city.name).toBe("Madrid");
    expect(city.is_default).toBe(true);
  });

  test("keeps the coordinates it was given", () => {
    const city = cities.addCity({ name: "Madrid", latitude: 40.4168, longitude: -3.7038 });
    expect(city.latitude).toBeCloseTo(40.4168, 5);
    expect(city.longitude).toBeCloseTo(-3.7038, 5);
  });

  test("first city becomes default automatically", () => {
    cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    cities.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });
    expect(cities.getDefaultCity()?.name).toBe("Madrid");
    expect(cities.getAllCities()).toHaveLength(2);
  });

  test("getDefaultCity is null with no cities", () => {
    expect(cities.getDefaultCity()).toBeNull();
    expect(cities.getAllCities()).toEqual([]);
  });

  test("setDefaultCity switches the default", () => {
    const a = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    const b = cities.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });
    cities.setDefaultCity(b.id);
    expect(cities.getDefaultCity()?.name).toBe("Paris");
    expect(cities.getAllCities().find((c) => c.id === a.id)?.is_default).toBe(false);
  });

  test("leaves exactly one default at a time", () => {
    cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    const b = cities.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });
    const c = cities.addCity({ name: "Berlin", latitude: 52.5, longitude: 13.4 });

    cities.setDefaultCity(b.id);
    cities.setDefaultCity(c.id);

    expect(cities.getAllCities().filter((city) => city.is_default)).toHaveLength(1);
    expect(cities.getDefaultCity()?.name).toBe("Berlin");
  });

  test("setDefaultCity with an unknown id does not invent a city", () => {
    // La transacción borra todos los flags antes de marcar el pedido, así que
    // con un id inexistente se queda sin default. Lo relevante es que no
    // aparece ninguna ciudad fantasma.
    const madrid = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });

    cities.setDefaultCity(9999);

    expect(cities.getAllCities()).toEqual([{ ...madrid, is_default: false }]);
    expect(cities.getDefaultCity()).toBeNull();
  });

  test("deleteCity removes the city", () => {
    const city = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    cities.deleteCity(city.id);
    expect(cities.getAllCities()).toHaveLength(0);
    expect(cities.getDefaultCity()).toBeNull();
  });

  test("deleting one city leaves the others", () => {
    const madrid = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    cities.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });

    cities.deleteCity(madrid.id);

    expect(cities.getAllCities().map((c) => c.name)).toEqual(["Paris"]);
  });

  test("deleteAllCities empties the table", () => {
    cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    cities.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });

    cities.deleteAllCities();

    expect(cities.getAllCities()).toEqual([]);
    expect(cities.getDefaultCity()).toBeNull();
  });

  test("cities are ordered with default first then by name", () => {
    const a = cities.addCity({ name: "Zaragoza", latitude: 41.6, longitude: -0.9 });
    cities.addCity({ name: "Barcelona", latitude: 41.4, longitude: 2.2 });
    cities.setDefaultCity(a.id);
    const names = cities.getAllCities().map((c) => c.name);
    expect(names).toEqual(["Zaragoza", "Barcelona"]);
  });

  test("converts the is_default column to a boolean", () => {
    // La columna es un INTEGER y la interfaz de la app es boolean: si se
    // devolviera el 1 tal cual, `city.is_default` sería truthy pero no strict.
    const madrid = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    cities.addCity({ name: "Paris", latitude: 48.9, longitude: 2.3 });

    expect(madrid.is_default).toBe(true);
    expect(cities.getAllCities().find((c) => c.name === "Paris")!.is_default).toBe(false);
  });

  test("gives each city a distinct id", () => {
    const a = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });
    const b = cities.addCity({ name: "Madrid", latitude: 40.4, longitude: -3.7 });

    // El storage no deduplica: eso es responsabilidad de `addCityAction`.
    expect(b.id).not.toBe(a.id);
    expect(cities.getAllCities()).toHaveLength(2);
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

  test("overwrites the previous value instead of adding a row", () => {
    settings.setUnit("fahrenheit");
    settings.setUnit("celsius");

    const row = db.query("SELECT value FROM settings WHERE key = 'unit'").get() as {
      value: string;
    };
    expect(row.value).toBe("celsius");
    expect(settings.getUnit()).toBe("celsius");
  });

  test("falls back to celsius when the stored value is not a known unit", () => {
    // `key` es PRIMARY KEY, así que INSERT OR REPLACE emula lo que haría un
    // valor corrupto en el fichero.
    db.query("INSERT OR REPLACE INTO settings (key, value) VALUES ('unit', 'kelvin')").run();

    expect(settings.getUnit()).toBe("celsius");
  });
});

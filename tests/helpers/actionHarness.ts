import { mock } from "bun:test";
import "./sandbox";
import * as realApi from "../../src/api";
import * as realPresentation from "../../src/presentation";
import { mockWithRestore } from "./modules";
import type {
  City,
  CityAlerts,
  DailyForecast,
  GeocodedCity,
  MenuOption,
  Unit,
} from "../../src/types";

// El almacenamiento se importa de forma dinámica y no se reexporta desde un
// `import` estático en los tests: `database.ts` abre la conexión SQLite al
// cargarse y solo respeta `WEATHER_CONFIG_DIR` si el sandbox se ha fijado
// antes. Haciéndolo aquí el orden queda garantizado, aunque el test importe este
// helper en la posición que sea. El almacenamiento es real a propósito: las
// acciones se prueban contra la base de datos de verdad, no contra un doble.
export const storage = await import("../../src/storage");

export interface ApiMocks {
  fetchWeather: ReturnType<typeof mock<(lat: number, lon: number, unit: Unit) => Promise<number>>>;
  fetchForecast: ReturnType<
    typeof mock<(lat: number, lon: number, unit: Unit) => Promise<DailyForecast[]>>
  >;
  fetchAlerts: ReturnType<typeof mock<(cities: City[], unit: Unit) => Promise<CityAlerts[]>>>;
  geocode: ReturnType<typeof mock<(city: string) => Promise<GeocodedCity[]>>>;
}

export interface PresentationMocks {
  printWeather: ReturnType<typeof mock<(name: string, temp: number, unit: Unit) => void>>;
  printForecast: ReturnType<
    typeof mock<(name: string, forecast: DailyForecast[], unit: Unit) => void>
  >;
  printAlerts: ReturnType<typeof mock<(results: CityAlerts[]) => void>>;
  printCityList: ReturnType<typeof mock<(cities: City[]) => void>>;
  printError: ReturnType<typeof mock<(message: string) => void>>;
  printInfo: ReturnType<typeof mock<(message: string) => void>>;
  printMenu: ReturnType<typeof mock<(cityCount: number, unit: Unit) => void>>;
  startSpinner: ReturnType<typeof mock<(message: string) => () => void>>;
  askMenuOption: ReturnType<typeof mock<() => Promise<MenuOption>>>;
  askCityName: ReturnType<typeof mock<() => Promise<string | null>>>;
  pickGeocodedCity: ReturnType<
    typeof mock<(candidates: GeocodedCity[]) => Promise<GeocodedCity | null>>
  >;
  pickCity: ReturnType<typeof mock<(cities: City[], message: string) => Promise<City | null>>>;
  pickUnit: ReturnType<typeof mock<(current: Unit) => Promise<Unit | null>>>;
  confirmAdd: ReturnType<typeof mock<(name: string, detail: string) => Promise<boolean>>>;
  confirmDelete: ReturnType<typeof mock<(city: City) => Promise<boolean>>>;
}

export interface ActionHarness {
  api: ApiMocks;
  presentation: PresentationMocks;
}

function createApiMocks(): ApiMocks {
  return {
    fetchWeather: mock<(lat: number, lon: number, unit: Unit) => Promise<number>>(),
    fetchForecast: mock<(lat: number, lon: number, unit: Unit) => Promise<DailyForecast[]>>(),
    fetchAlerts: mock<(cities: City[], unit: Unit) => Promise<CityAlerts[]>>(),
    geocode: mock<(city: string) => Promise<GeocodedCity[]>>(),
  };
}

function createPresentationMocks(): PresentationMocks {
  return {
    printWeather: mock<(name: string, temp: number, unit: Unit) => void>(),
    printForecast: mock<(name: string, forecast: DailyForecast[], unit: Unit) => void>(),
    printAlerts: mock<(results: CityAlerts[]) => void>(),
    printCityList: mock<(cities: City[]) => void>(),
    printError: mock<(message: string) => void>(),
    printInfo: mock<(message: string) => void>(),
    printMenu: mock<(cityCount: number, unit: Unit) => void>(),
    startSpinner: mock<(message: string) => () => void>(),
    askMenuOption: mock<() => Promise<MenuOption>>(),
    askCityName: mock<() => Promise<string | null>>(),
    pickGeocodedCity: mock<(candidates: GeocodedCity[]) => Promise<GeocodedCity | null>>(),
    pickCity: mock<(cities: City[], message: string) => Promise<City | null>>(),
    pickUnit: mock<(current: Unit) => Promise<Unit | null>>(),
    confirmAdd: mock<(name: string, detail: string) => Promise<boolean>>(),
    confirmDelete: mock<(city: City) => Promise<boolean>>(),
  };
}

/**
 * Respuestas por defecto de los dobles.
 *
 * Son deliberadamente "sin hacer nada": lo que se prueba es qué hace cada
 * acción con ellas, no la API real, que ya tiene su propio fichero de test.
 */
function applyApiDefaults(api: ApiMocks): void {
  api.fetchWeather.mockImplementation(async () => 21.5);
  api.fetchForecast.mockImplementation(async () => []);
  api.fetchAlerts.mockImplementation(async () => []);
  api.geocode.mockImplementation(async () => []);
}

function applyPresentationDefaults(presentation: PresentationMocks): void {
  // Por omisión el usuario cancela cualquier pregunta.
  presentation.askCityName.mockImplementation(async () => null);
  presentation.pickCity.mockImplementation(async () => null);
  presentation.pickUnit.mockImplementation(async () => null);
  presentation.confirmAdd.mockImplementation(async () => false);
  presentation.confirmDelete.mockImplementation(async () => false);
  presentation.askMenuOption.mockImplementation(async () => 0);
  // Excepción: con una sola coincidencia la app no pregunta nada y la usa
  // directamente, así que ese es el comportamiento por omisión. Para probar
  // la cancelación hay que devolver `null` explícitamente.
  presentation.pickGeocodedCity.mockImplementation(
    async (candidates: GeocodedCity[]) => candidates[0] ?? null,
  );
  // El spinner siempre devuelve una función de parada utilizable.
  presentation.startSpinner.mockImplementation(() => mock(() => {}));
}

/**
 * Instala los dobles de API y presentación y devuelve las instancias para
 * poder configurar sus respuestas y comprobar sus llamadas.
 *
 * El orden importa: hay que llamar a esta función y solo después importar el
 * módulo de la acción con `import()`, porque es en ese momento cuando se
 * decide qué versión de la API ve.
 */
export function mockActionDeps(): ActionHarness {
  const api = createApiMocks();
  const presentation = createPresentationMocks();

  applyApiDefaults(api);
  applyPresentationDefaults(presentation);

  mockWithRestore("./src/api", realApi, () => api);
  mockWithRestore("./src/presentation", realPresentation, () => presentation);

  return { api, presentation };
}

/**
 * Devuelve los dobles a su estado inicial.
 *
 * Hace falta en `afterEach` y no basta con `mockClear`: clear solo olvida las
 * llamadas, pero una respuesta configurada con `mockResolvedValue` o
 * `mockRejectedValue` se quedaría puesta y contaminaría la prueba siguiente.
 */
export function resetActionMocks({ api, presentation }: ActionHarness): void {
  for (const fn of Object.values(api)) fn.mockReset();
  for (const fn of Object.values(presentation)) fn.mockReset();

  applyApiDefaults(api);
  applyPresentationDefaults(presentation);
}


/** Deja la base de datos de pruebas como si el usuario la acabara de instalar. */
export function resetStorage(): void {
  storage.deleteAllCities();
  storage.setUnit("celsius");
}

/** Atajo para sembrar una ciudad ya guardada. */
export function seedCity(name: string, latitude: number, longitude: number): City {
  return storage.addCity({ name, latitude, longitude });
}

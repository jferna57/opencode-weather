import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { silenceConsole } from "../helpers/console";
import {
  mockActionDeps,
  resetActionMocks,
  resetStorage,
  seedCity,
  storage,
} from "../helpers/actionHarness";
import type { GeocodedCity } from "../../src/types";


const harness = mockActionDeps();
const { api, presentation } = harness;
const { addCityAction } = await import("../../src/actions/addCity");

const MADRID: GeocodedCity = {
  name: "Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
  detail: "Comunidad de Madrid, España",
};

let restoreConsole: () => void;
beforeEach(() => {
  resetStorage();
  restoreConsole = silenceConsole();
});
afterEach(() => {
  restoreConsole();
  resetActionMocks(harness);
});

describe("addCityAction", () => {
  test("does nothing when the name prompt is cancelled", async () => {
    await addCityAction();

    expect(api.geocode).not.toHaveBeenCalled();
    expect(presentation.printError).not.toHaveBeenCalled();
    expect(storage.getAllCities()).toHaveLength(0);
  });

  test("searches for exactly the name it was given", async () => {
    // Quitar espacios y rechazar el vacío es cosa de `askCityName`, ya cubierta
    // en su propio test; la acción solo reenvía el nombre.
    presentation.askCityName.mockResolvedValue("Madrid");

    await addCityAction();

    expect(api.geocode).toHaveBeenCalledWith("Madrid");
  });

  test("reports when the search finds nothing", async () => {
    presentation.askCityName.mockResolvedValue("xyzxyz");

    await addCityAction();

    expect(presentation.printError).toHaveBeenCalledWith('No se encontró "xyzxyz"');
    expect(presentation.pickGeocodedCity).not.toHaveBeenCalled();
    expect(storage.getAllCities()).toHaveLength(0);
  });

  test("stops the spinner and propagates the error when geocoding fails", async () => {
    presentation.askCityName.mockResolvedValue("Madrid");
    api.geocode.mockRejectedValue(new Error("Geocoding falló (HTTP 500)"));

    await expect(addCityAction()).rejects.toThrow("HTTP 500");

    expect(presentation.startSpinner).toHaveBeenCalledWith('Buscando "Madrid"…');
    expect(presentation.startSpinner.mock.results[0]!.value).toHaveBeenCalled();
  });

  test("does nothing when the user cancels the location picker", async () => {
    presentation.askCityName.mockResolvedValue("Madrid");
    api.geocode.mockResolvedValue([MADRID, { ...MADRID, name: "Madrid (MX)" }]);
    presentation.pickGeocodedCity.mockResolvedValue(null);

    await addCityAction();

    expect(presentation.pickGeocodedCity).toHaveBeenCalled();
    expect(presentation.confirmAdd).not.toHaveBeenCalled();
    expect(storage.getAllCities()).toHaveLength(0);
  });

  test("refuses a duplicate without asking for confirmation", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    presentation.askCityName.mockResolvedValue("Madrid");
    api.geocode.mockResolvedValue([MADRID]);

    await addCityAction();

    expect(presentation.printInfo).toHaveBeenCalledWith('"Madrid" ya está guardada.');
    expect(presentation.confirmAdd).not.toHaveBeenCalled();
    expect(storage.getAllCities()).toHaveLength(1);
  });

  test("allows the same name at different coordinates", async () => {
    // La comparación es por nombre *y* coordenadas, así que dos ciudades
    // homónimas de países distintos tienen que poder convivir.
    seedCity("Valencia", 39.4699, -0.3763);
    const valenciaVe = { ...MADRID, name: "Valencia", latitude: 10.16, longitude: -68.0077 };
    presentation.askCityName.mockResolvedValue("Valencia");
    api.geocode.mockResolvedValue([valenciaVe]);
    presentation.pickGeocodedCity.mockResolvedValue(valenciaVe);
    presentation.confirmAdd.mockResolvedValue(true);

    await addCityAction();

    expect(storage.getAllCities().map((c) => c.name)).toEqual(["Valencia", "Valencia"]);
    expect(storage.getAllCities().map((c) => c.latitude).sort()).toEqual([
      10.16, 39.4699,
    ]);
  });

  test("does not save anything when the confirmation is declined", async () => {
    presentation.askCityName.mockResolvedValue("Madrid");
    api.geocode.mockResolvedValue([MADRID]);

    await addCityAction();

    expect(presentation.confirmAdd).toHaveBeenCalledWith("Madrid", MADRID.detail);
    expect(storage.getAllCities()).toHaveLength(0);
  });

  test("saves the city and marks the first one as default", async () => {
    presentation.askCityName.mockResolvedValue("Madrid");
    api.geocode.mockResolvedValue([MADRID]);
    presentation.confirmAdd.mockResolvedValue(true);

    await addCityAction();

    const saved = storage.getAllCities();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      name: "Madrid",
      latitude: 40.4168,
      longitude: -3.7038,
      is_default: true,
    });
    expect(presentation.printInfo).toHaveBeenCalledWith('"Madrid" agregada (default).');
  });

  test("announces later cities without the default suffix", async () => {
    seedCity("Madrid", 40.4168, -3.7038);
    presentation.askCityName.mockResolvedValue("París");
    const paris: GeocodedCity = { ...MADRID, name: "París", latitude: 48.8566, longitude: 2.3522 };
    api.geocode.mockResolvedValue([paris]);
    presentation.pickGeocodedCity.mockResolvedValue(paris);
    presentation.confirmAdd.mockResolvedValue(true);

    await addCityAction();

    expect(storage.getAllCities()).toHaveLength(2);
    expect(presentation.printInfo).toHaveBeenCalledWith('"París" agregada.');
  });

  test("passes the found location to the confirmation prompt", async () => {
    presentation.askCityName.mockResolvedValue("Madrid");
    api.geocode.mockResolvedValue([MADRID]);
    presentation.pickGeocodedCity.mockResolvedValue(MADRID);

    await addCityAction();

    expect(presentation.pickGeocodedCity).toHaveBeenCalledWith([MADRID]);
    expect(presentation.confirmAdd).toHaveBeenCalledWith("Madrid", MADRID.detail);
  });
});

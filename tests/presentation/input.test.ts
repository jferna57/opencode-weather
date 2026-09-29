import { afterEach, describe, expect, mock, test } from "bun:test";
import * as realPrompt from "../../src/presentation/prompt";
import { mockWithRestore } from "../helpers/modules";
import type { City, GeocodedCity } from "../../src/types";

interface Choice {
  title: string;
  value: unknown;
}

interface Question {
  type?: string;
  name?: string;
  message?: string;
  initial?: unknown;
  choices?: Choice[];
  validate?: (value: string) => boolean | string;
}

/**
 * `ask` devuelve su propio `fallback` por defecto, que es exactamente lo que
 * hace `prompt.ts` cuando el usuario cancela: cada prueba parte de "cancelado"
 * y solo las que eligen algo simulan la respuesta.
 */
const askMock = mock(
  async (_questions: unknown, fallback: Record<string, unknown>) => ({ ...fallback }),
);

mockWithRestore("./src/presentation/prompt", realPrompt, () => ({
  ask: askMock,
}));

const input = await import("../../src/presentation/input");

function lastCall(): { question: Question; fallback: Record<string, unknown> } {
  const call = askMock.mock.calls.at(-1);
  if (!call) throw new Error("ask() no fue llamado");
  return {
    question: call[0] as Question,
    fallback: call[1] as Record<string, unknown>,
  };
}

afterEach(() => {
  // `mockClear` no toca las implementaciones, así que hay que reinstalar la
  // de "cancelado" o se arrastraría a la prueba siguiente.
  askMock.mockClear();
  askMock.mockImplementation(async (_q, fallback) => ({ ...fallback }));
});

const MADRID: GeocodedCity = {
  name: "Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
  detail: "Comunidad de Madrid, España",
};

function city(id: number, name: string, isDefault = false): City {
  return { id, name, latitude: 0, longitude: 0, is_default: isDefault };
}

describe("askCityName", () => {
  test("trims the captured name", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, name: "  Madrid \n" }));

    expect(await input.askCityName()).toBe("Madrid");
  });

  test("returns null when the name is empty or only whitespace", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, name: "   " }));
    expect(await input.askCityName()).toBeNull();
  });

  test("returns null when the prompt is cancelled", async () => {
    expect(await input.askCityName()).toBeNull();
  });

  test("asks for a required, non-blank name", async () => {
    await input.askCityName();
    const { question, fallback } = lastCall();

    expect(question.type).toBe("text");
    expect(question.message).toBe("Nombre de la ciudad");
    expect(fallback).toEqual({ name: "" });

    const validate = question.validate!;
    expect(validate("")).toBe("Nombre requerido");
    expect(validate("   ")).toBe("Nombre requerido");
    expect(validate("Madrid")).toBe(true);
  });
});

describe("pickGeocodedCity", () => {
  test("returns the only candidate without asking anything", async () => {
    expect(await input.pickGeocodedCity([MADRID])).toEqual(MADRID);
    expect(askMock).not.toHaveBeenCalled();
  });

  test("returns null for an empty candidate list", async () => {
    expect(await input.pickGeocodedCity([])).toBeNull();
    expect(askMock).not.toHaveBeenCalled();
  });

  test("builds one choice per candidate, labelled with its detail", async () => {
    const barcelona: GeocodedCity = { ...MADRID, name: "Barcelona", detail: "" };

    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, index: 1 }));

    expect(await input.pickGeocodedCity([MADRID, barcelona])).toEqual(barcelona);
    expect(lastCall().question.choices).toEqual([
      { title: "Madrid — Comunidad de Madrid, España", value: 0 },
      { title: "Barcelona", value: 1 },
    ]);
  });

  test("prompts for a selection when the name is ambiguous", async () => {
    expect(await input.pickGeocodedCity([MADRID, MADRID])).toBeNull();
    const { question, fallback } = lastCall();

    expect(question.type).toBe("select");
    expect(question.message).toBe("Elige una ubicación");
    expect(fallback).toEqual({ index: -1 });
  });

  test("returns null when the selection points outside the list", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, index: 7 }));

    expect(await input.pickGeocodedCity([MADRID, MADRID])).toBeNull();
  });
});

describe("confirmAdd", () => {
  test("returns the confirmation answer", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, ok: true }));
    expect(await input.confirmAdd("Madrid", "España")).toBe(true);
  });

  test("names the city and its detail, defaulting to yes", async () => {
    expect(await input.confirmAdd("Madrid", "España")).toBe(false);
    const { question, fallback } = lastCall();

    expect(question.type).toBe("confirm");
    expect(question.message).toBe('¿Agregar "Madrid — España"?');
    expect(question.initial).toBe(true);
    expect(fallback).toEqual({ ok: false });
  });

  test("drops the separator when there is no detail", async () => {
    await input.confirmAdd("Madrid", "");
    expect(lastCall().question.message).toBe('¿Agregar "Madrid"?');
  });
});

describe("pickCity", () => {
  test("labels each choice with its id and marks the default", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, id: 2 }));

    const cities = [city(1, "Madrid", true), city(2, "París")];

    expect(await input.pickCity(cities, "Ciudad a eliminar")).toEqual(cities[1]!);
    expect(lastCall()).toEqual({
      question: {
        type: "select",
        name: "id",
        message: "Ciudad a eliminar",
        choices: [
          { title: "1. Madrid (default)", value: 1 },
          { title: "2. París", value: 2 },
        ],
      },
      fallback: { id: -1 },
    });
  });

  test("returns null when the prompt is cancelled", async () => {
    expect(await input.pickCity([city(1, "Madrid")], "Elige")).toBeNull();
  });

  test("returns null when the id does not match any city", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, id: 99 }));

    expect(await input.pickCity([city(1, "Madrid")], "Elige")).toBeNull();
  });
});

describe("confirmDelete", () => {
  test("returns the confirmation answer", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, ok: true }));
    expect(await input.confirmDelete(city(1, "Madrid"))).toBe(true);
  });

  test("defaults to no, so a stray Enter does not delete anything", async () => {
    expect(await input.confirmDelete(city(1, "Madrid"))).toBe(false);
    const { question, fallback } = lastCall();

    expect(question.type).toBe("confirm");
    expect(question.message).toBe('¿Eliminar "Madrid"?');
    expect(question.initial).toBe(false);
    expect(fallback).toEqual({ ok: false });
  });
});

describe("pickUnit", () => {
  test("returns the chosen unit", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({
      ...fallback,
      unit: "fahrenheit",
    }));

    expect(await input.pickUnit("celsius")).toBe("fahrenheit");
  });

  test("returns null when the prompt is cancelled", async () => {
    expect(await input.pickUnit("celsius")).toBeNull();
  });

  test("returns null for an unexpected value", async () => {
    // `prompts` solo puede devolver una de las dos unidades, pero la guarda
    // existe para que un valor inesperado no se cuele en el almacenamiento.
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, unit: "kelvin" }));

    expect(await input.pickUnit("celsius")).toBeNull();
  });

  test("offers both units and preselects the active one", async () => {
    await input.pickUnit("celsius");
    expect(lastCall().question).toEqual({
      type: "select",
      name: "unit",
      message: "Unidad de temperatura",
      initial: 0,
      choices: [
        { title: "Celsius (°C)", value: "celsius" },
        { title: "Fahrenheit (°F)", value: "fahrenheit" },
      ],
    });

    await input.pickUnit("fahrenheit");
    expect(lastCall().question.initial).toBe(1);
  });

  test("accepts celsius when it is the option selected", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, unit: "celsius" }));

    expect(await input.pickUnit("fahrenheit")).toBe("celsius");
  });
});

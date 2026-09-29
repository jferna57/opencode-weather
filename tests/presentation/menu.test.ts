import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { captureConsole, setColors } from "../helpers/console";
import * as realPrompt from "../../src/presentation/prompt";
import { mockWithRestore } from "../helpers/modules";
import { LINE } from "../../src/utils/constants";

const askMock = mock(
  async (_questions: unknown, fallback: Record<string, unknown>) => ({ ...fallback }),
);

mockWithRestore("./src/presentation/prompt", realPrompt, () => ({
  ask: askMock,
}));

const menu = await import("../../src/presentation/menu");

interface Question {
  type?: string;
  message?: string;
  validate?: (value: string) => boolean | string;
}

let restoreColors: () => void;
beforeAll(() => {
  restoreColors = setColors(false);
});
afterAll(() => restoreColors());
afterEach(() => {
  askMock.mockClear();
  askMock.mockImplementation(async (_q, fallback) => ({ ...fallback }));
});

function lastQuestion(): Question {
  const call = askMock.mock.calls.at(-1);
  if (!call) throw new Error("ask() no fue llamado");
  return call[0] as Question;
}

/** Ejecuta `fn` con la consola capturada y devuelve lo escrito. */
function run(fn: () => void) {
  const out = captureConsole();
  try {
    fn();
  } finally {
    out.restore();
  }
  return out;
}

describe("printMenu", () => {
  test("lists every option from 1 to 10 plus exit", () => {
    const text = run(() => menu.printMenu(0, "celsius")).lines.join("\n");

    const expected = [
      "1. Clima de ciudad default",
      "2. Clima de todas las ciudades",
      "3. Buscar y agregar ciudad",
      "4. Eliminar ciudad",
      "5. Establecer ciudad default",
      "6. Pronóstico 7 días (default)",
      "7. Pronóstico 7 días (elegir ciudad)",
      "8. Ajustes",
      "9. Alertas meteorológicas",
      "10. Listar ciudades",
      "0. Salir",
    ];

    for (const line of expected) expect(text).toContain(line);
  });

  test("shows the number of saved cities and the active unit", () => {
    const celsius = run(() => menu.printMenu(3, "celsius")).lines.join("\n");
    const fahrenheit = run(() => menu.printMenu(0, "fahrenheit")).lines.join("\n");

    expect(celsius).toContain("2. Clima de todas las ciudades (3)");
    expect(celsius).toContain("8. Ajustes (°C)");
    expect(fahrenheit).toContain("2. Clima de todas las ciudades (0)");
    expect(fahrenheit).toContain("8. Ajustes (°F)");
  });

  test("frames the menu with the separator line and a title", () => {
    const lines = run(() => menu.printMenu(0, "celsius")).lines;

    // Cabecera y cierre: una línea en blanco, el separador y el título.
    expect(lines.slice(0, 4)).toEqual([
      "",
      LINE,
      "         WEATHER CLI",
      LINE,
    ]);
    expect(lines.at(-1)).toBe(LINE);
    expect(lines.filter((line) => line === LINE)).toHaveLength(3);
  });
});

describe("askMenuOption", () => {
  test("returns the selected option as a number", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, option: "7" }));

    expect(await menu.askMenuOption()).toBe(7);
  });

  test("trims surrounding whitespace", async () => {
    askMock.mockImplementation(async (_q, fallback) => ({ ...fallback, option: "  9  " }));

    expect(await menu.askMenuOption()).toBe(9);
  });

  test("defaults to 0 (exit) when the prompt is cancelled", async () => {
    expect(await menu.askMenuOption()).toBe(0);
    expect(askMock.mock.calls.at(-1)?.[1]).toEqual({ option: "0" });
  });

  test("only accepts the options declared in MENU_OPTIONS", async () => {
    await menu.askMenuOption();
    const { message, type, validate } = lastQuestion();
    expect(type).toBe("text");
    expect(message).toBe("Selecciona una opción");

    expect(validate!("0")).toBe(true);
    expect(validate!("10")).toBe(true);
    expect(validate!(" 3 ")).toBe(true);

    expect(validate!("")).toBe("Opción inválida");
    expect(validate!("11")).toBe("Opción inválida");
    expect(validate!("-1")).toBe("Opción inválida");
    expect(validate!("abc")).toBe("Opción inválida");
  });
});

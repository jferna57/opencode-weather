import { describe, expect, test } from "bun:test";
import {
  FRAMES,
  LINE,
  MENU_OPTIONS,
  MONTHS,
  WEEKDAYS,
} from "../../src/utils/constants";
import type { MenuOption } from "../../src/types";

describe("LINE", () => {
  test("is 41 box-drawing characters wide", () => {
    expect(LINE).toHaveLength(41);
    expect(new Set(LINE)).toEqual(new Set(["═"]));
  });
});

describe("FRAMES", () => {
  test("holds a non-empty list of single-character spinner frames", () => {
    expect(FRAMES.length).toBeGreaterThan(0);
    for (const frame of FRAMES) {
      expect([...frame]).toHaveLength(1);
    }
  });

  test("has no duplicated frames, so the animation cycles", () => {
    expect(new Set(FRAMES).size).toBe(FRAMES.length);
  });
});

describe("WEEKDAYS", () => {
  test("starts on Sunday and ends on Saturday", () => {
    // El índice es el que devuelve `Date#getUTCDay`, así que el orden no es
    // decorativo: `formatDayDate` indexa este array directamente.
    expect(WEEKDAYS).toHaveLength(7);
    expect(WEEKDAYS[0]).toBe("domingo");
    expect(WEEKDAYS[6]).toBe("sábado");
  });

  test("has no duplicated names", () => {
    expect(new Set(WEEKDAYS).size).toBe(7);
  });
});

describe("MONTHS", () => {
  test("runs from January to December", () => {
    // Mismo motivo que en `WEEKDAYS`: se indexa con el mes menos uno.
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toBe("enero");
    expect(MONTHS[11]).toBe("diciembre");
  });

  test("has no duplicated names", () => {
    expect(new Set(MONTHS).size).toBe(12);
  });
});

describe("MENU_OPTIONS", () => {
  test("offers every option from 0 to 10 exactly once", () => {
    expect([...MENU_OPTIONS]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("is sorted and free of duplicates", () => {
    expect(new Set(MENU_OPTIONS).size).toBe(MENU_OPTIONS.length);
    expect([...MENU_OPTIONS]).toEqual([...MENU_OPTIONS].sort((a, b) => a - b));
  });

  test("covers every member of the MenuOption union", () => {
    // `MenuOption` es un tipo, no un valor, así que la unión se declara aquí a
    // mano. Si alguien añade una opción a la unión y olvida el array, la clave
    // ausente deja de ser asignable y el typecheck falla.
    const declared: Record<MenuOption, true> = {
      0: true, 1: true, 2: true, 3: true, 4: true,
      5: true, 6: true, 7: true, 8: true, 9: true,
      10: true,
    };
    expect(Object.keys(declared).map(Number).sort((a, b) => a - b)).toEqual([
      ...MENU_OPTIONS,
    ]);
  });
});

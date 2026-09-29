import { afterAll, describe, expect, test } from "bun:test";
import kleur from "kleur";
import { setColors } from "../helpers/console";
import {
  formatDayDate,
  formatTemperature,
  unitLabel,
} from "../../src/utils/format";

// Las fechas de prueba se calculan con `Date.UTC`, así que el resultado no
// depende de la zona horaria; los fines de semana sí dependen del color, que
// se fija aquí para que el resto de aserciones comparen texto plano.
const restoreColors = setColors(false);
afterAll(restoreColors);

describe("unitLabel", () => {
  test("returns the symbol of the active unit", () => {
    expect(unitLabel("celsius")).toBe("°C");
    expect(unitLabel("fahrenheit")).toBe("°F");
  });
});

describe("formatTemperature", () => {
  test("always shows a single decimal", () => {
    expect(formatTemperature(21, "celsius")).toBe("21.0 °C");
    expect(formatTemperature(21.5, "celsius")).toBe("21.5 °C");
  });

  test("rounds to one decimal", () => {
    expect(formatTemperature(21.46, "celsius")).toBe("21.5 °C");
    expect(formatTemperature(-3.04, "celsius")).toBe("-3.0 °C");
  });

  test("uses the unit label of the active unit", () => {
    expect(formatTemperature(70.9, "fahrenheit")).toBe("70.9 °F");
  });
});

describe("formatDayDate", () => {
  test("renders weekday, zero-padded day, month and year", () => {
    expect(formatDayDate("2026-09-29")).toBe("martes 29-septiembre-2026");
    expect(formatDayDate("2026-12-25")).toBe("viernes 25-diciembre-2026");
  });

  test("pads single-digit days with a zero", () => {
    expect(formatDayDate("2026-01-05")).toBe("lunes 05-enero-2026");
  });

  test("resolves the weekday for every day of the week", () => {
    // 2026-10-03 es sábado y 2026-10-04 domingo: el ciclo semanal completo
    // cabe en dos días y así se comprueban sábado, domingo y lunes.
    expect(formatDayDate("2026-10-03")).toBe("sábado 03-octubre-2026");
    expect(formatDayDate("2026-10-04")).toBe("domingo 04-octubre-2026");
    expect(formatDayDate("2026-10-05")).toBe("lunes 05-octubre-2026");
  });

  test("colours weekends in green and leaves weekdays alone", () => {
    const restore = setColors(true);
    try {
      expect(formatDayDate("2026-10-03")).toBe(kleur.green("sábado 03-octubre-2026"));
      expect(formatDayDate("2026-10-04")).toBe(kleur.green("domingo 04-octubre-2026"));
      expect(formatDayDate("2026-10-01")).toBe("jueves 01-octubre-2026");
    } finally {
      restore();
    }
  });

  test("returns the input untouched when it is not a full date", () => {
    expect(formatDayDate("no-date")).toBe("no-date");
    expect(formatDayDate("")).toBe("");
    expect(formatDayDate("2026-10")).toBe("2026-10");
    expect(formatDayDate("2026")).toBe("2026");
  });

  test("rejects months and days outside the 1-based range", () => {
    // El guardián usa la falsedad numérica, así que un 0 o un NaN hacen
    // fallback al texto original en lugar de mostrar "NaN-mes-NaN".
    expect(formatDayDate("2026-00-10")).toBe("2026-00-10");
    expect(formatDayDate("2026-10-00")).toBe("2026-10-00");
  });
});

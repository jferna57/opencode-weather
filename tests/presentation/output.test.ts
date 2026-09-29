import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { captureConsole, setColors } from "../helpers/console";
import {
  printAlerts,
  printCityList,
  printError,
  printForecast,
  printInfo,
  printWeather,
} from "../../src/presentation/output";
import type { CityAlerts, DailyForecast, WeatherAlert } from "../../src/types";

let restoreColors: () => void;
beforeAll(() => {
  restoreColors = setColors(false);
});
afterAll(() => restoreColors());

function city(id: number, name: string, isDefault = false) {
  return { id, name, latitude: 0, longitude: 0, is_default: isDefault };
}

function day(date: string, weathercode = 0): DailyForecast {
  return { date, tempMax: 21.4, tempMin: 12.3, weathercode };
}

function alert(overrides: Partial<WeatherAlert> = {}): WeatherAlert {
  return {
    kind: "lluvia",
    severity: "warning",
    title: "Lluvia intensa",
    date: "2026-10-01",
    ...overrides,
  };
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

describe("printWeather", () => {
  test("prints the city, the temperature and the unit", () => {
    const out = run(() => printWeather("Madrid", 21.5, "celsius"));

    expect(out.lines).toEqual(["  Madrid: 21.5 °C"]);
  });

  test("uses the active unit", () => {
    const out = run(() => printWeather("París", 70.9, "fahrenheit"));

    expect(out.lines).toEqual(["  París: 70.9 °F"]);
  });
});

describe("printForecast", () => {
  test("prints a header, one line per day and a closing blank line", () => {
    const forecast = [day("2026-10-01"), day("2026-10-02"), day("2026-10-03")];
    const out = run(() => printForecast("Madrid", forecast, "celsius"));

    expect(out.lines).toEqual([
      "",
      "  Madrid — próximos 7 días",
      "    jueves 01-octubre-2026  ↑21.4°C  ↓12.3°C  Despejado",
      "    viernes 02-octubre-2026  ↑21.4°C  ↓12.3°C  Despejado",
      "    sábado 03-octubre-2026  ↑21.4°C  ↓12.3°C  Despejado",
      "",
    ]);
  });

  test("describes each day with its WMO code", () => {
    const out = run(() =>
      printForecast(
        "Madrid",
        [day("2026-10-01", 95), day("2026-10-02", 71)],
        "celsius",
      ),
    );

    expect(out.lines[2]).toContain("Tormenta fuerte con chubascos de lluvia y/o nieve");
    expect(out.lines[3]).toContain("Nieve ligera");
  });

  test("uses the active unit and rounds to one decimal", () => {
    const out = run(() =>
      printForecast(
        "Madrid",
        [{ date: "2026-10-01", tempMax: 70.94, tempMin: 54.06, weathercode: 3 }],
        "fahrenheit",
      ),
    );

    expect(out.lines[2]).toBe("    jueves 01-octubre-2026  ↑70.9°F  ↓54.1°F  Nublado");
  });

  test("prints only the header for an empty forecast", () => {
    const out = run(() => printForecast("Madrid", [], "celsius"));

    expect(out.lines).toEqual(["", "  Madrid — próximos 7 días", ""]);
  });
});

describe("printCityList", () => {
  test("numbers the cities and marks the default one", () => {
    const out = run(() => printCityList([city(1, "Zaragoza", true), city(2, "Madrid")]));

    expect(out.lines).toEqual(["", "  1. Zaragoza (default)", "  2. Madrid", ""]);
  });

  test("prints nothing but the blank lines when there are no cities", () => {
    const out = run(() => printCityList([]));

    expect(out.lines).toEqual(["", ""]);
  });
});

describe("printAlerts", () => {
  test("reports that there is nothing to worry about", () => {
    const results: CityAlerts[] = [
      { city: city(1, "Madrid", true), alerts: [] },
      { city: city(2, "París"), alerts: [] },
    ];

    const out = run(() => printAlerts(results));

    expect(out.lines).toEqual(["", "  ℹ Sin alertas activas en tus 2 ciudades.", ""]);
  });

  test("skips the cities without alerts and counts only the ones with", () => {
    const results: CityAlerts[] = [
      { city: city(1, "Madrid"), alerts: [alert()] },
      { city: city(2, "París"), alerts: [] },
    ];

    const out = run(() => printAlerts(results));
    const text = out.lines.join("\n");

    expect(text).toContain("Madrid");
    expect(text).not.toContain("París");
    expect(text).toContain("⚠ 1 ciudad con avisos");
  });

  test("pluralises the summary", () => {
    const results: CityAlerts[] = [
      { city: city(1, "Madrid"), alerts: [alert()] },
      { city: city(2, "París"), alerts: [alert()] },
    ];

    const out = run(() => printAlerts(results));

    expect(out.lines.join("\n")).toContain("⚠ 2 ciudades con avisos");
  });

  test("prints the badge, the date and the title of every alert", () => {
    const results: CityAlerts[] = [
      { city: city(1, "Madrid", true), alerts: [alert({ severity: "danger" })] },
    ];

    const out = run(() => printAlerts(results));
    const text = out.lines.join("\n");
    const line = out.lines.find((l) => l.includes("Lluvia intensa"))!;

    expect(line).toBe(
      "    peligro  jueves 01-octubre-2026  Lluvia intensa",
    );
    expect(text).toContain("Madrid (default)");
  });

  test("appends the detail only when the alert carries one", () => {
    const results: CityAlerts[] = [
      {
        city: city(1, "Madrid"),
        alerts: [
          alert({ title: "Lluvia intensa", detail: "Acumulado 45.5 mm" }),
          alert({ title: "Nieve fuerte", date: "2026-10-02" }),
        ],
      },
    ];

    const out = run(() => printAlerts(results));

    expect(
      out.lines.find((l) => l.includes("Lluvia intensa")),
    ).toContain("— Acumulado 45.5 mm");
    expect(out.lines.find((l) => l.includes("Nieve fuerte"))).toBe(
      "    aviso    viernes 02-octubre-2026  Nieve fuerte",
    );
  });

  test("aligns the badge column across the three severities", () => {
    // Regresión: si las tres etiquetas no ocupan el mismo ancho, la columna de
    // fechas queda descentrada según la severidad de la alerta.
    const results: CityAlerts[] = [
      {
        city: city(1, "Madrid"),
        alerts: [
          alert({ severity: "info", title: "Lluvia probable" }),
          alert({ severity: "warning", title: "Viento fuerte" }),
          alert({ severity: "danger", title: "Tormenta fuerte con granizo" }),
        ],
      },
    ];

    const out = run(() => printAlerts(results));
    const titles = ["Lluvia probable", "Viento fuerte", "Tormenta fuerte con granizo"];
    const rows = out.lines.filter((line) => titles.some((t) => line.includes(t)));

    expect(rows).toHaveLength(3);
    // Las tres alertas comparten fecha, así que la columna de la fecha tiene
    // que empezar en el mismo sitio: 4 de sangría + 7 de etiqueta + 2 de
    // separador. `formatDayDate` pone el año al final, de ahí el weekday.
    expect(rows.map((line) => line.indexOf("jueves"))).toEqual([13, 13, 13]);
  });

  test("colours the output when colours are enabled", () => {
    const restore = setColors(true);
    try {
      const out = run(() =>
        printAlerts([{ city: city(1, "Madrid"), alerts: [alert({ severity: "danger" })] }]),
      );

      expect(out.rawLines.join("\n")).toMatch(/\u001B\[/);
      expect(out.lines.find((l) => l.includes("Lluvia intensa"))).toBe(
        "    peligro  jueves 01-octubre-2026  Lluvia intensa",
      );
    } finally {
      restore();
    }
  });
});

describe("printError", () => {
  test("goes to stderr with a cross marker", () => {
    const out = run(() => printError('No se encontró "X"'));

    expect(out.errorLines).toEqual(['  ✖ No se encontró "X"']);
    expect(out.lines).toEqual([]);
  });
});

describe("printInfo", () => {
  test("goes to stdout with an info marker", () => {
    const out = run(() => printInfo("Ciudad agregada."));

    expect(out.lines).toEqual(["  ℹ Ciudad agregada."]);
    expect(out.errorLines).toEqual([]);
  });
});

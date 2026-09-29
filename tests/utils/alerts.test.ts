import { describe, expect, test } from "bun:test";
import {
  evaluateDay,
  groupCapeByDay,
  tempThreshold,
  THRESHOLDS,
} from "../../src/utils/alerts";
import type { DayMetrics } from "../../src/utils/alerts";

const QUIET: DayMetrics = {
  date: "2026-10-01",
  weatherCode: 1,
  precipSum: 0,
  precipProbMax: 5,
  gustsMax: 12,
  tempMax: 21,
  capeMax: 0,
};

function days(overrides: Partial<DayMetrics>): DayMetrics {
  return { ...QUIET, ...overrides };
}

describe("evaluateDay", () => {
  test("returns no alerts below every threshold", () => {
    expect(
      evaluateDay(
        days({
          precipSum: THRESHOLDS.precipSumMm - 1,
          precipProbMax: THRESHOLDS.precipProbPct - 1,
          gustsMax: THRESHOLDS.gustsKmh - 1,
          tempMax: THRESHOLDS.tempMaxC - 1,
          capeMax: THRESHOLDS.capeJkg - 1,
        }),
      ),
    ).toEqual([]);
  });

  test("fires each rule exactly at its boundary (>=)", () => {
    const alerts = evaluateDay(
      days({
        precipSum: 20,
        precipProbMax: 70,
        gustsMax: 60,
        tempMax: 38,
        capeMax: 1500,
      }),
    );

    expect(alerts.map((a) => a.kind)).toEqual([
      "lluvia",
      "tormenta",
      "viento",
      "calor",
      "lluvia",
    ]);
    expect(alerts.filter((a) => a.severity === "warning")).toHaveLength(4);
    expect(alerts.filter((a) => a.severity === "info")).toHaveLength(1);
  });

  test("heavy rain and rain probability are independent rules", () => {
    const alerts = evaluateDay(days({ precipSum: 45.5 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.title).toBe("Lluvia intensa");
    expect(alerts[0]?.detail).toBe("Acumulado 45.5 mm");
    expect(alerts[0]?.severity).toBe("warning");

    const probOnly = evaluateDay(days({ precipProbMax: 75 }));
    expect(probOnly).toHaveLength(1);
    expect(probOnly[0]?.title).toBe("Lluvia probable");
    expect(probOnly[0]?.severity).toBe("info");
  });

  test.each([
    [95, "Tormenta fuerte con chubascos de lluvia y/o nieve"],
    [96, "Tormenta con granizo ligero"],
    [99, "Tormenta fuerte con granizo"],
  ])("recognises WMO code %i as a dangerous storm", (code, title) => {
    const alerts = evaluateDay(days({ weatherCode: code }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      kind: "tormenta",
      severity: "danger",
      title,
    });
    expect(alerts[0]?.detail).toBeUndefined();
  });

  // El 97 está "Reserved" en la tabla WMO 4680 y Open-Meteo no lo emite.
  test("ignores the reserved WMO code 97", () => {
    expect(evaluateDay(days({ weatherCode: 97 }))).toEqual([]);
  });

  test("suppresses cape warning when an explicit storm code fires", () => {
    const alerts = evaluateDay(days({ weatherCode: 99, capeMax: 4000 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.title).toBe("Tormenta fuerte con granizo");
  });

  test("flags high CAPE as potential storm when no storm code", () => {
    const alerts = evaluateDay(days({ weatherCode: 3, capeMax: 2100 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      kind: "tormenta",
      severity: "warning",
      title: "Tormenta potencial",
      detail: "CAPE máx 2100 J/kg",
    });
  });

  test.each([
    [71, "Nieve ligera"],
    [73, "Nieve moderada"],
    [75, "Nieve fuerte"],
    [77, "Granos de nieve"],
    [85, "Chubascos de nieve ligeros"],
    [86, "Chubascos de nieve fuertes"],
  ])("recognises WMO code %i as snow", (code, title) => {
    const alerts = evaluateDay(days({ weatherCode: code }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ kind: "nieve", severity: "warning", title });
    expect(alerts[0]?.detail).toBeUndefined();
  });

  test("flags strong wind gusts", () => {
    const alerts = evaluateDay(days({ gustsMax: 72 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      kind: "viento",
      severity: "warning",
      title: "Viento fuerte",
      detail: "Rachas máx 72 km/h",
    });
  });

  test("flags heat in celsius and fahrenheit", () => {
    const celsius = evaluateDay(days({ tempMax: 38.5 }), "celsius");
    expect(celsius).toHaveLength(1);
    expect(celsius[0]?.detail).toBe("Máx 38.5 °C");

    const atFahrenheit = evaluateDay(days({ tempMax: 100.4 }), "fahrenheit");
    expect(atFahrenheit).toHaveLength(1);
    expect(atFahrenheit[0]?.detail).toBe("Máx 100.4 °F");

    // 100 °F queda justo por debajo del equivalente de 38 °C (100.4 °F).
    expect(evaluateDay(days({ tempMax: 100 }), "fahrenheit")).toEqual([]);

    expect(evaluateDay(days({ tempMax: 100 }), "celsius")).toHaveLength(1);
    expect(evaluateDay(days({ tempMax: 37.9 }), "celsius")).toEqual([]);
  });

  test("sorts alerts by severity: danger, warning, info", () => {
    const alerts = evaluateDay(
      days({
        weatherCode: 95,
        precipSum: 30,
        gustsMax: 80,
        precipProbMax: 90,
      }),
    );

    expect(alerts.map((a) => a.severity)).toEqual([
      "danger",
      "warning",
      "warning",
      "info",
    ]);
  });

  test("carries the date through to every alert", () => {
    const alerts = evaluateDay(
      days({ date: "2026-12-25", weatherCode: 95, gustsMax: 100 }),
    );
    expect(alerts.every((a) => a.date === "2026-12-25")).toBe(true);
  });
});

describe("tempThreshold", () => {
  test("converts celsius thresholds to fahrenheit", () => {
    expect(tempThreshold("celsius")).toBe(38);
    expect(tempThreshold("fahrenheit")).toBeCloseTo(100.4, 5);
  });
});

describe("groupCapeByDay", () => {
  test("keeps the maximum value per local day", () => {
    const times = [
      "2026-10-01T00:00",
      "2026-10-01T13:00",
      "2026-10-02T01:00",
      "2026-10-02T14:00",
    ];
    const cape = [100, 1800, 400, 2500];

    expect(groupCapeByDay(times, cape)).toEqual(
      new Map([
        ["2026-10-01", 1800],
        ["2026-10-02", 2500],
      ]),
    );
  });

  test("skips null and NaN values", () => {
    const times = ["2026-10-01T00:00", "2026-10-01T01:00", "2026-10-01T02:00"];
    expect(groupCapeByDay(times, [null, Number.NaN, 500])).toEqual(
      new Map([["2026-10-01", 500]]),
    );
  });

  test("ignores trailing timestamps without a value", () => {
    expect(groupCapeByDay(["2026-10-01T00:00", "2026-10-01T01:00"], [null])).toEqual(
      new Map(),
    );
  });

  test("returns an empty map for empty input", () => {
    expect(groupCapeByDay([], [])).toEqual(new Map());
  });
});

import { describe, expect, test } from "bun:test";
import { describeWmoCode, SNOW_CODES, STORM_CODES, WMO_CODES } from "./wmo";

/** Subconjunto de códigos que Open-Meteo emite en `weather_code`. */
const OPEN_METEO_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 99,
] as const;

describe("WMO_CODES", () => {
  test("describes the exact wording taken from WMO 4680 for code 95", () => {
    // "Thunderstorm, heavy, with rain showers and/or snow showers".
    expect(describeWmoCode(95)).toBe(
      "Tormenta fuerte con chubascos de lluvia y/o nieve",
    );
  });

  test("keeps Open-Meteo semantics for code 99 instead of 4680's tornado", () => {
    expect(describeWmoCode(99)).toBe("Tormenta fuerte con granizo");
    expect(describeWmoCode(99)).not.toContain("Tornado");
  });

  test("keeps Open-Meteo semantics for code 75 instead of 4680's ice pellets", () => {
    expect(describeWmoCode(75)).toBe("Nieve fuerte");
  });

  test("covers every code Open-Meteo can emit", () => {
    const missing = OPEN_METEO_CODES.filter((code) => !(code in WMO_CODES));
    expect(missing).toEqual([]);
  });

  test("has no description for the reserved code 97", () => {
    expect(describeWmoCode(97)).toBe("Código 97");
  });

  test("falls back to the numeric code for unknown values", () => {
    expect(describeWmoCode(42)).toBe("Código 42");
    expect(describeWmoCode(-1)).toBe("Código -1");
  });

  test("every description is a non-empty string", () => {
    for (const text of Object.values(WMO_CODES)) {
      expect(typeof text).toBe("string");
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test("assigns a distinct description to every code", () => {
    const texts = Object.values(WMO_CODES);
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("STORM_CODES", () => {
  test("holds exactly the thunderstorm codes Open-Meteo returns", () => {
    expect([...STORM_CODES].sort((a, b) => a - b)).toEqual([95, 96, 99]);
    expect(STORM_CODES.has(97)).toBe(false);
  });
});

describe("SNOW_CODES", () => {
  test("holds the snow and snow-shower codes", () => {
    expect([...SNOW_CODES].sort((a, b) => a - b)).toEqual([
      71, 73, 75, 77, 85, 86,
    ]);
    expect(SNOW_CODES.has(73)).toBe(true);
    expect(SNOW_CODES.has(61)).toBe(false);
  });

  test("never overlaps with the storm codes", () => {
    for (const code of SNOW_CODES) expect(STORM_CODES.has(code)).toBe(false);
  });
});

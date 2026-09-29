import { afterEach, describe, expect, test } from "bun:test";
import { fetchForecast, fetchWeather, geocode } from "./api";

const originalFetch = globalThis.fetch;

function mockFetch(response: unknown, ok = true, status = 200): void {
  globalThis.fetch = (async () => ({
    ok,
    status,
    json: async () => response,
  })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("geocode", () => {
  test("returns all results for ambiguous names", async () => {
    mockFetch({
      results: [
        { name: "Springfield", latitude: 39.8, longitude: -89.65, admin1: "Illinois", country: "United States" },
        { name: "Springfield", latitude: 42.1, longitude: -72.6, admin1: "Massachusetts", country: "United States" },
      ],
    });

    const results = await geocode("springfield");
    expect(results).toHaveLength(2);
    expect(results[0]?.detail).toBe("Illinois, United States");
    expect(results[1]?.latitude).toBe(42.1);
  });

  test("returns empty array when no results", async () => {
    mockFetch({ results: [] });
    expect(await geocode("xyzxyz")).toEqual([]);
  });

  test("throws on HTTP error", async () => {
    mockFetch(null, false, 500);
    expect(geocode("madrid")).rejects.toThrow("HTTP 500");
  });
});

describe("fetchWeather", () => {
  test("returns current temperature", async () => {
    mockFetch({ current: { temperature_2m: 21.5 } });
    expect(await fetchWeather(40.4, -3.7, "celsius")).toBe(21.5);
  });

  test("throws when temperature missing", async () => {
    mockFetch({ current: {} });
    expect(fetchWeather(40.4, -3.7, "celsius")).rejects.toThrow("sin temperatura");
  });
});

describe("fetchForecast", () => {
  test("returns 7 daily entries", async () => {
    const days = Array.from({ length: 7 }, (_, i) => ({
      time: `2026-10-0${i + 1}`,
      temperature_2m_max: 20 + i,
      temperature_2m_min: 10 + i,
      weathercode: i,
    }));
    mockFetch({
      daily: {
        time: days.map((d) => d.time),
        temperature_2m_max: days.map((d) => d.temperature_2m_max),
        temperature_2m_min: days.map((d) => d.temperature_2m_min),
        weathercode: days.map((d) => d.weathercode),
      },
    });

    const forecast = await fetchForecast(40.4, -3.7, "celsius");
    expect(forecast).toHaveLength(7);
    expect(forecast[0]?.tempMax).toBe(20);
    expect(forecast[0]?.tempMin).toBe(10);
    expect(forecast[6]?.weathercode).toBe(6);
  });

  test("throws when daily data missing", async () => {
    mockFetch({ daily: null });
    expect(fetchForecast(40.4, -3.7, "celsius")).rejects.toThrow("sin pronóstico");
  });
});

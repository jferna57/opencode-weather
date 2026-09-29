import { afterEach, describe, expect, test } from "bun:test";
import { fetchAlerts } from "../../src/api/alerts";
import { geocode } from "../../src/api/geocoding";
import { fetchForecast, fetchWeather } from "../../src/api/weather";

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

function alertsPayload(overrides: Record<string, unknown> = {}): unknown {
  const days = Array.from({ length: 7 }, (_, i) => `2026-10-0${i + 1}`);
  return {
    daily: {
      time: days,
      weather_code: [0, 0, 95, 0, 0, 0, 0],
      precipitation_sum: [0, 0, 0, 0, 0, 0, 0],
      precipitation_probability_max: [5, 5, 90, 5, 5, 5, 5],
      wind_gusts_10m_max: [10, 10, 45, 10, 10, 10, 10],
      temperature_2m_max: [21, 21, 22, 21, 21, 21, 21],
    },
    hourly: {
      time: days.flatMap((d) => [`${d}T00:00`, `${d}T13:00`]),
      cape: [100, 400, 100, 2100, 100, 50, 100, 50, 100, 50, 100, 50, 100, 50],
    },
    ...overrides,
  };
}

const CITY_A = {
  id: 1,
  name: "Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
  is_default: true,
};
const CITY_B = {
  id: 2,
  name: "París",
  latitude: 48.8566,
  longitude: 2.3522,
  is_default: false,
};

function mockFetchCapturing(response: unknown, ok = true, status = 200): string[] {
  const urls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    urls.push(String(input));
    return { ok, status, json: async () => response } as unknown as Response;
  }) as unknown as typeof fetch;
  return urls;
}

describe("fetchAlerts", () => {
  test("does not hit the network for an empty city list", async () => {
    const urls = mockFetchCapturing([]);
    expect(await fetchAlerts([], "celsius")).toEqual([]);
    expect(urls).toHaveLength(0);
  });

  test("sends all coordinates in one request with timezone and hourly cape", async () => {
    const urls = mockFetchCapturing([alertsPayload(), alertsPayload()]);
    await fetchAlerts([CITY_A, CITY_B], "celsius");

    const params = new URLSearchParams(urls[0]!.split("?")[1]);
    expect(params.get("latitude")).toBe("40.4168,48.8566");
    expect(params.get("longitude")).toBe("-3.7038,2.3522");
    expect(params.get("timezone")).toBe("auto");
    expect(params.get("hourly")).toBe("cape");
    expect(params.get("daily")).toContain("wind_gusts_10m_max");
    expect(params.get("daily")).not.toContain("cape");
    expect(params.get("temperature_unit")).toBeNull();
  });

  test("requests fahrenheit when the unit is fahrenheit", async () => {
    const urls = mockFetchCapturing([alertsPayload()]);
    await fetchAlerts([CITY_A], "fahrenheit");
    expect(new URLSearchParams(urls[0]!.split("?")[1]).get("temperature_unit")).toBe(
      "fahrenheit",
    );
  });

  test("zips an array response back onto the ordered city list", async () => {
    const other = alertsPayload({
      daily: { time: ["2026-10-01"], weather_code: [75], precipitation_sum: [0] },
    });
    mockFetchCapturing([alertsPayload(), other]);

    const results = await fetchAlerts([CITY_A, CITY_B], "celsius");
    expect(results.map((r) => r.city.name)).toEqual(["Madrid", "París"]);
    expect(results[0]?.alerts.some((a) => a.kind === "tormenta")).toBe(true);
    expect(results[1]?.alerts.map((a) => a.kind)).toEqual(["nieve"]);
  });

  test("normalises a single-object response (one city)", async () => {
    mockFetchCapturing(alertsPayload());
    const results = await fetchAlerts([CITY_A], "celsius");
    expect(results).toHaveLength(1);
    expect(results[0]?.city.name).toBe("Madrid");
  });

  test("aggregates hourly cape into the matching day", async () => {
    mockFetchCapturing(alertsPayload());
    const [result] = await fetchAlerts([CITY_A], "celsius");

    const capeAlert = result?.alerts.find((a) => a.title === "Tormenta potencial");
    expect(capeAlert).toBeDefined();
    expect(capeAlert?.date).toBe("2026-10-02");
    expect(capeAlert?.detail).toBe("CAPE máx 2100 J/kg");
  });

  test("throws on HTTP error", async () => {
    mockFetch(null, false, 503);
    expect(fetchAlerts([CITY_A], "celsius")).rejects.toThrow("HTTP 503");
  });

  test("throws naming the city when daily data is missing", async () => {
    mockFetch([alertsPayload({ daily: null })]);
    expect(fetchAlerts([CITY_A], "celsius")).rejects.toThrow("Madrid");
  });
});

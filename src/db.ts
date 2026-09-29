import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { City, Unit } from "./types";

const CONFIG_DIR =
  process.env.WEATHER_CONFIG_DIR ?? join(homedir(), ".config", "weather-cli");
mkdirSync(CONFIG_DIR, { recursive: true });

const db = new Database(join(CONFIG_DIR, "weather.db"), { create: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

interface CityRow {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  is_default: number;
}

function toCity(row: CityRow): City {
  return { ...row, is_default: row.is_default === 1 };
}

export function getAllCities(): City[] {
  const rows = db
    .query<CityRow, []>("SELECT * FROM cities ORDER BY is_default DESC, name")
    .all();
  return rows.map(toCity);
}

export function getDefaultCity(): City | null {
  const row = db
    .query<CityRow, []>("SELECT * FROM cities WHERE is_default = 1 LIMIT 1")
    .get();
  return row ? toCity(row) : null;
}

export function addCity(city: { name: string; latitude: number; longitude: number }): City {
  const { lastInsertRowid } = db
    .query("INSERT INTO cities (name, latitude, longitude) VALUES (?, ?, ?)")
    .run(city.name, city.latitude, city.longitude);

  const id = Number(lastInsertRowid);
  if (getDefaultCity() === null) setDefaultCity(id);

  const row = db
    .query<CityRow, [number]>("SELECT * FROM cities WHERE id = ?")
    .get(id)!;
  return toCity(row);
}

export function deleteCity(id: number): void {
  db.query("DELETE FROM cities WHERE id = ?").run(id);
}

export function deleteAllCities(): void {
  db.query("DELETE FROM cities").run();
}

export function setDefaultCity(id: number): void {
  db.transaction(() => {
    db.query("UPDATE cities SET is_default = 0").run();
    db.query("UPDATE cities SET is_default = 1 WHERE id = ?").run(id);
  })();
}

export function getUnit(): Unit {
  const row = db
    .query<{ value: string }, []>("SELECT value FROM settings WHERE key = 'unit'")
    .get();
  return row?.value === "fahrenheit" ? "fahrenheit" : "celsius";
}

export function setUnit(unit: Unit): void {
  db.query(
    "INSERT INTO settings (key, value) VALUES ('unit', ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(unit);
}

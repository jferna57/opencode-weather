import type { City } from "../types";
import { db } from "./database";

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

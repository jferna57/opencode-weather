import type { Unit } from "../types";
import { db } from "./database";

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

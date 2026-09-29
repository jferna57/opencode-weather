import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Única conexión SQLite de la app.
 *
 * Centralizarla aquí evita que cada módulo de almacenamiento abra su
 * propia `Database` sobre el mismo fichero: dos conexiones distintas al
 * mismo archivo no comparten estado de transacción y pueden terminar en
 * `SQLITE_BUSY` al escribir desde las dos.
 */
const CONFIG_DIR =
  process.env.WEATHER_CONFIG_DIR ?? join(homedir(), ".config", "weather-cli");
mkdirSync(CONFIG_DIR, { recursive: true });

export const db = new Database(join(CONFIG_DIR, "weather.db"), { create: true });

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

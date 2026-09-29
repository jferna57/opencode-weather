# Weather CLI App - Agent Instructions

## Runtime & Tooling

- **Runtime**: Bun (not Node.js) — use `bun` commands exclusively
- **Package manager**: `bun install` / `bun add`
- **Run**: `bun src/index.ts` (entry point)
- **Build binary**: `bun build src/index.ts --compile --outfile weather`
- **Test**: `bun test` or `bun run test` (uses `bun:test`)
- **Typecheck**: `bunx tsc --noEmit` or `bun run typecheck`

## Project Structure

Layered by responsibility; each folder has an `index.ts` barrel (required —
`moduleResolution: "bundler"` only resolves a directory through its `index.ts`).
Data flows one way: `presentation` → `actions` → (`api` | `storage` | `utils`).

- `src/index.ts` — entry point: menu loop + option switch only
- `src/actions/` — one file per user action; orchestrates storage + api + presentation
  - `getWeather.ts` (current weather, default and all cities), `addCity.ts`, `removeCity.ts`,
    `setDefaultCity.ts`, `listCities.ts`, `forecast.ts`, `settings.ts`, `alerts.ts`
- `src/presentation/` — all console/CLI interaction
  - `menu.ts` (menu rendering, `askMenuOption`), `output.ts` (all `print*`),
    `input.ts` (all `ask*`/`pick*`/`confirm*`), `prompt.ts` (cancel-safe `ask()` wrapper),
    `spinner.ts` (`startSpinner`)
- `src/storage/` — `database.ts` holds the **single** `Database` connection and the schema
  (persists to `~/.config/weather-cli/weather.db`, override with `WEATHER_CONFIG_DIR`);
  `citiesStorage.ts`, `settingsStorage.ts` consume it. Never open a second connection.
- `src/types/` — shared contracts only, no runtime values: `City`, `Weather`, `Alert`,
  `Unit`, `MenuOption` (`MENU_OPTIONS` array lives in `utils/constants.ts`)
- `src/api/` — `geocoding.ts` (`geocode()`), `weather.ts` (`fetchWeather()`, `fetchForecast()`),
  `alerts.ts` (`fetchAlerts()`); native `fetch`
- `src/utils/` — `constants.ts` (LINE, FRAMES, WEEKDAYS, MONTHS, MENU_OPTIONS),
  `format.ts`, `colors.ts` (`SEVERITY_BADGE`), `wmo.ts` (WMO table),
  `alerts.ts` (`DayMetrics`, `THRESHOLDS`, `evaluateDay()`, `groupCapeByDay()`)
- `tests/` — mirrors `src/` layout, imports via `../../src/...`
  - `tests/api/api.test.ts` (mocked `fetch`), `tests/storage/storage.test.ts`
    (isolated temp DB via `WEATHER_CONFIG_DIR`, imported dynamically after the env var is set),
    `tests/utils/alerts.test.ts`, `tests/utils/wmo.test.ts`
- `tsconfig.json` — Strict TypeScript, bundler module resolution, ESNext target

Never leave a stale `src/foo.ts` next to a new `src/foo/` directory: the file
shadows the directory and imports keep resolving to the dead module.

## State

- Menu options 0-10 implemented; unit (°C/°F) persisted in `settings` table
- Options 6/7: 7-day forecast (default city / pick a city)
- Option 9: derived weather alerts for all cities (single multi-coordinate Open-Meteo request)
- Option 10: list saved cities (added in the layered-structure refactor)
- First city added becomes default automatically; duplicate cities are rejected by name+coords
- Colors via `kleur`: cyan (menu), yellow (temps), green (info), red (errors)
- Async operations show a spinner; geocoding returns multiple results with a select prompt for ambiguous names
- Dependencies: `prompts` (UI), `kleur` (colors). Keep `bunx tsc --noEmit` and `bun test` clean before finishing

## Alerts (option 9)

- **Open-Meteo has no alerts endpoint.** `GET /v1/alerts` is 404 and `alerts=true` is silently ignored; `daily=cape` is an HTTP 400 (CAPE is hourly-only)
- Alerts are therefore *derived* from forecast variables in `src/utils/alerts.ts` (pure, unit-tested) and fetched by `fetchAlerts()` in `src/api/alerts.ts`
- One request for the whole list: comma-separated lat/lon returns a JSON array in input order (a single city returns an object, so responses are normalized)
- `daily` requires `timezone=auto`; `hourly=cape` is aggregated per local day by `groupCapeByDay()`
- Fixed thresholds (not user-configurable) live in `THRESHOLDS`
- Storm/snow alerts carry a full WMO description as `title` (no numeric codes); other rules use a metric in the optional `detail`
- WMO wording lives in `src/utils/wmo.ts` (Spanish, based on table **4680**, automatic station) and is shared with the 7-day forecast

## Conventions (from bun-instructions.md)

- Use `Bun.serve()` for HTTP, `Bun.file` for FS, `Bun.$` for shell
- No `dotenv` — Bun auto-loads `.env`
- No Express, ws, ioredis, pg — use Bun built-ins
- HTML imports for frontend if needed
- Puedes usar `@bun-instructions.md` para obtener instrucciones de Bun.

## API Integration (OpenMeteo)

1. Geocoding: `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5&language=es&format=json`
2. Current weather: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m`
3. 7-day forecast: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=7`

## CLI Menu (implemented)

```
1. Clima de ciudad default
2. Clima de todas las ciudades
3. Buscar y agregar ciudad
4. Eliminar ciudad
5. Establecer ciudad default
6. Pronóstico 7 días (default)
7. Pronóstico 7 días (elegir ciudad)
8. Ajustes (°C/°F)
9. Alertas meteorológicas
10. Listar ciudades
0. Salir
```

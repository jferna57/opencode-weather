# Weather CLI App - Agent Instructions

## Runtime & Tooling

- **Runtime**: Bun (not Node.js) — use `bun` commands exclusively
- **Package manager**: `bun install` / `bun add`
- **Run**: `bun src/index.ts` (entry point)
- **Build binary**: `bun build src/index.ts --compile --outfile weather`
- **Test**: `bun test` (uses `bun:test`)
- **Typecheck**: `bunx tsc --noEmit`

## Project Structure

- `src/index.ts` — entry point: menu loop + option handlers
- `src/db.ts` — SQLite via `bun:sqlite`, persists to `~/.config/weather-cli/weather.db` (override dir with `WEATHER_CONFIG_DIR` env var, used by tests)
- `src/api.ts` — `geocode()` (returns up to 5 results), `fetchWeather()`, `fetchForecast()` (7-day, native `fetch`)
- `src/ui.ts` — menu rendering, `prompts` interactions (cancel-safe wrapper), kleur colors, spinner, forecast display
- `src/alerts.ts` — alerts: `DayMetrics`, `THRESHOLDS`, `evaluateDay()`, `groupCapeByDay()`, `tempThreshold()`
- `src/wmo.ts` — WMO weather-code table (`WMO_CODES`, `STORM_CODES`, `SNOW_CODES`, `describeWmoCode()`) shared by alerts and forecast
- `src/types.ts` — shared types
- `src/db.test.ts` — storage tests (isolated temp DB via `WEATHER_CONFIG_DIR`)
- `src/api.test.ts` — API tests with mocked `fetch`
- `src/alerts.test.ts` / `src/wmo.test.ts` — pure unit tests for threshold evaluation and code descriptions
- `tsconfig.json` — Strict TypeScript, bundler module resolution, ESNext target

## State

- Menu options 0-9 implemented; unit (°C/°F) persisted in `settings` table
- Options 6/7: 7-day forecast (default city / pick a city)
- Option 9: derived weather alerts for all cities (single multi-coordinate Open-Meteo request)
- First city added becomes default automatically; duplicate cities are rejected by name+coords
- Colors via `kleur`: cyan (menu), yellow (temps), green (info), red (errors)
- Async operations show a spinner; geocoding returns multiple results with a select prompt for ambiguous names
- Dependencies: `prompts` (UI), `kleur` (colors). Keep `bunx tsc --noEmit` and `bun test` clean before finishing

## Alerts (option 9)

- **Open-Meteo has no alerts endpoint.** `GET /v1/alerts` is 404 and `alerts=true` is silently ignored; `daily=cape` is an HTTP 400 (CAPE is hourly-only)
- Alerts are therefore *derived* from forecast variables in `src/alerts.ts` (pure, unit-tested) and fetched by `fetchAlerts()` in `src/api.ts`
- One request for the whole list: comma-separated lat/lon returns a JSON array in input order (a single city returns an object, so responses are normalized)
- `daily` requires `timezone=auto`; `hourly=cape` is aggregated per local day by `groupCapeByDay()`
- Fixed thresholds (not user-configurable) live in `THRESHOLDS`
- Storm/snow alerts carry a full WMO description as `title` (no numeric codes); other rules use a metric in the optional `detail`
- WMO wording lives in `src/wmo.ts` (Spanish, based on table **4680**, automatic station) and is shared with the 7-day forecast

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
0. Salir
```

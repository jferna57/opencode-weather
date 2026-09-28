# Weather CLI App - Agent Instructions

## Runtime & Tooling

- **Runtime**: Bun (not Node.js) — use `bun` commands exclusively
- **Package manager**: `bun install` / `bun add`
- **Run**: `bun index.ts` (entry point)
- **Build binary**: `bun build index.ts --compile --outfile weather`
- **Test**: `bun test` (uses `bun:test`)
- **Typecheck**: `bunx tsc --noEmit`

## Project Structure

- `index.ts` — CLI entry point (currently minimal)
- `tsconfig.json` — Strict TypeScript, bundler module resolution, ESNext target
- No test files yet

## Conventions (from bun-instructions.md)

- Use `Bun.serve()` for HTTP, `Bun.file` for FS, `Bun.$` for shell
- No `dotenv` — Bun auto-loads `.env`
- No Express, ws, ioredis, pg — use Bun built-ins
- HTML imports for frontend if needed
- Puedes usar `@bun-instructions.md` para obtener instrucciones de Bun.

## API Integration (OpenMeteo)

1. Geocoding: `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=es&format=json`
2. Forecast: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m`

## Planned CLI Menu

```
1. Clima de ciudad default
2. Clima de todas las ciudades
3. Buscar y agregar ciudad
4. Eliminar ciudad
5. Establecer ciudad default
8. Ajustes (°C/°F)
9. Salir
```

## Key Files to Modify

- `index.ts` — Main CLI logic (currently just `console.log`)
- Add storage for cities (file-based or SQLite via `bun:sqlite`)

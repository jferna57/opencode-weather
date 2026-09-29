import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Prefijo de los directorios de configuración aislados de los tests.
 */
const PREFIX = "weather-cli-test-";

/**
 * Directorio de configuración aislado que comparten todos los ficheros de test.
 *
 * `src/storage/database.ts` abre la conexión SQLite como singleton en el
 * primer import, y Bun ejecuta todos los ficheros de test en un único proceso.
 * Por eso el directorio se fija aquí, una sola vez y en el primer import: así
 * todos los ficheros usan la misma base de pruebas en vez de pelearse por
 * abrirla en sitios distintos.
 *
 * `WEATHER_CONFIG_DIR` tiene que fijarse ANTES de importar `src/storage/*`:
 * los `import` estáticos se evalúan antes que el cuerpo del módulo, así que
 * quien toque el almacenamiento debe importar este helper entre sus primeros
 * imports y usar `import()` dinámico para el storage.
 * `tests/helpers/actionHarness.ts` lo resuelve así por todos los ficheros de
 * acciones, para que no dependan del orden de sus `import`.
 */
export const SANDBOX_DIR = mkdtempSync(join(tmpdir(), PREFIX));

process.env.WEATHER_CONFIG_DIR = SANDBOX_DIR;

// Los ficheros de test se evaluan justo antes de ejecutarse, no todos al
// principio, así que ningún `afterAll` puede saber cuándo es el último: el
// primero en terminar borraría la base y dejaría al resto con la conexión
// abierta sobre un fichero inexistente (`SQLiteError: disk I/O error`).
// `process.on("exit")` y `beforeExit` tampoco sirven: Bun no los dispara al
// terminar la suite.
//
// La limpieza se hace entonces al principio de la siguiente ejecución, que es
// el único punto en el que se sabe que la anterior ya terminó: para entonces
// Bun ha cerrado la base de datos y nadie más la va a abrir. Como el directorio
// se nombra con el prefijo de arriba, basta con borrar los hermanos que no sean
// el recién creado.
for (const entry of readdirSync(tmpdir())) {
  if (entry.startsWith(PREFIX) && entry !== SANDBOX_DIR.split("/").pop()) {
    rmSync(join(tmpdir(), entry), { recursive: true, force: true });
  }
}

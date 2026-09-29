import { afterAll, mock } from "bun:test";
import { isAbsolute, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");

/**
 * `mock.module` resuelve su especificador **respecto al fichero que la
 * llama**, no respecto a quien usa este helper. Por eso aquí se convierte a
 * ruta absoluta: si no, el especificador depende de la profundidad desde la que
 * se escriba y un `../src/api` desde `tests/` acaba pidiendo un módulo de
 * fuera del proyecto, que Bun acepta en silencio y luego no sustituye nada.
 *
 * Se aceptan las dos formas intencionadamente:
 * - `"./src/api"` → módulo del proyecto, relativo a la raíz del repositorio.
 * - `"prompts"` → especificador desnudo, o sea un paquete de `node_modules`.
 */
function resolveSpecifier(modulePath: string): string {
  if (isAbsolute(modulePath) || !modulePath.startsWith(".")) return modulePath;
  return resolve(PROJECT_ROOT, modulePath);
}

/**
 * Sustituye un módulo por un doble de prueba y lo restaura al terminar el
 * fichero.
 *
 * `mock.module` reescribe el registro de módulos del proceso y Bun ejecuta
 * todos los ficheros de test en ese mismo proceso, así que un doble sin
 * restaurar contaminaría los ficheros que se ejecuten después (y el orden es
 * alfabético, no el que interesa). Por eso se fotografía el módulo real antes
 * de sustituirlo y se vuelve a registrar en `afterAll`.
 *
 * `real` debe ser el espacio de nombres real del módulo, importado de forma
 * estática por quien llama: es lo que garantiza que la fotografía se tome
 * antes de instalar el doble.
 */
export function mockWithRestore(
  modulePath: string,
  real: object,
  factory: () => object,
): void {
  const specifier = resolveSpecifier(modulePath);
  const snapshot = { ...real };
  mock.module(specifier, factory);
  afterAll(() => {
    mock.module(specifier, () => snapshot);
  });
}

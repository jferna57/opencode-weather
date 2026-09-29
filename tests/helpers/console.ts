import { spyOn } from "bun:test";
import kleur from "kleur";

const ANSI_PATTERN = /\u001B\[[0-9;]*m/g;

/** Elimina los códigos de color ANSI de un texto. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

export interface CapturedConsole {
  /** Todo lo escrito por `console.log`, partido en líneas físicas. */
  readonly lines: string[];
  /** Todo lo escrito por `console.log`, con los códigos de color intactos. */
  readonly rawLines: string[];
  /** Todo lo escrito por `console.error`, partido en líneas físicas. */
  readonly errorLines: string[];
  /** Número de llamadas a `console.log`. */
  readonly logCalls: number;
  /** Devuelve los dobles a su estado original. */
  restore(): void;
}

/**
 * Captura `console.log` y `console.error` durante la prueba.
 *
 * La salida se parte por saltos de línea porque el código imprime cabeceras
 * con `console.log("\n  título")`: son una sola llamada, pero quien lee la
 * terminal ve varias líneas, y las aserciones deben mirar lo mismo.
 *
 * El texto llega sin códigos ANSI porque `kleur` decide al formatear según
 * `kleur.enabled`, que depende de si la salida es una TTY; así las
 * aserciones sobre el contenido son iguales en terminal y en CI. Para las
 * pruebas que sí comprueban el color está `rawLines`.
 */
export function captureConsole(): CapturedConsole {
  let log = "";
  let raw = "";
  let error = "";

  const logSpy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    const line = `${args.map(String).join(" ")}\n`;
    log += line;
    raw += line;
  });
  const errorSpy = spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    error += `${args.map(String).join(" ")}\n`;
  });

  const split = (text: string) => text.split("\n").slice(0, -1);

  return {
    get lines() {
      return split(stripAnsi(log));
    },
    get rawLines() {
      return split(raw);
    },
    get errorLines() {
      return split(stripAnsi(error));
    },
    get logCalls() {
      return logSpy.mock.calls.length;
    },
    restore() {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}

/**
 * Silencia `console.log` y `console.error` y devuelve la función que los
 * restaura. Lo usan las pruebas de acciones, que imprimen líneas en blanco
 * para separar secciones y ensuciarían la salida del runner.
 */
export function silenceConsole(): () => void {
  const logSpy = spyOn(console, "log").mockImplementation(() => {});
  const errorSpy = spyOn(console, "error").mockImplementation(() => {});
  return () => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  };
}

/**
 * Fija `kleur.enabled` y devuelve la función que restaura el valor anterior.
 *
 * Permite mantener el resto de aserciones sobre texto plano y comprobar el
 * color sin depender de si la salida es una TTY. Se usa en `beforeAll` /
 * `afterAll` y no en `afterEach`: el estado de `kleur` es global al proceso y
 * los ficheros de test se ejecutan en el mismo, así que restaurarlo tras cada
 * prueba haría que un fichero encendiera los colores del siguiente.
 */
export function setColors(enabled: boolean): () => void {
  const previous = kleur.enabled;
  kleur.enabled = enabled;
  return () => {
    kleur.enabled = previous;
  };
}

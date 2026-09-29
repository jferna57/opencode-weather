import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { setColors, stripAnsi } from "../helpers/console";
import { FRAMES } from "../../src/utils/constants";
import { startSpinner } from "../../src/presentation/spinner";

let restoreColors: (() => void) | undefined;

afterEach(() => {
  restoreColors?.();
  restoreColors = undefined;
});

/** Captura `process.stdout.write`, que es donde el spinner escribe. */
function captureStdout() {
  let written = "";
  const spy = spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    written += String(chunk);
    return true;
  });
  return {
    written: () => written,
    restore: () => spy.mockRestore(),
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("startSpinner", () => {
  test("returns a stop function", () => {
    const out = captureStdout();
    try {
      const stop = startSpinner("Consultando…");
      expect(typeof stop).toBe("function");
      // Hay que pararlo siempre: el temporizador vive en el proceso y seguiría
      // escribiendo durante el resto de la ejecución.
      stop();
    } finally {
      out.restore();
    }
  });

  test("animates the message with the shared frames", async () => {
    restoreColors = setColors(false);
    const out = captureStdout();
    try {
      const stop = startSpinner("Consultando Madrid…");
      await wait(300);
      stop();

      const text = stripAnsi(out.written());
      const seen = FRAMES.filter((frame) => text.includes(frame));

      // A 80 ms por fotograma, 300 ms dan margen para varios fotogramas aunque
      // el temporizador no dispare en el milisegundo exacto.
      expect(seen.length).toBeGreaterThan(1);
      expect(text).toContain("Consultando Madrid…");
    } finally {
      out.restore();
    }
  });

  test("stops writing once stopped", async () => {
    restoreColors = setColors(false);
    const out = captureStdout();
    try {
      const stop = startSpinner("Parando…");
      await wait(200);
      stop();

      const afterStop = out.written().length;
      expect(afterStop).toBeGreaterThan(0);

      await wait(250);
      expect(out.written().length).toBe(afterStop);
    } finally {
      out.restore();
    }
  });

  test("clears the spinner line when stopped", async () => {
    restoreColors = setColors(false);
    const out = captureStdout();
    try {
      const stop = startSpinner("Ocho");
      await wait(120);
      stop();

      const text = stripAnsi(out.written());
      // \r + tantos espacios como ocupa el mensaje más la sangría, y otro \r
      // para volver al principio.
      expect(text.endsWith(`\r${" ".repeat("Ocho".length + 6)}\r`)).toBe(true);
    } finally {
      out.restore();
    }
  });

  test("can be stopped before the first frame", () => {
    restoreColors = setColors(false);
    const out = captureStdout();
    try {
      const stop = startSpinner("Instantáneo");
      stop();

      expect(stripAnsi(out.written())).toBe(
        `\r${" ".repeat("Instantáneo".length + 6)}\r`,
      );
    } finally {
      out.restore();
    }
  });
});

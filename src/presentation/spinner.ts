import kleur from "kleur";
import { FRAMES } from "../utils/constants";

/** Spinner por línea de comando; devuelve la función que lo detiene. */
export function startSpinner(message: string): () => void {
  let i = 0;
  const frame = setInterval(() => {
    process.stdout.write(`\r  ${kleur.cyan(FRAMES[i % FRAMES.length]!)} ${message}`);
    i++;
  }, 80);

  return () => {
    clearInterval(frame);
    process.stdout.write("\r" + " ".repeat(message.length + 6) + "\r");
  };
}

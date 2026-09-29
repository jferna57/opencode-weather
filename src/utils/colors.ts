import kleur from "kleur";
import type { AlertSeverity } from "../types";

/** Etiqueta y color de cada severidad de alerta en la salida por consola. */
export const SEVERITY_BADGE: Record<
  AlertSeverity,
  { text: string; color: (text: string) => string }
> = {
  info: { text: " info   ", color: kleur.yellow },
  warning: { text: "aviso  ", color: kleur.red },
  danger: { text: "peligro", color: kleur.magenta },
};

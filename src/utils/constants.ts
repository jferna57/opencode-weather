import type { MenuOption } from "../types";

/** Separador de cabecera y cierre del menú. */
export const LINE = "═".repeat(41);

/** Fotogramas de la animación del spinner. */
export const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

export const WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

export const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** Opciones ofrecidas por el menú; la unión vive en `types/MenuOption.ts`. */
export const MENU_OPTIONS: readonly MenuOption[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

import kleur from "kleur";
import { MENU_OPTIONS, LINE } from "../utils/constants";
import type { MenuOption, Unit } from "../types";
import { ask } from "./prompt";

export function printMenu(cityCount: number, unit: Unit): void {
  const label = unit === "celsius" ? "°C" : "°F";
  printHeader();
  console.log(kleur.cyan("  1. Clima de ciudad default"));
  console.log(kleur.cyan(`  2. Clima de todas las ciudades (${cityCount})`));
  console.log(kleur.cyan("  3. Buscar y agregar ciudad"));
  console.log(kleur.cyan("  4. Eliminar ciudad"));
  console.log(kleur.cyan("  5. Establecer ciudad default"));
  console.log(kleur.cyan("  6. Pronóstico 7 días (default)"));
  console.log(kleur.cyan("  7. Pronóstico 7 días (elegir ciudad)"));
  console.log(kleur.cyan(`  8. Ajustes (${label})`));
  console.log(kleur.cyan("  9. Alertas meteorológicas"));
  console.log(kleur.cyan(" 10. Listar ciudades"));
  console.log(kleur.cyan("  0. Salir"));
  console.log(LINE);
}

function printHeader(): void {
  console.log(`\n${LINE}\n${kleur.cyan("         WEATHER CLI")}\n${LINE}`);
}

export async function askMenuOption(): Promise<MenuOption> {
  const { option } = await ask<{ option: string }>(
    {
      type: "text",
      name: "option",
      message: "Selecciona una opción",
      // El vacío se rechaza a propósito: `Number("")` es `0` y `0` es una
      // opción válida, así que sin esta guarda un Enter accidental salía de la
      // aplicación. Cancelar (Ctrl+C) ya lo resuelve el `fallback`.
      validate: (value: string) => {
        const trimmed = value.trim();
        return (
          (trimmed.length > 0 && MENU_OPTIONS.includes(Number(trimmed) as MenuOption)) ||
          "Opción inválida"
        );
      },
    },
    { option: "0" },
  );

  return Number(option.trim()) as MenuOption;
}

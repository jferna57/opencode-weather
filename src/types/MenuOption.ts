/**
 * Opciones del menú. La unión es explícita (y no derivada de un array)
 * para que `types/` no aloje valores de runtime: el array vive en
 * `utils/constants.ts`.
 */
export type MenuOption = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

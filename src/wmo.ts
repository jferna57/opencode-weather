/**
 * Tabla de descripciones WMO de los códigos de clima.
 *
 * Fuente: WMO 4680 «Present weather reported from an automatic weather
 * station», en https://artefacts.ceda.ac.uk/badc_datadocs/surface/code.html
 *
 * Open-Meteo emite su propio subconjunto de códigos (heredado de la tabla
 * 4677, usada por estaciones con observador), que coincide con la 4680
 * salvo tres discrepancias. En esos tres casos se conserva la semántica de
 * Open-Meteo para no contradecir a la API:
 *
 * - 95 → «Tormenta fuerte con chubascos de lluvia y/o nieve» (4680, que es
 *   además lo que Open-Meteo describe como slight/moderate); se adopta el
 *   texto literal de la 4680.
 * - 99 → la 4680 dice «Tornado», pero Open-Meteo lo reserva para
 *   «Thunderstorm with heavy hail». Se usa granizo: «Tornado» sería un
 *   falso positivo peligroso.
 * - 75 → la 4680 dice «Ice pellets», mientras Open-Meteo lo usa para
 *   «Heavy snow fall». Se usa nieve.
 *
 * El código 97 es «Reserved» en la 4680 y Open-Meteo jamás lo devuelve,
 * por lo que no aparece en la tabla.
 */
export const WMO_CODES: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con depósito de escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna densa",
  56: "Llovizna helada ligera",
  57: "Llovizna helada intensa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia fuerte",
  66: "Lluvia helada ligera",
  67: "Lluvia helada intensa",
  71: "Nieve ligera",
  73: "Nieve moderada",
  75: "Nieve fuerte",
  77: "Granos de nieve",
  80: "Chubascos de lluvia ligeros",
  81: "Chubascos de lluvia moderados",
  82: "Chubascos de lluvia fuertes",
  85: "Chubascos de nieve ligeros",
  86: "Chubascos de nieve fuertes",
  95: "Tormenta fuerte con chubascos de lluvia y/o nieve",
  96: "Tormenta con granizo ligero",
  99: "Tormenta fuerte con granizo",
};

/** Códigos que describen una tormenta explícita. */
export const STORM_CODES: ReadonlySet<number> = new Set([95, 96, 99]);

/** Códigos que describen nieve o chubascos de nieve. */
export const SNOW_CODES: ReadonlySet<number> = new Set([71, 73, 75, 77, 85, 86]);

/** Describe un código WMO en español; desconocidos devuelven `Código N`. */
export function describeWmoCode(code: number): string {
  return WMO_CODES[code] ?? `Código ${code}`;
}

import prompts from "prompts";

/**
 * Ejecuta un prompt y devuelve el fallback si el usuario cancela
 * (Ctrl+C) o si la librería lanza.
 */
export async function ask<T extends Record<string, unknown>>(
  questions: Parameters<typeof prompts>[0],
  fallback: T,
): Promise<T> {
  try {
    const answers = (await prompts(questions)) as T;
    return { ...fallback, ...answers };
  } catch {
    return fallback;
  }
}

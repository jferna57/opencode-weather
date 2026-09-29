import { afterAll, describe, expect, mock, test } from "bun:test";
import prompts from "prompts";
import type { PromptObject } from "prompts";
import { mockWithRestore } from "../helpers/modules";

/**
 * Pregunta válida y mínima. El tipo de `ask` es el de `prompts`, así que una
 * pregunta ad-hoc sin `name` no compila aunque el envoltorio no lo use: se
 * reutiliza esta para que las pruebas se centren en el comportamiento del
 * `fallback` y no en construir objetos de `prompts`.
 */
const QUESTION: PromptObject<string> = { type: "text", name: "value", message: "¿?" };

// `prompt.ts` importa el paquete entero, así que el doble se instala sobre
// `prompts` y no sobre el módulo propio: es la única forma de comprobar el
// comportamiento real del envoltorio `ask`.
const promptsMock = mock(async (_questions: unknown) => ({}) as Record<string, unknown>);

mockWithRestore("prompts", { ...prompts, default: promptsMock }, () => ({
  ...prompts,
  default: promptsMock,
}));

const { ask } = await import("../../src/presentation/prompt");

afterAll(() => {
  promptsMock.mockReset();
});

describe("ask", () => {
  test("passes the questions through untouched", async () => {
    promptsMock.mockResolvedValue({ value: "Madrid" });

    await ask(QUESTION, { value: "" });

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(promptsMock.mock.calls[0]?.[0]).toBe(QUESTION);
  });

  test("merges the answers over the fallback", async () => {
    promptsMock.mockResolvedValue({ value: "Madrid" });

    expect(await ask(QUESTION, { value: "", extra: 1 })).toEqual({
      value: "Madrid",
      extra: 1,
    });
  });

  test("keeps the fallback for keys the answers do not cover", async () => {
    // Es lo que hace que un prompt cancelado a medias no rompa el código de
    // arriba: cada valor llega o con lo respondido o con su defecto.
    promptsMock.mockResolvedValue({ value: "Madrid" });

    expect(await ask(QUESTION, { value: "", unit: "celsius" })).toEqual({
      value: "Madrid",
      unit: "celsius",
    });
  });

  test("returns the fallback when the answers object is empty", async () => {
    promptsMock.mockResolvedValue({});

    expect(await ask(QUESTION, { value: "" })).toEqual({ value: "" });
  });

  test("returns the fallback when the library throws", async () => {
    promptsMock.mockRejectedValue(new Error("stdin closed"));

    expect(await ask(QUESTION, { value: "" })).toEqual({ value: "" });
  });

  test("returns the fallback when the library rejects with a non-Error", async () => {
    promptsMock.mockRejectedValue("boom");

    expect(await ask(QUESTION, { value: "" })).toEqual({ value: "" });
  });

  test("answers win over the fallback, not the other way round", async () => {
    promptsMock.mockResolvedValue({ value: " Respondida " });

    expect(await ask(QUESTION, { value: "Defecto" })).toEqual({ value: " Respondida " });
  });
});

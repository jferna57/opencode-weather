import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { silenceConsole } from "../helpers/console";
import {
  mockActionDeps,
  resetActionMocks,
  resetStorage,
  storage,
} from "../helpers/actionHarness";


const harness = mockActionDeps();
const { presentation } = harness;
const { settingsAction } = await import("../../src/actions/settings");

let restoreConsole: () => void;
beforeEach(() => {
  resetStorage();
  restoreConsole = silenceConsole();
});
afterEach(() => {
  restoreConsole();
  resetActionMocks(harness);
});

describe("settingsAction", () => {
  test("offers the unit that is currently active", async () => {
    storage.setUnit("fahrenheit");

    await settingsAction();

    expect(presentation.pickUnit).toHaveBeenCalledWith("fahrenheit");
  });

  test("keeps the current unit when the prompt is cancelled", async () => {
    storage.setUnit("fahrenheit");

    await settingsAction();

    expect(storage.getUnit()).toBe("fahrenheit");
    expect(presentation.printInfo).not.toHaveBeenCalled();
  });

  test("persists celsius", async () => {
    storage.setUnit("fahrenheit");
    presentation.pickUnit.mockResolvedValue("celsius");

    await settingsAction();

    expect(storage.getUnit()).toBe("celsius");
    expect(presentation.printInfo).toHaveBeenCalledWith("Unidad: °C");
  });

  test("persists fahrenheit", async () => {
    presentation.pickUnit.mockResolvedValue("fahrenheit");

    await settingsAction();

    expect(storage.getUnit()).toBe("fahrenheit");
    expect(presentation.printInfo).toHaveBeenCalledWith("Unidad: °F");
  });

  test("re-selecting the same unit is idempotent", async () => {
    storage.setUnit("celsius");
    presentation.pickUnit.mockResolvedValue("celsius");

    await settingsAction();

    expect(storage.getUnit()).toBe("celsius");
  });
});

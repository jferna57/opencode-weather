import { afterAll, describe, expect, test } from "bun:test";
import kleur from "kleur";
import { setColors } from "../helpers/console";
import { SEVERITY_BADGE } from "../../src/utils/colors";
import type { AlertSeverity } from "../../src/types";

const restoreColors = setColors(false);
afterAll(restoreColors);

const SEVERITIES: AlertSeverity[] = ["info", "warning", "danger"];

describe("SEVERITY_BADGE", () => {
  test("has one badge per alert severity and no others", () => {
    expect(Object.keys(SEVERITY_BADGE).sort()).toEqual([...SEVERITIES].sort());
  });

  test("pads every label to the same width so the columns line up", () => {
    const widths = SEVERITIES.map((s) => SEVERITY_BADGE[s].text.length);
    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBe(7);
  });

  test("keeps every label on a single line so it cannot break the layout", () => {
    for (const severity of SEVERITIES) {
      const { text } = SEVERITY_BADGE[severity];
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain("\n");
    }
  });

  test("assigns a different colour to every severity", () => {
    const restore = setColors(true);
    try {
      const coloured = SEVERITIES.map((s) => SEVERITY_BADGE[s].color("X"));
      expect(coloured).toEqual([kleur.yellow("X"), kleur.red("X"), kleur.magenta("X")]);
      expect(new Set(coloured).size).toBe(SEVERITIES.length);
    } finally {
      restore();
    }
  });

  test("colours the label when enabled and returns it plain when not", () => {
    const restore = setColors(true);
    try {
      const painted = SEVERITY_BADGE.danger.color(SEVERITY_BADGE.danger.text);
      expect(painted).not.toBe(SEVERITY_BADGE.danger.text);
      expect(painted).toMatch(/\u001B\[/);

      const restorePlain = setColors(false);
      try {
        expect(SEVERITY_BADGE.danger.color(SEVERITY_BADGE.danger.text)).toBe(
          SEVERITY_BADGE.danger.text,
        );
      } finally {
        restorePlain();
      }
    } finally {
      restore();
    }
  });
});

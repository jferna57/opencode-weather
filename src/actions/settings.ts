import { pickUnit, printInfo } from "../presentation";
import { getUnit, setUnit } from "../storage";

export async function settingsAction(): Promise<void> {
  const unit = await pickUnit(getUnit());
  if (!unit) return;

  setUnit(unit);
  printInfo(`Unidad: ${unit === "celsius" ? "°C" : "°F"}`);
}

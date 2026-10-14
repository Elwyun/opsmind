import { round } from "./round";

export type EnergyIntensityFailure = "ZERO_PRODUCTION" | "MISSING_VALUES";

export interface EnergyIntensityInput {
  electricityKwh: number | null | undefined;
  productionUnits: number | null | undefined;
  operatingHours?: number | null | undefined;
}

export type EnergyIntensityResult =
  | {
      ok: true;
      /** kWh per produced unit, rounded to 6 decimals. */
      intensity: number;
      /** kWh per operating hour, or null when operating hours are unusable. */
      electricityPerHour: number | null;
      electricityKwh: number;
      productionUnits: number;
    }
  | {
      ok: false;
      reason: EnergyIntensityFailure;
      message: string;
    };

function isUsableNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Rule: `energyIntensity = electricityKwh / productionUnits`.
 *
 * If production is zero or missing, or electricity is missing, no intensity is
 * produced — the day is reported as insufficient data instead of a fake number.
 */
export function computeEnergyIntensity(input: EnergyIntensityInput): EnergyIntensityResult {
  const { electricityKwh, productionUnits } = input;

  if (productionUnits === null || productionUnits === undefined) {
    return {
      ok: false,
      reason: "MISSING_VALUES",
      message: "Production units are missing for this day.",
    };
  }
  if (electricityKwh === null || electricityKwh === undefined) {
    return {
      ok: false,
      reason: "MISSING_VALUES",
      message: "Electricity consumption is missing for this day.",
    };
  }
  if (!isUsableNumber(productionUnits) || !isUsableNumber(electricityKwh)) {
    return {
      ok: false,
      reason: "MISSING_VALUES",
      message: "Production or electricity values are not valid numbers.",
    };
  }
  if (productionUnits <= 0) {
    return {
      ok: false,
      reason: "ZERO_PRODUCTION",
      message: "Production was zero, so energy intensity cannot be calculated.",
    };
  }
  if (electricityKwh < 0) {
    return {
      ok: false,
      reason: "MISSING_VALUES",
      message: "Electricity consumption cannot be negative.",
    };
  }

  const hours = input.operatingHours;
  const electricityPerHour =
    isUsableNumber(hours) && hours > 0 ? round(electricityKwh / hours, 3) : null;

  return {
    ok: true,
    intensity: round(electricityKwh / productionUnits, 6),
    electricityPerHour,
    electricityKwh,
    productionUnits,
  };
}

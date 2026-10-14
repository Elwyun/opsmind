import { DEFAULT_CURRENCY } from "./constants";
import { formatNumber } from "../format";
import { round } from "./round";

export interface CostImpactInput {
  actualKwh: number;
  productionUnits: number;
  /** kWh per unit, from the comparison baseline. */
  baselineIntensity: number;
  /** Tariff per kWh (not a bill total). */
  tariffPerKwh: number;
  currency?: string;
}

export interface CostImpact {
  currency: string;
  /** productionUnits x baselineIntensity */
  expectedKwh: number;
  /** max(0, actualKwh - expectedKwh) */
  potentialExcessKwh: number;
  /** potentialExcessKwh x tariffPerKwh */
  estimatedAdditionalCost: number;
  tariffPerKwh: number;
  formula: string;
  assumptions: string[];
}

/**
 * Rules:
 * - `expectedKwh = productionUnits * baselineIntensity`
 * - `potentialExcessKwh = max(0, actualKwh - expectedKwh)`
 * - `estimatedAdditionalCost = potentialExcessKwh * electricityTariff`
 *
 * The result is always a *potential* estimate. It never implies that the tariff
 * difference was actually paid, nor that a specific cause produced it.
 */
export function computeCostImpact(input: CostImpactInput): CostImpact {
  const { actualKwh, productionUnits, baselineIntensity, tariffPerKwh } = input;
  const currency = input.currency ?? DEFAULT_CURRENCY;

  const expectedRaw = productionUnits * baselineIntensity;
  const excessRaw = Math.max(0, actualKwh - expectedRaw);
  const costRaw = excessRaw * tariffPerKwh;

  const expectedKwh = round(expectedRaw, 3);
  const potentialExcessKwh = round(excessRaw, 3);
  const estimatedAdditionalCost = round(costRaw, 2);

  const formula =
    "expectedKwh = " +
    `${formatNumber(productionUnits)} units x ${formatNumber(baselineIntensity, 6)} kWh/unit = ${formatNumber(expectedKwh, 1)} kWh; ` +
    "potentialExcessKwh = max(0, " +
    `${formatNumber(actualKwh, 1)} - ${formatNumber(expectedKwh, 1)}) = ${formatNumber(potentialExcessKwh, 1)} kWh; ` +
    "estimatedAdditionalCost = " +
    `${formatNumber(potentialExcessKwh, 1)} kWh x ${formatNumber(tariffPerKwh, 2)} ${currency}/kWh = ` +
    `${formatNumber(estimatedAdditionalCost, 0)} ${currency}`;

  return {
    currency,
    expectedKwh,
    potentialExcessKwh,
    estimatedAdditionalCost,
    tariffPerKwh,
    formula,
    assumptions: [
      "The baseline is the average energy intensity of this company's own comparison window.",
      `The electricity tariff is ${formatNumber(tariffPerKwh, 2)} ${currency} per kWh (a tariff, not a bill total).`,
      "The amount is a potential estimate based on a heuristic threshold, not verified savings.",
      "No cause is implied. A confirmed change would require a before/after measurement.",
    ],
  };
}

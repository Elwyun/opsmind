import { computeEnergyIntensity } from "./energy-intensity";
import type { DailyOperationalRecord } from "./metrics";
import { round } from "./round";

export interface WindowIntensityResult {
  ok: boolean;
  meanIntensity: number | null;
  sampleSize: number;
  from: string;
  to: string;
  reason: string | null;
}

/**
 * Average energy intensity across a date window (inclusive).
 *
 * Used by before/after verification. Days without a usable intensity are
 * skipped; if fewer than `minDays` remain the window is reported as
 * insufficient rather than averaged over an empty or tiny sample.
 */
export function meanIntensityOverWindow(
  records: DailyOperationalRecord[],
  from: string,
  to: string,
  minDays = 1,
): WindowIntensityResult {
  const intensities: number[] = [];

  for (const record of records) {
    if (record.date < from || record.date > to) continue;
    const intensity = computeEnergyIntensity({
      electricityKwh: record.electricityKwh,
      productionUnits: record.productionUnits,
      operatingHours: record.operatingHours,
    });
    if (intensity.ok) intensities.push(intensity.intensity);
  }

  if (intensities.length < minDays) {
    return {
      ok: false,
      meanIntensity: null,
      sampleSize: intensities.length,
      from,
      to,
      reason:
        `Insufficient data: ${intensities.length} of ${minDays} required days have a usable ` +
        `energy intensity between ${from} and ${to}.`,
    };
  }

  const total = intensities.reduce((sum, value) => sum + value, 0);
  return {
    ok: true,
    meanIntensity: round(total / intensities.length, 6),
    sampleSize: intensities.length,
    from,
    to,
    reason: null,
  };
}

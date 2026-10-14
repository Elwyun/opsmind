import { DEFAULT_BASELINE_WINDOW_DAYS, MIN_BASELINE_DAYS } from "./constants";
import { round } from "./round";

export interface BaselinePoint {
  /** `YYYY-MM-DD` */
  date: string;
  /** kWh per unit, or null when the day cannot produce an intensity. */
  intensity: number | null;
}

export interface BaselineOptions {
  /** How many preceding days to average. */
  windowDays?: number;
  /** Minimum usable days required to trust the baseline. */
  minBaselineDays?: number;
}

export type BaselineResult =
  | {
      ok: true;
      baselineIntensity: number;
      sampleSize: number;
      from: string;
      to: string;
    }
  | {
      ok: false;
      reason: "INSUFFICIENT_BASELINE";
      message: string;
      sampleSize: number;
    };

function isPositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Builds the comparison baseline for `targetDate`.
 *
 * Rules applied:
 * - The tested day is never part of its own baseline.
 * - Only the `windowDays` days immediately before the target are considered.
 * - Days without a usable intensity (e.g. zero production) are skipped.
 * - If fewer than `minBaselineDays` usable days remain, the baseline is
 *   reported as insufficient instead of being guessed.
 */
export function computeBaseline(
  targetDate: string,
  series: BaselinePoint[],
  options: BaselineOptions = {},
): BaselineResult {
  const windowDays = options.windowDays ?? DEFAULT_BASELINE_WINDOW_DAYS;
  const minDays = options.minBaselineDays ?? MIN_BASELINE_DAYS;

  const priorUsable = series
    .filter((point) => point.date < targetDate)
    .filter((point) => isPositive(point.intensity))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const windowPoints = priorUsable.slice(-windowDays);

  if (windowPoints.length < minDays) {
    return {
      ok: false,
      reason: "INSUFFICIENT_BASELINE",
      message:
        `Insufficient baseline data: ${windowPoints.length} of ${minDays} required ` +
        `comparison days are available for ${targetDate}.`,
      sampleSize: windowPoints.length,
    };
  }

  const total = windowPoints.reduce((sum, point) => sum + (point.intensity as number), 0);
  const baselineIntensity = round(total / windowPoints.length, 6);

  return {
    ok: true,
    baselineIntensity,
    sampleSize: windowPoints.length,
    from: windowPoints[0].date,
    to: windowPoints[windowPoints.length - 1].date,
  };
}

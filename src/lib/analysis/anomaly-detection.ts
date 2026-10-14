import { DEFAULT_THRESHOLD_PERCENT, SEVERITY_BANDS } from "./constants";
import { round } from "./round";

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH";

export interface AnomalyAssessment {
  deviationPercent: number;
  thresholdPercent: number;
  isAnomaly: boolean;
  severity: Severity;
}

export interface DetectionOptions {
  thresholdPercent?: number;
}

/** Percentage deviation of an actual value from its baseline. */
export function computeDeviationPercent(actual: number, baseline: number): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(baseline) || baseline <= 0) return null;
  return round(((actual - baseline) / baseline) * 100, 2);
}

/**
 * Maps a deviation to a qualitative severity band. The bands are heuristic
 * prototype thresholds and are labelled as such in the UI.
 */
export function classifySeverity(deviationPercent: number): Severity {
  if (!Number.isFinite(deviationPercent)) return "INFO";
  if (deviationPercent >= SEVERITY_BANDS.high) return "HIGH";
  if (deviationPercent >= SEVERITY_BANDS.medium) return "MEDIUM";
  if (deviationPercent >= SEVERITY_BANDS.low) return "LOW";
  return "INFO";
}

/**
 * A day is an anomaly candidate when its deviation meets or exceeds the
 * configured threshold. Only upward deviations are treated as candidates,
 * because the product is about potential energy inefficiency.
 */
export function assessAnomaly(
  actualIntensity: number,
  baselineIntensity: number,
  options: DetectionOptions = {},
): AnomalyAssessment {
  const thresholdPercent = options.thresholdPercent ?? DEFAULT_THRESHOLD_PERCENT;
  const deviation = computeDeviationPercent(actualIntensity, baselineIntensity) ?? 0;

  return {
    deviationPercent: deviation,
    thresholdPercent,
    isAnomaly: deviation >= thresholdPercent,
    severity: classifySeverity(deviation),
  };
}

/**
 * Analysis constants.
 *
 * These thresholds are transparent prototype heuristics, not industry
 * standards. `METHOD_VERSION` is persisted on every investigation so a stored
 * result can be traced to the logic that produced it.
 */

/** Version tag for the baseline + deviation method. */
export const METHOD_VERSION = "baseline-v1";

/**
 * How many comparison days immediately before the tested day are used to build
 * the baseline.
 */
export const DEFAULT_BASELINE_WINDOW_DAYS = 7;

/**
 * Minimum number of valid comparison days required before a baseline is
 * considered trustworthy. Below this the day is reported as
 * "Insufficient baseline data".
 */
export const MIN_BASELINE_DAYS = 5;

/** Deviation above which a day is flagged as an anomaly candidate. */
export const DEFAULT_THRESHOLD_PERCENT = 15;

/** Severity bands, expressed as deviation percentages. Heuristic. */
export const SEVERITY_BANDS = {
  low: 15,
  medium: 25,
  high: 40,
} as const;

/** Default currency for estimated cost. */
export const DEFAULT_CURRENCY = "IDR";

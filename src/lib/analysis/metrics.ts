import {
  DEFAULT_BASELINE_WINDOW_DAYS,
  DEFAULT_CURRENCY,
  DEFAULT_THRESHOLD_PERCENT,
  METHOD_VERSION,
  MIN_BASELINE_DAYS,
} from "./constants";
import { assessAnomaly, type Severity } from "./anomaly-detection";
import { computeBaseline, type BaselinePoint } from "./baseline";
import { computeCostImpact } from "./cost-impact";
import { computeEnergyIntensity } from "./energy-intensity";
import { round } from "./round";

/** A single stored day, reduced to the fields the engine needs. */
export interface DailyOperationalRecord {
  date: string;
  productionUnits: number | null;
  electricityKwh: number | null;
  operatingHours: number | null;
  electricityPrice: number | null;
  temperatureC: number | null;
  humidityPercent: number | null;
  weather: string | null;
  sourceType: string | null;
  sourceName: string | null;
}

export type DayAnalysisStatus = "OK" | "INSUFFICIENT_DATA";

export interface DayMetrics {
  actualIntensity: number;
  baselineIntensity: number;
  deviationPercent: number;
  severity: Severity;
  isAnomaly: boolean;
  thresholdPercent: number;
  expectedKwh: number | null;
  potentialExcessKwh: number | null;
  estimatedAdditionalCost: number | null;
  currency: string;
  tariffPerKwh: number | null;
  baselineSampleSize: number;
  baselineFrom: string;
  baselineTo: string;
  formula: string | null;
  assumptions: string[];
}

export interface DayAnalysis {
  date: string;
  status: DayAnalysisStatus;
  /** Human-readable reason when the day cannot be analysed. */
  reason: string | null;
  methodVersion: string;
  record: DailyOperationalRecord;
  metrics: DayMetrics | null;
}

export interface AnalyzeOptions {
  windowDays?: number;
  minBaselineDays?: number;
  thresholdPercent?: number;
  currency?: string;
}

export function analyzeDay(
  record: DailyOperationalRecord,
  history: DailyOperationalRecord[],
  options: AnalyzeOptions = {},
): DayAnalysis {
  const currency = options.currency ?? DEFAULT_CURRENCY;

  const intensity = computeEnergyIntensity({
    electricityKwh: record.electricityKwh,
    productionUnits: record.productionUnits,
    operatingHours: record.operatingHours,
  });

  if (!intensity.ok) {
    return {
      date: record.date,
      status: "INSUFFICIENT_DATA",
      reason: intensity.message,
      methodVersion: METHOD_VERSION,
      record,
      metrics: null,
    };
  }

  const baselinePoints: BaselinePoint[] = history.map((day) => {
    const dayIntensity = computeEnergyIntensity({
      electricityKwh: day.electricityKwh,
      productionUnits: day.productionUnits,
      operatingHours: day.operatingHours,
    });
    return { date: day.date, intensity: dayIntensity.ok ? dayIntensity.intensity : null };
  });

  const baseline = computeBaseline(record.date, baselinePoints, {
    windowDays: options.windowDays ?? DEFAULT_BASELINE_WINDOW_DAYS,
    minBaselineDays: options.minBaselineDays ?? MIN_BASELINE_DAYS,
  });

  if (!baseline.ok) {
    return {
      date: record.date,
      status: "INSUFFICIENT_DATA",
      reason: baseline.message,
      methodVersion: METHOD_VERSION,
      record,
      metrics: null,
    };
  }

  const assessment = assessAnomaly(intensity.intensity, baseline.baselineIntensity, {
    thresholdPercent: options.thresholdPercent ?? DEFAULT_THRESHOLD_PERCENT,
  });

  const tariffPerKwh =
    typeof record.electricityPrice === "number" && Number.isFinite(record.electricityPrice) && record.electricityPrice > 0
      ? record.electricityPrice
      : null;

  const cost = tariffPerKwh
    ? computeCostImpact({
        actualKwh: intensity.electricityKwh,
        productionUnits: intensity.productionUnits,
        baselineIntensity: baseline.baselineIntensity,
        tariffPerKwh,
        currency,
      })
    : null;

  return {
    date: record.date,
    status: "OK",
    reason: null,
    methodVersion: METHOD_VERSION,
    record,
    metrics: {
      actualIntensity: intensity.intensity,
      baselineIntensity: baseline.baselineIntensity,
      deviationPercent: assessment.deviationPercent,
      severity: assessment.severity,
      isAnomaly: assessment.isAnomaly,
      thresholdPercent: assessment.thresholdPercent,
      expectedKwh: cost ? cost.expectedKwh : round(intensity.productionUnits * baseline.baselineIntensity, 3),
      potentialExcessKwh: cost ? cost.potentialExcessKwh : null,
      estimatedAdditionalCost: cost ? cost.estimatedAdditionalCost : null,
      currency,
      tariffPerKwh,
      baselineSampleSize: baseline.sampleSize,
      baselineFrom: baseline.from,
      baselineTo: baseline.to,
      formula: cost ? cost.formula : null,
      assumptions: cost ? cost.assumptions : [],
    },
  };
}

export interface PeriodSummary {
  dayCount: number;
  analyzableDayCount: number;
  totalElectricityKwh: number;
  totalProductionUnits: number;
  averageIntensity: number | null;
  anomalyCount: number;
  estimatedPotentialCost: number;
  currency: string;
  thresholdPercent: number;
  methodVersion: string;
  /** True when at least one record is labelled as simulated. */
  simulated: boolean;
}

export interface PeriodAnalysis {
  from: string | null;
  to: string | null;
  days: DayAnalysis[];
  anomalies: DayAnalysis[];
  insufficient: DayAnalysis[];
  summary: PeriodSummary;
}

/**
 * Runs the day engine over every record in a period. The full period is passed
 * as history for each day so baselines are consistent and deterministic.
 */
export function analyzePeriod(
  records: DailyOperationalRecord[],
  options: AnalyzeOptions = {},
): PeriodAnalysis {
  const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const days = sorted.map((record) => analyzeDay(record, sorted, options));

  const analyzed = days.filter((day) => day.status === "OK" && day.metrics);
  const anomalies = analyzed.filter((day) => day.metrics?.isAnomaly);
  const insufficient = days.filter((day) => day.status === "INSUFFICIENT_DATA");

  const totalElectricityKwh = round(
    sorted.reduce((sum, day) => sum + (day.electricityKwh ?? 0), 0),
    3,
  );
  const totalProductionUnits = sorted.reduce((sum, day) => sum + (day.productionUnits ?? 0), 0);

  const averageIntensity =
    analyzed.length > 0
      ? round(
          analyzed.reduce((sum, day) => sum + (day.metrics?.actualIntensity ?? 0), 0) /
            analyzed.length,
          6,
        )
      : null;

  const estimatedPotentialCost = round(
    anomalies.reduce((sum, day) => sum + (day.metrics?.estimatedAdditionalCost ?? 0), 0),
    2,
  );

  const thresholdPercent = options.thresholdPercent ?? DEFAULT_THRESHOLD_PERCENT;
  const currency = options.currency ?? DEFAULT_CURRENCY;

  return {
    from: sorted.length > 0 ? sorted[0].date : null,
    to: sorted.length > 0 ? sorted[sorted.length - 1].date : null,
    days,
    anomalies,
    insufficient,
    summary: {
      dayCount: sorted.length,
      analyzableDayCount: analyzed.length,
      totalElectricityKwh,
      totalProductionUnits,
      averageIntensity,
      anomalyCount: anomalies.length,
      estimatedPotentialCost,
      currency,
      thresholdPercent,
      methodVersion: METHOD_VERSION,
      simulated: sorted.some((day) => day.sourceType === "SIMULATED"),
    },
  };
}

/** Convenience wrapper used by the anomaly queue. */
export function findAnomalyCandidates(
  records: DailyOperationalRecord[],
  options: AnalyzeOptions = {},
): DayAnalysis[] {
  return analyzePeriod(records, options).anomalies;
}

import { DEFAULT_THRESHOLD_PERCENT } from "../analysis/constants";
import type { Severity } from "../analysis/anomaly-detection";
import { analyzePeriod, type AnalyzeOptions, type DayAnalysis } from "../analysis/metrics";
import { listDailyRecords } from "./operational-data-service";

export interface AnomalyCandidateDto {
  date: string;
  severity: Severity;
  deviationPercent: number;
  actualIntensity: number;
  baselineIntensity: number;
  thresholdPercent: number;
  productionUnits: number;
  electricityKwh: number;
  expectedKwh: number | null;
  potentialExcessKwh: number | null;
  estimatedAdditionalCost: number | null;
  currency: string;
  baselineFrom: string;
  baselineTo: string;
  baselineSampleSize: number;
  /** Plain-language evidence line, always shown next to the number. */
  evidenceSummary: string;
}

export interface TrendPointDto {
  date: string;
  electricityKwh: number | null;
  productionUnits: number | null;
  intensity: number | null;
  isAnomaly: boolean;
}

export interface DashboardSummaryDto {
  from: string | null;
  to: string | null;
  dayCount: number;
  analyzableDayCount: number;
  insufficientDayCount: number;
  totalElectricityKwh: number;
  totalProductionUnits: number;
  averageIntensity: number | null;
  anomalyCount: number;
  estimatedPotentialCost: number;
  currency: string;
  thresholdPercent: number;
  methodVersion: string;
  simulated: boolean;
  trend: TrendPointDto[];
  anomalies: AnomalyCandidateDto[];
}

export function toAnomalyCandidate(day: DayAnalysis): AnomalyCandidateDto | null {
  if (day.status !== "OK" || !day.metrics) return null;
  const metrics = day.metrics;

  return {
    date: day.date,
    severity: metrics.severity,
    deviationPercent: metrics.deviationPercent,
    actualIntensity: metrics.actualIntensity,
    baselineIntensity: metrics.baselineIntensity,
    thresholdPercent: metrics.thresholdPercent,
    productionUnits: day.record.productionUnits ?? 0,
    electricityKwh: day.record.electricityKwh ?? 0,
    expectedKwh: metrics.expectedKwh,
    potentialExcessKwh: metrics.potentialExcessKwh,
    estimatedAdditionalCost: metrics.estimatedAdditionalCost,
    currency: metrics.currency,
    baselineFrom: metrics.baselineFrom,
    baselineTo: metrics.baselineTo,
    baselineSampleSize: metrics.baselineSampleSize,
    evidenceSummary:
      `Actual ${metrics.actualIntensity.toFixed(3)} vs baseline ${metrics.baselineIntensity.toFixed(3)} kWh/unit ` +
      `(${metrics.deviationPercent.toFixed(1)}% above, threshold ${metrics.thresholdPercent}%), ` +
      `baseline window ${metrics.baselineFrom}..${metrics.baselineTo} (${metrics.baselineSampleSize} days).`,
  };
}

export interface SummaryQuery {
  companyId: string;
  from?: string;
  to?: string;
  thresholdPercent?: number;
}

export async function getDashboardSummary(query: SummaryQuery): Promise<DashboardSummaryDto> {
  // Baselines need the days before the requested window, so the full series is
  // loaded and the window is applied to the returned analysis only.
  const records = await listDailyRecords(query.companyId);

  const options: AnalyzeOptions = { thresholdPercent: query.thresholdPercent };
  const analysis = analyzePeriod(records, options);

  const inWindow = (date: string): boolean =>
    (!query.from || date >= query.from) && (!query.to || date <= query.to);

  const anomalies = analysis.anomalies
    .filter((day) => inWindow(day.date))
    .map(toAnomalyCandidate)
    .filter((candidate): candidate is AnomalyCandidateDto => candidate !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const daysInWindow = analysis.days.filter((day) => inWindow(day.date));
  const insufficientInWindow = daysInWindow.filter((day) => day.status === "INSUFFICIENT_DATA");
  const analyzedInWindow = daysInWindow.filter((day) => day.status === "OK" && day.metrics);

  const totalElectricityKwh = round3(
    daysInWindow.reduce((sum, day) => sum + (day.record.electricityKwh ?? 0), 0),
  );
  const totalProductionUnits = daysInWindow.reduce(
    (sum, day) => sum + (day.record.productionUnits ?? 0),
    0,
  );
  const averageIntensity =
    analyzedInWindow.length > 0
      ? round6(
          analyzedInWindow.reduce((sum, day) => sum + (day.metrics?.actualIntensity ?? 0), 0) /
            analyzedInWindow.length,
        )
      : null;

  const estimatedPotentialCost = round2(
    anomalies.reduce((sum, candidate) => sum + (candidate.estimatedAdditionalCost ?? 0), 0),
  );

  const trend: TrendPointDto[] = daysInWindow.map((day) => ({
    date: day.date,
    electricityKwh: day.record.electricityKwh,
    productionUnits: day.record.productionUnits,
    intensity: day.metrics?.actualIntensity ?? null,
    isAnomaly: day.metrics?.isAnomaly === true,
  }));

  const first = daysInWindow[0]?.date ?? null;
  const last = daysInWindow[daysInWindow.length - 1]?.date ?? null;

  return {
    from: first,
    to: last,
    dayCount: daysInWindow.length,
    analyzableDayCount: analyzedInWindow.length,
    insufficientDayCount: insufficientInWindow.length,
    totalElectricityKwh,
    totalProductionUnits,
    averageIntensity,
    anomalyCount: anomalies.length,
    estimatedPotentialCost,
    currency: analysis.summary.currency,
    thresholdPercent: query.thresholdPercent ?? DEFAULT_THRESHOLD_PERCENT,
    methodVersion: analysis.summary.methodVersion,
    simulated: analysis.summary.simulated,
    trend,
    anomalies,
  };
}

export async function getAnomalyCandidates(query: SummaryQuery): Promise<AnomalyCandidateDto[]> {
  const summary = await getDashboardSummary(query);
  return summary.anomalies;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

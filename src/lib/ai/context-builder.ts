import { METHOD_VERSION } from "../analysis/constants";
import type { DayMetrics, DailyOperationalRecord } from "../analysis/metrics";
import {
  formatCurrency,
  formatDateLabel,
  formatDecimal,
  formatKwh,
  formatNumber,
  formatPercent,
  formatSignedPercent,
} from "../format";
import type { WeatherContext } from "../weather/provider";
import type { EvidenceItem, InvestigationContext } from "./types";

/** Stable evidence identifiers so the model can cite them and the UI can map back. */
export const EVIDENCE = {
  actualIntensity: "E1",
  baselineIntensity: "E2",
  deviation: "E3",
  productionUnits: "E4",
  electricityKwh: "E5",
  expectedKwh: "E6",
  potentialExcessKwh: "E7",
  tariff: "E8",
  estimatedCost: "E9",
  operatingHours: "E10",
  weather: "E11",
  baselineWindow: "E12",
  dataSource: "E13",
} as const;

/** Inputs that would be required to confirm a cause but are not available. */
const KNOWN_MISSING_INPUTS = [
  "Machine-level run hours",
  "Cooling / HVAC submetering and runtime",
  "Shift schedule and overtime records",
  "Maintenance log for the comparison week",
  "Independent power quality or meter calibration record",
];

const BASELINE_LIMITATIONS = [
  "Energy intensity uses total electricity against total production. It does not separate cooling, compressed air or process loads.",
  "The baseline is this company's own trailing average, not an industry benchmark.",
  "The anomaly threshold is a transparent prototype heuristic.",
  "Weather correlation is not evidence of causation.",
  "No verified saving can be claimed without a before/after measurement.",
];

export interface BuildContextInput {
  company: { id: string; name: string; location: string | null };
  targetDate: string;
  record: DailyOperationalRecord;
  metrics: DayMetrics;
  weather: WeatherContext;
}

export function buildInvestigationContext(input: BuildContextInput): InvestigationContext {
  const { company, targetDate, record, metrics, weather } = input;

  const sourceLabel: "SIMULATED DATA" | "MEASURED DATA" =
    record.sourceType === "SIMULATED" ? "SIMULATED DATA" : "MEASURED DATA";

  const daySource = `DailyOperationalData ${targetDate} (${sourceLabel}${
    record.sourceName ? `, source: ${record.sourceName}` : ""
  })`;

  const evidence: EvidenceItem[] = [
    {
      id: EVIDENCE.actualIntensity,
      label: "Actual energy intensity",
      value: `${formatDecimal(metrics.actualIntensity, 6)} kWh/unit`,
      source: daySource,
    },
    {
      id: EVIDENCE.baselineIntensity,
      label: "Baseline energy intensity",
      value: `${formatDecimal(metrics.baselineIntensity, 6)} kWh/unit`,
      source: `Baseline window ${metrics.baselineFrom}..${metrics.baselineTo}, ${metrics.baselineSampleSize} days`,
    },
    {
      id: EVIDENCE.deviation,
      label: "Deviation above baseline",
      value: formatSignedPercent(metrics.deviationPercent, 2),
      source: `Method ${METHOD_VERSION} / threshold ${formatPercent(metrics.thresholdPercent)}`,
    },
    {
      id: EVIDENCE.productionUnits,
      label: "Production",
      value: formatNumber(record.productionUnits ?? 0),
      source: daySource,
    },
    {
      id: EVIDENCE.electricityKwh,
      label: "Electricity consumed",
      value: formatKwh(record.electricityKwh ?? 0, 3),
      source: daySource,
    },
    {
      id: EVIDENCE.expectedKwh,
      label: "Expected electricity at baseline rate",
      value: formatKwh(metrics.expectedKwh ?? 0, 3),
      source: "production x baseline intensity",
    },
    {
      id: EVIDENCE.potentialExcessKwh,
      label: "Potential excess electricity",
      value: formatKwh(metrics.potentialExcessKwh ?? 0, 3),
      source: "max(0, actual - expected)",
    },
    {
      id: EVIDENCE.tariff,
      label: "Electricity tariff",
      value: `${formatNumber(metrics.tariffPerKwh ?? 0, 2)} ${metrics.currency}/kWh`,
      source: daySource,
    },
    {
      id: EVIDENCE.estimatedCost,
      label: "Estimated potential additional cost",
      value: `${formatCurrency(metrics.estimatedAdditionalCost ?? 0, metrics.currency)} ${metrics.currency}`,
      source: "potential excess kWh x tariff",
    },
    {
      id: EVIDENCE.operatingHours,
      label: "Operating hours",
      value: record.operatingHours === null ? "not recorded" : formatNumber(record.operatingHours, 2),
      source: daySource,
    },
    {
      id: EVIDENCE.weather,
      label: "Weather context",
      value: describeWeather(weather),
      source:
        weather.status === "UNAVAILABLE"
          ? "no reading available"
          : `${weather.provider} (${weather.status})`,
    },
    {
      id: EVIDENCE.baselineWindow,
      label: "Baseline comparison window",
      value: `${metrics.baselineFrom}..${metrics.baselineTo} (${metrics.baselineSampleSize} days)`,
      source: "trailing window excluding the tested day",
    },
    {
      id: EVIDENCE.dataSource,
      label: "Data source",
      value: sourceLabel,
      source: record.sourceName ?? "unknown source",
    },
  ];

  const missingInputs = [...KNOWN_MISSING_INPUTS];
  if (weather.status === "UNAVAILABLE") {
    missingInputs.push("Weather context for this date");
  }
  if (record.operatingHours === null) {
    missingInputs.push("Operating hours for this day");
  }

  return {
    company,
    targetDate,
    facts: {
      productionUnits: record.productionUnits ?? 0,
      electricityKwh: record.electricityKwh ?? 0,
      operatingHours: record.operatingHours,
      actualIntensity: metrics.actualIntensity,
      baselineIntensity: metrics.baselineIntensity,
      deviationPercent: metrics.deviationPercent,
      severity: metrics.severity,
      thresholdPercent: metrics.thresholdPercent,
      methodVersion: METHOD_VERSION,
      expectedKwh: metrics.expectedKwh ?? 0,
      potentialExcessKwh: metrics.potentialExcessKwh ?? 0,
      estimatedAdditionalCost: metrics.estimatedAdditionalCost ?? 0,
      tariffPerKwh: metrics.tariffPerKwh ?? 0,
      currency: metrics.currency,
      baselineWindow: {
        from: metrics.baselineFrom,
        to: metrics.baselineTo,
        sampleSize: metrics.baselineSampleSize,
      },
    },
    weather,
    evidence,
    dataSource: {
      sourceType: record.sourceType ?? "UNKNOWN",
      sourceName: record.sourceName,
      label: sourceLabel,
    },
    missingInputs,
    serverLimitations: BASELINE_LIMITATIONS,
    allowedEvidenceIds: evidence.map((item) => item.id),
  };
}

export function describeWeather(weather: WeatherContext): string {
  if (weather.status === "UNAVAILABLE") {
    return `Unavailable (${weather.note ?? "no reason given"})`;
  }
  const parts = [
    weather.condition ?? "unknown condition",
    weather.temperatureC === null ? "temperature not recorded" : `${formatNumber(weather.temperatureC, 1)}°C`,
    weather.humidityPercent === null
      ? "humidity not recorded"
      : `${formatNumber(weather.humidityPercent, 0)}% humidity`,
  ];
  return `${parts.join(", ")} — ${weather.status} via ${weather.provider}`;
}

/** Human-readable headline used in the UI and in the prompt. */
export function describeHeadline(context: InvestigationContext): string {
  const { facts, targetDate, company } = context;
  return (
    `On ${formatDateLabel(targetDate)}, ${company.name} used ${formatSignedPercent(
      facts.deviationPercent,
      1,
    )} more electricity per unit than its ${facts.baselineWindow.from}..${facts.baselineWindow.to} baseline ` +
    `(${formatDecimal(facts.actualIntensity, 3)} vs ${formatDecimal(facts.baselineIntensity, 3)} kWh/unit).`
  );
}

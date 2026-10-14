import {
  formatCurrency,
  formatDateLabel,
  formatDecimal,
  formatKwh,
  formatNumber,
  formatPercent,
  formatSignedPercent,
} from "../format";
import { EVIDENCE } from "./context-builder";
import type { InvestigationContext, InvestigationModelClient, InvestigationModelOutput } from "./types";

export const MOCK_MODEL_NAME = "mock-gemini-v1";

/**
 * Deterministic, offline investigation provider.
 *
 * It composes its answer strictly from the supplied context, so it never
 * invents a value. It is always labelled as a simulation in the UI and is never
 * called live AI.
 */
export class MockInvestigationClient implements InvestigationModelClient {
  readonly provider = "mock" as const;
  readonly isLive = false;
  readonly modelName = MOCK_MODEL_NAME;

  async investigate(context: InvestigationContext): Promise<InvestigationModelOutput> {
    return buildMockOutput(context);
  }
}

export function buildMockOutput(context: InvestigationContext): InvestigationModelOutput {
  const { facts, targetDate, company, weather, dataSource } = context;

  const actual = formatDecimal(facts.actualIntensity, 3);
  const baseline = formatDecimal(facts.baselineIntensity, 3);
  const deviation = formatSignedPercent(facts.deviationPercent, 1);
  const production = formatNumber(facts.productionUnits);
  const electricity = formatKwh(facts.electricityKwh, 1);
  const expected = formatKwh(facts.expectedKwh, 1);
  const excess = formatKwh(facts.potentialExcessKwh, 1);
  const tariff = `${formatNumber(facts.tariffPerKwh, 2)} ${facts.currency}/kWh`;
  // formatCurrency already includes the currency ("Rp…" for IDR), so the code
  // is not appended a second time.
  const cost = formatCurrency(facts.estimatedAdditionalCost, facts.currency);
  const window = `${facts.baselineWindow.from} to ${facts.baselineWindow.to}`;

  const weatherStatement =
    weather.status === "UNAVAILABLE"
      ? `Weather context for ${targetDate} was unavailable, so a weather-related load change could not be assessed.`
      : `Weather context was ${weather.condition ?? "unknown"} at ${
          weather.temperatureC === null ? "an unknown temperature" : `${formatNumber(weather.temperatureC, 1)}°C`
        } and ${
          weather.humidityPercent === null ? "unknown humidity" : `${formatNumber(weather.humidityPercent, 0)}% humidity`
        } (${weather.status} via ${weather.provider}).`;

  const observations = [
    {
      statement: `Energy intensity was ${actual} kWh/unit against a baseline of ${baseline} kWh/unit, ${deviation} above it.`,
      evidenceIds: [EVIDENCE.actualIntensity, EVIDENCE.baselineIntensity, EVIDENCE.deviation],
    },
    {
      statement: `Production was ${production} units while electricity consumption was ${electricity}.`,
      evidenceIds: [EVIDENCE.productionUnits, EVIDENCE.electricityKwh],
    },
    {
      statement: `At the baseline rate, ${production} units would have used about ${expected}; the difference is about ${excess}.`,
      evidenceIds: [EVIDENCE.expectedKwh, EVIDENCE.potentialExcessKwh],
    },
    {
      statement: `The recorded tariff is ${tariff}, which gives a potential additional cost estimate of ${cost}. This assumes the excess electricity was actually consumed at that tariff.`,
      evidenceIds: [EVIDENCE.tariff, EVIDENCE.estimatedCost],
    },
    {
      statement: weatherStatement,
      evidenceIds: [EVIDENCE.weather],
    },
    {
      statement: `Data used for this day is labelled ${dataSource.label} (source type ${dataSource.sourceType}${
        dataSource.sourceName ? `, ${dataSource.sourceName}` : ""
      }).`,
      evidenceIds: [EVIDENCE.dataSource],
    },
    {
      statement: `The baseline is the trailing average of ${facts.baselineWindow.sampleSize} days (${window}), and the tested day is excluded from it.`,
      evidenceIds: [EVIDENCE.baselineWindow],
    },
  ];

  const coolingHypothesis =
    weather.status === "UNAVAILABLE"
      ? {
          statement:
            "A weather-related load change cannot be assessed because no weather reading was available for this day.",
          supportingEvidenceIds: [EVIDENCE.weather],
          missingEvidence: ["Weather reading for this date", "Cooling-system runtime"],
          confidence: "LOW" as const,
        }
      : {
          statement:
            "Higher ambient temperature on this day may have increased cooling demand, which would raise electricity use without changing production.",
          supportingEvidenceIds: [EVIDENCE.weather, EVIDENCE.deviation],
          missingEvidence: ["Cooling / HVAC submetering", "Cooling-system runtime and setpoints"],
          confidence: "LOW" as const,
        };

  const hypotheses = [
    coolingHypothesis,
    {
      statement:
        "One or more loads may have run longer or less efficiently than in the comparison window, for example an idle motor, short-cycling compressor, or a degraded component.",
      supportingEvidenceIds: [EVIDENCE.actualIntensity, EVIDENCE.electricityKwh, EVIDENCE.potentialExcessKwh],
      missingEvidence: ["Machine-level run hours", "Maintenance log"],
      confidence: "LOW" as const,
    },
    {
      statement:
        "A shift or schedule change could have extended operating time beyond the comparison window.",
      supportingEvidenceIds: [EVIDENCE.operatingHours, EVIDENCE.baselineWindow],
      missingEvidence: ["Shift schedule and overtime records"],
      confidence: "LOW" as const,
    },
    {
      statement:
        "A metering or recording error on this day cannot be ruled out, especially if no physical explanation is found.",
      supportingEvidenceIds: [EVIDENCE.dataSource],
      missingEvidence: ["Meter calibration record", "Independent power quality measurement"],
      confidence: "LOW" as const,
    },
  ];

  const recommendedChecks = [
    {
      title: `Compare machine-level run hours for ${formatDateLabel(targetDate)} against ${window}`,
      reason: "Separates extra runtime from reduced efficiency.",
      priority: "MEDIUM" as const,
    },
    {
      title: "Review cooling / HVAC runtime, setpoints and filter condition around this date",
      reason: "Cooling load is the most plausible non-production driver when production is flat.",
      priority: "MEDIUM" as const,
    },
    {
      title: "Verify the electricity meter reading and check for maintenance or configuration changes",
      reason: "Rules out a recording or setup error before acting on the number.",
      priority: "LOW" as const,
    },
    {
      title: "Confirm production was normal that day (no rework, ramp-up or idle running)",
      reason: "Ensures the intensity change is not a production artefact.",
      priority: "LOW" as const,
    },
  ];

  const limitations = [
    ...context.serverLimitations,
    "No cause is confirmed by the available data.",
    `This investigation covers a single day (${targetDate}) at ${company.name}.`,
    `Threshold used to flag the day: ${formatPercent(facts.thresholdPercent)} (method ${facts.methodVersion}).`,
  ];

  return {
    userSummary:
      `On ${formatDateLabel(targetDate)}, ${company.name} used ${deviation} more electricity per unit than its ` +
      `${window} baseline (${actual} vs ${baseline} kWh/unit) while production stayed at ${production} units. ` +
      `At the baseline rate the same output would have used about ${expected}, leaving a potential excess of ${excess}. ` +
      `At ${tariff} that is a potential additional cost of ${cost}, not a confirmed charge and not verified savings.`,
    observations,
    hypotheses,
    recommendedChecks,
    limitations,
  };
}

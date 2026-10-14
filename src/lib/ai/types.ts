import type { Severity } from "../analysis/anomaly-detection";
import type { WeatherContext } from "../weather/provider";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

/** A single traceable fact handed to the model. */
export interface EvidenceItem {
  id: string;
  label: string;
  value: string;
  source: string;
}

export interface InvestigationFacts {
  productionUnits: number;
  electricityKwh: number;
  operatingHours: number | null;
  actualIntensity: number;
  baselineIntensity: number;
  deviationPercent: number;
  severity: Severity;
  thresholdPercent: number;
  methodVersion: string;
  expectedKwh: number;
  potentialExcessKwh: number;
  estimatedAdditionalCost: number;
  tariffPerKwh: number;
  currency: string;
  baselineWindow: { from: string; to: string; sampleSize: number };
}

/**
 * The minimum structured context sent to the model. It contains only computed
 * facts, the evidence list and explicit limitations — never raw SQL, secrets or
 * unrelated company data.
 */
export interface InvestigationContext {
  company: { id: string; name: string; location: string | null };
  targetDate: string;
  facts: InvestigationFacts;
  weather: WeatherContext;
  evidence: EvidenceItem[];
  dataSource: {
    sourceType: string;
    sourceName: string | null;
    label: "SIMULATED DATA" | "MEASURED DATA";
  };
  missingInputs: string[];
  serverLimitations: string[];
  allowedEvidenceIds: string[];
}

/** Shape the model must return. Validated server-side before it is stored. */
export interface InvestigationModelOutput {
  userSummary: string;
  observations: { statement: string; evidenceIds: string[] }[];
  hypotheses: {
    statement: string;
    supportingEvidenceIds: string[];
    missingEvidence: string[];
    confidence: Confidence;
  }[];
  recommendedChecks: { title: string; reason: string; priority: Confidence }[];
  limitations: string[];
}

export interface ModelInvestigationResult {
  provider: "gemini" | "mock";
  /** False for the deterministic mock, which is never described as live AI. */
  isLive: boolean;
  modelName: string;
  promptVersion: string;
  output: InvestigationModelOutput;
  /** Evidence IDs the model cited that do not exist in the supplied context. */
  discardedEvidenceIds: string[];
}

export type InvestigationFailureCode =
  | "MODEL_TIMEOUT"
  | "MODEL_QUOTA"
  | "MODEL_INVALID_OUTPUT"
  | "MODEL_ERROR";

export class InvestigationModelError extends Error {
  readonly code: InvestigationFailureCode;

  constructor(code: InvestigationFailureCode, message: string) {
    super(message);
    this.name = "InvestigationModelError";
    this.code = code;
  }
}

export interface InvestigationModelClient {
  readonly provider: "gemini" | "mock";
  readonly isLive: boolean;
  readonly modelName: string;
  investigate(context: InvestigationContext): Promise<InvestigationModelOutput>;
}

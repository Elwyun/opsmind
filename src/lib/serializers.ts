import type { DailyOperationalRecord } from "./analysis/metrics";
import type { Severity } from "./analysis/anomaly-detection";
import { investigationOutputSchema } from "./ai/investigation-schema";
import type { EvidenceItem, InvestigationModelOutput } from "./ai/types";
import { toDateKey } from "./date";

/**
 * Shown wherever a before/after comparison is displayed. The app never claims
 * that an action caused an observed change.
 */
export const VERIFICATION_CAVEAT =
  "Observed change only. Other factors are not controlled, so this does not prove the action caused the change.";

/**
 * Prisma returns `Decimal` objects for money and measurement columns. These
 * helpers convert them to plain numbers or strings at the boundary so the rest
 * of the app never has to think about decimal.js.
 */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const candidate = value as { toNumber?: () => number };
  if (typeof candidate.toNumber === "function") {
    const parsed = candidate.toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Serialised exactly as stored: a string, so precision is not re-rounded. */
export function decimalToString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  const candidate = value as { toString?: () => string };
  if (typeof candidate.toString === "function") return candidate.toString();
  return null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

// --- DTOs -----------------------------------------------------------------

export interface CompanyDto {
  id: string;
  name: string;
  location: string | null;
}

export interface OperationalDataDto {
  id: string;
  companyId: string;
  date: string;
  productionUnits: number;
  electricityKwh: number;
  operatingHours: number;
  temperatureC: number | null;
  humidityPercent: number | null;
  weather: string | null;
  electricityPrice: number;
  sourceType: string;
  sourceName: string | null;
}

export interface InvestigationResultDto {
  provider: "gemini" | "mock";
  isLive: boolean;
  modelName: string;
  promptVersion: string;
  output: InvestigationModelOutput;
  /** Evidence list returned to the model, so every citation stays traceable. */
  evidence: EvidenceItem[];
  discardedEvidenceIds: string[];
  /** Whether the underlying data is simulated or measured. */
  dataLabel: "SIMULATED DATA" | "MEASURED DATA" | null;
}

export interface InvestigationDto {
  id: string;
  companyId: string;
  targetDate: string;
  status: string;
  severity: Severity | null;
  actualIntensity: number | null;
  baselineIntensity: number | null;
  deviationPercent: number | null;
  potentialExcessKwh: number | null;
  estimatedCost: number | null;
  currency: string;
  methodVersion: string;
  modelName: string | null;
  promptVersion: string | null;
  result: InvestigationResultDto | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionDto {
  id: string;
  investigationId: string;
  title: string;
  description: string | null;
  status: string;
  ownerName: string | null;
  completionNote: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationDto {
  id: string;
  actionItemId: string;
  beforeFrom: string;
  beforeTo: string;
  afterFrom: string;
  afterTo: string;
  beforeIntensity: number | null;
  afterIntensity: number | null;
  changePercent: number | null;
  notes: string | null;
  createdAt: string;
  /** Always travels with the numbers so causation is never implied. */
  caveat: string;
}

// --- Row mappers ----------------------------------------------------------

/** Loose row shapes: acceptable for the mapper, decoupled from Prisma types. */
interface CompanyRow {
  id: string;
  name: string;
  location: string | null;
}

interface OperationalDataRow {
  id: string;
  companyId: string;
  date: Date;
  productionUnits: number;
  electricityKwh: unknown;
  operatingHours: unknown;
  temperatureC: unknown;
  humidityPercent: unknown;
  weather: string | null;
  electricityPrice: unknown;
  sourceType: string;
  sourceName: string | null;
}

interface InvestigationRow {
  id: string;
  companyId: string;
  targetDate: Date;
  status: string;
  severity: string | null;
  actualIntensity: unknown;
  baselineIntensity: unknown;
  deviationPercent: unknown;
  potentialExcessKwh: unknown;
  estimatedCost: unknown;
  currency: string;
  methodVersion: string;
  modelName: string | null;
  promptVersion: string | null;
  resultJson: unknown;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ActionRow {
  id: string;
  investigationId: string;
  title: string;
  description: string | null;
  status: string;
  ownerName: string | null;
  completionNote: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VerificationRow {
  id: string;
  actionItemId: string;
  beforeFrom: Date;
  beforeTo: Date;
  afterFrom: Date;
  afterTo: Date;
  beforeIntensity: unknown;
  afterIntensity: unknown;
  changePercent: unknown;
  notes: string | null;
  createdAt: Date;
}

export function serializeCompany(row: CompanyRow): CompanyDto {
  return { id: row.id, name: row.name, location: row.location };
}

export function serializeOperationalData(row: OperationalDataRow): OperationalDataDto {
  return {
    id: row.id,
    companyId: row.companyId,
    date: toDateKey(row.date),
    productionUnits: row.productionUnits,
    electricityKwh: toNumber(row.electricityKwh) ?? 0,
    operatingHours: toNumber(row.operatingHours) ?? 0,
    temperatureC: toNumber(row.temperatureC),
    humidityPercent: toNumber(row.humidityPercent),
    weather: row.weather,
    electricityPrice: toNumber(row.electricityPrice) ?? 0,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
  };
}

/** Reduces a stored row to the shape the deterministic engine consumes. */
export function toDailyRecord(row: OperationalDataRow): DailyOperationalRecord {
  return {
    date: toDateKey(row.date),
    productionUnits: row.productionUnits,
    electricityKwh: toNumber(row.electricityKwh),
    operatingHours: toNumber(row.operatingHours),
    electricityPrice: toNumber(row.electricityPrice),
    temperatureC: toNumber(row.temperatureC),
    humidityPercent: toNumber(row.humidityPercent),
    weather: row.weather,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
  };
}

function parseEvidence(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value)) return [];
  const items: EvidenceItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    if (
      typeof item.id === "string" &&
      typeof item.label === "string" &&
      typeof item.value === "string" &&
      typeof item.source === "string"
    ) {
      items.push({ id: item.id, label: item.label, value: item.value, source: item.source });
    }
  }
  return items;
}

/** Re-validates stored model output; a corrupted blob is treated as missing. */
export function parseStoredResult(value: unknown): InvestigationResultDto | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const parsed = investigationOutputSchema.safeParse(candidate.output);
  if (!parsed.success) return null;

  return {
    provider: candidate.provider === "gemini" ? "gemini" : "mock",
    isLive: candidate.isLive === true,
    modelName: typeof candidate.modelName === "string" ? candidate.modelName : "unknown",
    promptVersion: typeof candidate.promptVersion === "string" ? candidate.promptVersion : "unknown",
    output: parsed.data,
    evidence: parseEvidence(candidate.evidence),
    discardedEvidenceIds: Array.isArray(candidate.discardedEvidenceIds)
      ? candidate.discardedEvidenceIds.filter((id): id is string => typeof id === "string")
      : [],
    dataLabel:
      candidate.dataLabel === "SIMULATED DATA" || candidate.dataLabel === "MEASURED DATA"
        ? candidate.dataLabel
        : null,
  };
}

function toSeverity(value: string | null): Severity | null {
  if (value === "INFO" || value === "LOW" || value === "MEDIUM" || value === "HIGH") return value;
  return null;
}

export function serializeInvestigation(row: InvestigationRow): InvestigationDto {
  return {
    id: row.id,
    companyId: row.companyId,
    targetDate: toDateKey(row.targetDate),
    status: row.status,
    severity: toSeverity(row.severity),
    actualIntensity: toNumber(row.actualIntensity),
    baselineIntensity: toNumber(row.baselineIntensity),
    deviationPercent: toNumber(row.deviationPercent),
    potentialExcessKwh: toNumber(row.potentialExcessKwh),
    estimatedCost: toNumber(row.estimatedCost),
    currency: row.currency,
    methodVersion: row.methodVersion,
    modelName: row.modelName,
    promptVersion: row.promptVersion,
    result: parseStoredResult(row.resultJson),
    errorCode: row.errorCode,
    createdAt: toIso(row.createdAt) ?? "",
    updatedAt: toIso(row.updatedAt) ?? "",
  };
}

export function serializeAction(row: ActionRow): ActionDto {
  return {
    id: row.id,
    investigationId: row.investigationId,
    title: row.title,
    description: row.description,
    status: row.status,
    ownerName: row.ownerName,
    completionNote: row.completionNote,
    startedAt: toIso(row.startedAt),
    completedAt: toIso(row.completedAt),
    createdAt: toIso(row.createdAt) ?? "",
    updatedAt: toIso(row.updatedAt) ?? "",
  };
}

export function serializeVerification(row: VerificationRow): VerificationDto {
  return {
    id: row.id,
    actionItemId: row.actionItemId,
    beforeFrom: toDateKey(row.beforeFrom),
    beforeTo: toDateKey(row.beforeTo),
    afterFrom: toDateKey(row.afterFrom),
    afterTo: toDateKey(row.afterTo),
    beforeIntensity: toNumber(row.beforeIntensity),
    afterIntensity: toNumber(row.afterIntensity),
    changePercent: toNumber(row.changePercent),
    notes: row.notes,
    createdAt: toIso(row.createdAt) ?? "",
    caveat: VERIFICATION_CAVEAT,
  };
}

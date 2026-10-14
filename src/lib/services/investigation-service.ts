import { METHOD_VERSION } from "../analysis/constants";
import { analyzeDay, type AnalyzeOptions, type DayMetrics } from "../analysis/metrics";
import { PROMPT_VERSION, buildInvestigationContext, getInvestigationModelClient } from "../ai";
import { sanitizeAndValidateOutput } from "../ai/investigation-schema";
import { InvestigationModelError, type EvidenceItem, type InvestigationModelOutput } from "../ai/types";
import { NotFoundError } from "../api/http-error";
import { prisma } from "../db";
import { parseDateKey } from "../date";
import { Prisma } from "../../generated/prisma/client";
import { InvestigationStatus } from "../../generated/prisma/enums";
import {
  serializeAction,
  serializeInvestigation,
  type ActionDto,
  type InvestigationDto,
} from "../serializers";
import { getWeatherProvider, safeGetDailyWeather } from "../weather";
import { getCompanyById } from "./company-service";
import { listDailyRecords } from "./operational-data-service";

export interface InvestigationDetailDto extends InvestigationDto {
  actions: ActionDto[];
}

interface StoredResult {
  provider: "gemini" | "mock";
  isLive: boolean;
  modelName: string;
  promptVersion: string;
  output: InvestigationModelOutput;
  /** Kept with the result so each citation can be traced back to its source. */
  evidence: EvidenceItem[];
  discardedEvidenceIds: string[];
  dataLabel: "SIMULATED DATA" | "MEASURED DATA";
}

export interface InvestigateInput {
  companyId: string;
  date: string;
  thresholdPercent?: number;
}

/**
 * Runs a full investigation for one day.
 *
 * Order matters: the engine computes every number first, the weather adapter
 * adds optional context, and only then is the model called. If the model fails
 * the investigation is stored as FAILED with an error code — no substitute
 * answer is invented.
 */
export async function investigateDay(input: InvestigateInput): Promise<InvestigationDetailDto> {
  const company = await getCompanyById(input.companyId);
  const records = await listDailyRecords(input.companyId);
  const target = records.find((record) => record.date === input.date);

  if (!target) {
    throw new NotFoundError("Operational data for date", input.date);
  }

  const options: AnalyzeOptions = { thresholdPercent: input.thresholdPercent };
  const analysis = analyzeDay(target, records, options);

  if (analysis.status !== "OK" || !analysis.metrics) {
    const row = await upsertInvestigation({
      companyId: company.id,
      targetDate: input.date,
      status: InvestigationStatus.INSUFFICIENT_DATA,
      metrics: null,
      errorCode: "INSUFFICIENT_DATA",
      result: null,
    });
    return toDetail(row);
  }

  const metrics = analysis.metrics;
  const weather = await safeGetDailyWeather(getWeatherProvider(), input.date, company.location);
  const context = buildInvestigationContext({
    company,
    targetDate: input.date,
    record: target,
    metrics,
    weather,
  });

  const client = getInvestigationModelClient();

  let output: InvestigationModelOutput | null = null;
  let discardedEvidenceIds: string[] = [];
  let status: InvestigationStatus = InvestigationStatus.COMPLETED;
  let errorCode: string | null = null;

  try {
    output = await client.investigate(context);
    discardedEvidenceIds = sanitizeAndValidateOutput(output, context.allowedEvidenceIds)
      .discardedEvidenceIds;
  } catch (error) {
    status = InvestigationStatus.FAILED;
    errorCode = error instanceof InvestigationModelError ? error.code : "MODEL_ERROR";
    output = null;
  }

  const result: StoredResult | null = output
    ? {
        provider: client.provider,
        isLive: client.isLive,
        modelName: client.modelName,
        promptVersion: PROMPT_VERSION,
        output,
        evidence: context.evidence,
        discardedEvidenceIds,
        dataLabel: context.dataSource.label,
      }
    : null;

  const row = await upsertInvestigation({
    companyId: company.id,
    targetDate: input.date,
    status,
    metrics,
    errorCode,
    result,
  });

  return toDetail(row);
}

interface UpsertInput {
  companyId: string;
  targetDate: string;
  status: InvestigationStatus;
  metrics: DayMetrics | null;
  errorCode: string | null;
  result: StoredResult | null;
}

async function upsertInvestigation(input: UpsertInput) {
  const targetDate = parseDateKey(input.targetDate);

  const data = {
    status: input.status,
    severity: input.metrics?.severity ?? null,
    actualIntensity: input.metrics?.actualIntensity ?? null,
    baselineIntensity: input.metrics?.baselineIntensity ?? null,
    deviationPercent: input.metrics?.deviationPercent ?? null,
    potentialExcessKwh: input.metrics?.potentialExcessKwh ?? null,
    estimatedCost: input.metrics?.estimatedAdditionalCost ?? null,
    currency: input.metrics?.currency ?? "IDR",
    methodVersion: METHOD_VERSION,
    modelName: input.result?.modelName ?? null,
    promptVersion: input.result?.promptVersion ?? null,
    // A failed re-run must clear any previously stored result rather than keep
    // a stale answer, so an absent result is written as an explicit DB null.
    resultJson: input.result
      ? (input.result as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    errorCode: input.errorCode,
  };

  const existing = await prisma.investigation.findFirst({
    where: { companyId: input.companyId, targetDate },
  });

  if (existing) {
    return prisma.investigation.update({ where: { id: existing.id }, data });
  }

  return prisma.investigation.create({
    data: { companyId: input.companyId, targetDate, ...data },
  });
}

type InvestigationRow = Parameters<typeof serializeInvestigation>[0];

async function toDetail(row: InvestigationRow): Promise<InvestigationDetailDto> {
  const actions = await prisma.actionItem.findMany({
    where: { investigationId: row.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    ...serializeInvestigation(row),
    actions: actions.map(serializeAction),
  };
}

export interface ListInvestigationsQuery {
  companyId?: string;
  limit?: number;
}

export async function listInvestigations(
  query: ListInvestigationsQuery = {},
): Promise<InvestigationDto[]> {
  const rows = await prisma.investigation.findMany({
    where: query.companyId ? { companyId: query.companyId } : undefined,
    orderBy: [{ targetDate: "desc" }],
    take: query.limit ?? 50,
  });
  return rows.map(serializeInvestigation);
}

export async function getInvestigationById(id: string): Promise<InvestigationDetailDto> {
  const row = await prisma.investigation.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Investigation", id);
  return toDetail(row);
}

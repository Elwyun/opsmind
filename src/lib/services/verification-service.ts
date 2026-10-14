import { computeDeviationPercent } from "../analysis/anomaly-detection";
import { meanIntensityOverWindow } from "../analysis/window-intensity";
import { HttpError, NotFoundError } from "../api/http-error";
import { assertRangeOrder } from "../api/validation";
import { prisma } from "../db";
import { parseDateKey } from "../date";
import { ActionStatus } from "../../generated/prisma/enums";
import { serializeVerification, type VerificationDto } from "../serializers";
import { listDailyRecords } from "./operational-data-service";

export interface CreateVerificationInput {
  actionItemId: string;
  beforeFrom: string;
  beforeTo: string;
  afterFrom: string;
  afterTo: string;
  notes?: string;
}

/**
 * Records an observed before/after change in energy intensity.
 *
 * The result is a measurement of an observed change, never a claim that the
 * action caused it: other factors are not controlled. The caveat travels with
 * the data so the UI cannot drop it silently.
 */
export async function createVerification(
  input: CreateVerificationInput,
): Promise<VerificationDto> {
  assertRangeOrder(input.beforeFrom, input.beforeTo, "before window");
  assertRangeOrder(input.afterFrom, input.afterTo, "after window");
  if (input.beforeTo >= input.afterFrom) {
    throw new HttpError(
      400,
      "INVALID_RANGE",
      "The before window must end before the after window begins.",
      { beforeTo: input.beforeTo, afterFrom: input.afterFrom },
    );
  }

  const action = await prisma.actionItem.findUnique({
    where: { id: input.actionItemId },
    include: { investigation: true },
  });
  if (!action) throw new NotFoundError("Action item", input.actionItemId);

  if (action.status !== ActionStatus.COMPLETED) {
    throw new HttpError(
      400,
      "ACTION_NOT_COMPLETED",
      "Mark the action as completed before recording a before/after verification.",
    );
  }

  const records = await listDailyRecords(action.investigation.companyId);

  const before = meanIntensityOverWindow(records, input.beforeFrom, input.beforeTo, 1);
  const after = meanIntensityOverWindow(records, input.afterFrom, input.afterTo, 1);

  if (!before.ok || !after.ok || before.meanIntensity === null || after.meanIntensity === null) {
    throw new HttpError(
      400,
      "INSUFFICIENT_DATA",
      before.reason ?? after.reason ?? "Insufficient data for the selected windows.",
      {
        beforeSampleSize: before.sampleSize,
        afterSampleSize: after.sampleSize,
      },
    );
  }

  const changePercent = computeDeviationPercent(after.meanIntensity, before.meanIntensity);

  const row = await prisma.verification.create({
    data: {
      actionItemId: input.actionItemId,
      beforeFrom: parseDateKey(input.beforeFrom),
      beforeTo: parseDateKey(input.beforeTo),
      afterFrom: parseDateKey(input.afterFrom),
      afterTo: parseDateKey(input.afterTo),
      beforeIntensity: before.meanIntensity,
      afterIntensity: after.meanIntensity,
      changePercent,
      notes: input.notes ?? null,
    },
  });

  return serializeVerification(row);
}

export async function listVerificationsForAction(actionItemId: string): Promise<VerificationDto[]> {
  const rows = await prisma.verification.findMany({
    where: { actionItemId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeVerification);
}

/** All comparisons recorded against any action of one investigation. */
export async function listVerificationsForInvestigation(
  investigationId: string,
): Promise<VerificationDto[]> {
  const rows = await prisma.verification.findMany({
    where: { actionItem: { investigationId } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeVerification);
}

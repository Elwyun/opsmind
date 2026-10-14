import { z } from "zod";

import { isDateKey } from "../date";

/** `YYYY-MM-DD` calendar date. Validated as a real date, not just a pattern. */
export const dateKeySchema = z
  .string()
  .refine(isDateKey, { message: "Expected a calendar date in YYYY-MM-DD form." });

export const idSchema = z.string().min(1).max(64);

const thresholdSchema = z.coerce.number().min(0).max(500);

export const operationalDataQuerySchema = z.object({
  companyId: idSchema,
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
});

export const anomaliesQuerySchema = z.object({
  companyId: idSchema,
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
  thresholdPercent: thresholdSchema.optional(),
});

export const investigationsQuerySchema = z.object({
  companyId: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createInvestigationSchema = z.object({
  companyId: idSchema,
  date: dateKeySchema,
  thresholdPercent: thresholdSchema.optional(),
});

export const createActionSchema = z.object({
  investigationId: idSchema,
  title: z.string().min(3).max(160),
  description: z.string().max(2000).optional(),
  ownerName: z.string().max(120).optional(),
});

export const updateActionSchema = z.object({
  id: idSchema,
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  title: z.string().min(3).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  ownerName: z.string().max(120).nullable().optional(),
  completionNote: z.string().max(2000).nullable().optional(),
});

export const createVerificationSchema = z.object({
  actionItemId: idSchema,
  beforeFrom: dateKeySchema,
  beforeTo: dateKeySchema,
  afterFrom: dateKeySchema,
  afterTo: dateKeySchema,
  notes: z.string().max(2000).optional(),
});

export type OperationalDataQuery = z.output<typeof operationalDataQuerySchema>;
export type AnomaliesQuery = z.output<typeof anomaliesQuerySchema>;
export type CreateInvestigationInput = z.output<typeof createInvestigationSchema>;
export type CreateActionInput = z.output<typeof createActionSchema>;
export type UpdateActionInput = z.output<typeof updateActionSchema>;
export type CreateVerificationInput = z.output<typeof createVerificationSchema>;

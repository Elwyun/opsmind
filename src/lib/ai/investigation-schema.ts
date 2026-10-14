import { z } from "zod";

import type { InvestigationModelOutput } from "./types";

export const confidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

/**
 * Schema the model output must satisfy. Field lengths are bounded so a runaway
 * completion cannot be stored or rendered.
 */
export const investigationOutputSchema = z.object({
  userSummary: z.string().min(1).max(1500),
  observations: z
    .array(
      z.object({
        statement: z.string().min(1).max(800),
        evidenceIds: z.array(z.string().min(1).max(32)).min(1).max(20),
      }),
    )
    .min(1)
    .max(15),
  hypotheses: z
    .array(
      z.object({
        statement: z.string().min(1).max(800),
        supportingEvidenceIds: z.array(z.string().min(1).max(32)).max(20),
        missingEvidence: z.array(z.string().min(1).max(400)).max(10),
        confidence: confidenceSchema,
      }),
    )
    .min(1)
    .max(10),
  recommendedChecks: z
    .array(
      z.object({
        title: z.string().min(1).max(240),
        reason: z.string().min(1).max(500),
        priority: confidenceSchema,
      }),
    )
    .min(1)
    .max(10),
  limitations: z.array(z.string().min(1).max(500)).max(10),
});

export interface SanitizedOutput {
  output: InvestigationModelOutput;
  discardedEvidenceIds: string[];
}

/**
 * Validates raw model output and removes references to evidence that was never
 * supplied.
 *
 * The model is treated as untrusted input: an observation that cites only
 * invented evidence IDs is dropped entirely, and any unknown citation is
 * recorded so the UI can say the reference was discarded.
 */
export function sanitizeAndValidateOutput(
  raw: unknown,
  allowedEvidenceIds: string[],
): SanitizedOutput {
  const parsed = investigationOutputSchema.parse(raw);
  const allowed = new Set(allowedEvidenceIds);
  const discarded = new Set<string>();

  const keepKnown = (ids: string[]): string[] => {
    const kept: string[] = [];
    for (const id of ids) {
      if (allowed.has(id)) {
        kept.push(id);
      } else {
        discarded.add(id);
      }
    }
    return kept;
  };

  const observations = parsed.observations
    .map((item) => ({ ...item, evidenceIds: keepKnown(item.evidenceIds) }))
    .filter((item) => item.evidenceIds.length > 0);

  const hypotheses = parsed.hypotheses.map((item) => ({
    ...item,
    supportingEvidenceIds: keepKnown(item.supportingEvidenceIds),
  }));

  return {
    output: {
      userSummary: parsed.userSummary,
      // Never return an empty observation list: keep the summary usable instead.
      observations:
        observations.length > 0
          ? observations
          : [
              {
                statement:
                  "The model cited evidence that was not supplied, so its observations were discarded.",
                evidenceIds: [allowedEvidenceIds[0] ?? "E1"],
              },
            ],
      hypotheses,
      recommendedChecks: parsed.recommendedChecks,
      limitations: parsed.limitations,
    },
    discardedEvidenceIds: [...discarded].sort(),
  };
}

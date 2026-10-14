import { describe, expect, it } from "vitest";

import { analyzePeriod, type DailyOperationalRecord } from "../src/lib/analysis/metrics";
import { buildInvestigationContext, EVIDENCE } from "../src/lib/ai/context-builder";
import { GeminiInvestigationClient, type FetchLike } from "../src/lib/ai/gemini-client";
import { investigationOutputSchema, sanitizeAndValidateOutput } from "../src/lib/ai/investigation-schema";
import { MockInvestigationClient } from "../src/lib/ai/mock-client";
import { extractCandidateText, stripCodeFence } from "../src/lib/ai/gemini-client";
import { InvestigationModelError } from "../src/lib/ai/types";
import { MockWeatherProvider } from "../src/lib/weather/mock-provider";

function buildRecords(): DailyOperationalRecord[] {
  const records: DailyOperationalRecord[] = [];
  for (let index = 0; index < 12; index += 1) {
    const day = String(index + 1).padStart(2, "0");
    const multiplier = index === 10 ? 1.36 : 1;
    records.push({
      date: `2026-01-${day}`,
      productionUnits: 1000,
      electricityKwh: 500 * multiplier,
      operatingHours: 10,
      electricityPrice: 1500,
      temperatureC: 33,
      humidityPercent: 75,
      weather: "Hot",
      sourceType: "SIMULATED",
      sourceName: "synthetic-seed-v1",
    });
  }
  return records;
}

async function buildContext() {
  const analysis = analyzePeriod(buildRecords());
  const anomaly = analysis.anomalies[0];
  const weather = await new MockWeatherProvider().getDailyWeather({ date: anomaly.date });

  return buildInvestigationContext({
    company: { id: "c1", name: "Demo Co", location: "Bekasi" },
    targetDate: anomaly.date,
    record: anomaly.record,
    metrics: anomaly.metrics!,
    weather,
  });
}

describe("investigation context", () => {
  it("exposes a stable evidence list", async () => {
    const context = await buildContext();
    expect(context.evidence.map((item) => item.id)).toEqual([
      EVIDENCE.actualIntensity,
      EVIDENCE.baselineIntensity,
      EVIDENCE.deviation,
      EVIDENCE.productionUnits,
      EVIDENCE.electricityKwh,
      EVIDENCE.expectedKwh,
      EVIDENCE.potentialExcessKwh,
      EVIDENCE.tariff,
      EVIDENCE.estimatedCost,
      EVIDENCE.operatingHours,
      EVIDENCE.weather,
      EVIDENCE.baselineWindow,
      EVIDENCE.dataSource,
    ]);
  });

  it("labels simulated data and states its limitations", async () => {
    const context = await buildContext();
    expect(context.dataSource.label).toBe("SIMULATED DATA");
    expect(context.serverLimitations.length).toBeGreaterThan(0);
    expect(context.missingInputs).toContain("Machine-level run hours");
  });
});

describe("mock investigation client", () => {
  it("returns schema-valid output that only cites supplied evidence", async () => {
    const context = await buildContext();
    const output = await new MockInvestigationClient().investigate(context);

    expect(investigationOutputSchema.safeParse(output).success).toBe(true);

    const allowed = new Set(context.allowedEvidenceIds);
    for (const observation of output.observations) {
      for (const id of observation.evidenceIds) expect(allowed.has(id)).toBe(true);
      expect(observation.evidenceIds.length).toBeGreaterThan(0);
    }
    for (const hypothesis of output.hypotheses) {
      expect(hypothesis.missingEvidence.length).toBeGreaterThan(0);
      for (const id of hypothesis.supportingEvidenceIds) expect(allowed.has(id)).toBe(true);
    }
  });

  it("repeats supplied values and never claims causation", async () => {
    const context = await buildContext();
    const output = await new MockInvestigationClient().investigate(context);

    expect(output.userSummary).toContain("Demo Co");
    expect(output.userSummary).toContain("36.0%");
    expect(output.userSummary).toContain("1,500.00");
    expect(output.userSummary.toLowerCase()).toContain("potential");
    for (const hypothesis of output.hypotheses) {
      expect(hypothesis.statement.toLowerCase()).not.toContain("caused");
    }
  });

  it("is not marked as live", async () => {
    const client = new MockInvestigationClient();
    expect(client.isLive).toBe(false);
    expect(client.provider).toBe("mock");
  });
});

describe("output sanitization", () => {
  const baseOutput = {
    userSummary: "Summary",
    observations: [{ statement: "Fact", evidenceIds: ["E1", "E999"] }],
    hypotheses: [
      {
        statement: "Maybe",
        supportingEvidenceIds: ["E2", "E404"],
        missingEvidence: ["None"],
        confidence: "LOW" as const,
      },
    ],
    recommendedChecks: [{ title: "Check", reason: "Because", priority: "LOW" as const }],
    limitations: ["Limited"],
  };

  it("drops references to evidence that was never supplied", () => {
    const result = sanitizeAndValidateOutput(baseOutput, ["E1", "E2"]);
    expect(result.output.observations[0].evidenceIds).toEqual(["E1"]);
    expect(result.output.hypotheses[0].supportingEvidenceIds).toEqual(["E2"]);
    expect(result.discardedEvidenceIds).toEqual(["E404", "E999"]);
  });

  it("replaces observations that cite only invented evidence", () => {
    const result = sanitizeAndValidateOutput(
      { ...baseOutput, observations: [{ statement: "Invented", evidenceIds: ["E777"] }] },
      ["E1"],
    );
    expect(result.output.observations[0].statement).toContain("discarded");
    // E2 and E404 come from the hypothesis in `baseOutput`; neither is allowed here.
    expect(result.discardedEvidenceIds).toEqual(["E2", "E404", "E777"]);
  });

  it("rejects output that does not match the schema", () => {
    expect(() => sanitizeAndValidateOutput({ userSummary: "" }, ["E1"])).toThrow();
  });
});

describe("Gemini response helpers", () => {
  it("extracts candidate text and strips code fences", () => {
    const payload = { candidates: [{ content: { parts: [{ text: "```json\n{\"a\":1}\n```" }] } }] };
    const text = extractCandidateText(payload);
    expect(text).not.toBeNull();
    expect(stripCodeFence(text as string)).toBe('{"a":1}');
    expect(extractCandidateText({ candidates: [] })).toBeNull();
  });
});

describe("Gemini client failure handling", () => {
  function jsonResponse(payload: unknown, status = 200): Response {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("returns validated output on success and reports it as live", async () => {
    const context = await buildContext();
    const mockOutput = await new MockInvestigationClient().investigate(context);

    const fetchImpl: FetchLike = async () =>
      jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify(mockOutput) }] } }] });

    const client = new GeminiInvestigationClient({ apiKey: "test-key", fetchImpl });
    const output = await client.investigate(context);

    expect(client.isLive).toBe(true);
    expect(client.provider).toBe("gemini");
    expect(output.userSummary).toBe(mockOutput.userSummary);
  });

  it("maps a timeout to MODEL_TIMEOUT", async () => {
    const context = await buildContext();
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });

    const client = new GeminiInvestigationClient({ apiKey: "test-key", fetchImpl, timeoutMs: 5 });
    await expect(client.investigate(context)).rejects.toMatchObject({ code: "MODEL_TIMEOUT" });
  });

  it("maps quota responses to MODEL_QUOTA", async () => {
    const context = await buildContext();
    const client = new GeminiInvestigationClient({
      apiKey: "test-key",
      fetchImpl: async () => new Response("", { status: 429 }),
    });
    await expect(client.investigate(context)).rejects.toBeInstanceOf(InvestigationModelError);
    await expect(client.investigate(context)).rejects.toMatchObject({ code: "MODEL_QUOTA" });
  });

  it("maps server errors to MODEL_ERROR", async () => {
    const context = await buildContext();
    const client = new GeminiInvestigationClient({
      apiKey: "test-key",
      fetchImpl: async () => new Response("boom", { status: 500 }),
    });
    await expect(client.investigate(context)).rejects.toMatchObject({ code: "MODEL_ERROR" });
  });

  it("maps unparseable responses to MODEL_INVALID_OUTPUT", async () => {
    const context = await buildContext();
    const client = new GeminiInvestigationClient({
      apiKey: "test-key",
      fetchImpl: async () => new Response("<html>nope</html>", { status: 200 }),
    });
    await expect(client.investigate(context)).rejects.toMatchObject({ code: "MODEL_INVALID_OUTPUT" });
  });

  it("maps schema mismatches to MODEL_INVALID_OUTPUT", async () => {
    const context = await buildContext();
    const client = new GeminiInvestigationClient({
      apiKey: "test-key",
      fetchImpl: async () =>
        jsonResponse({ candidates: [{ content: { parts: [{ text: '{"unexpected":true}' }] } }] }),
    });
    await expect(client.investigate(context)).rejects.toMatchObject({ code: "MODEL_INVALID_OUTPUT" });
  });
});

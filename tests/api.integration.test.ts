import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as actionsGet, PATCH as actionsPatch, POST as actionsPost } from "../src/app/api/actions/route";
import { GET as anomaliesGet } from "../src/app/api/anomalies/route";
import { GET as companiesGet } from "../src/app/api/companies/route";
import { GET as healthGet } from "../src/app/api/health/route";
import { POST as demoResetPost } from "../src/app/api/demo/reset/route";
import { GET as investigationByIdGet } from "../src/app/api/investigations/[id]/route";
import { GET as investigationsGet, POST as investigationsPost } from "../src/app/api/investigations/route";
import { GET as operationalDataGet } from "../src/app/api/operational-data/route";
import { POST as verificationsPost } from "../src/app/api/verifications/route";
import { DEMO_ANOMALY_DATE } from "../src/lib/demo/seed-data";
import { resetDemoData } from "../src/lib/services/demo-service";

const JSON_HEADERS = { "content-type": "application/json" };

function postJson(url: string, body: unknown): Request {
  return new Request(url, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) });
}

function patchJson(url: string, body: unknown): Request {
  return new Request(url, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(body) });
}

let companyId: string;

beforeAll(async () => {
  const result = await resetDemoData();
  companyId = result.companyId;
});

describe("GET /api/companies", () => {
  it("returns the seeded demo company with a correlation id", async () => {
    const response = await companiesGet(new Request("http://localhost/api/companies"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBeTruthy();

    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].name).toContain("Demo");
  });
});

describe("GET /api/health", () => {
  it("reports database and investigation-provider status without secrets", async () => {
    const response = await healthGet(new Request("http://localhost/api/health"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.status).toBe("ok");
    expect(body.data.database).toBe("ok");
    expect(body.data.ai.provider).toBe("mock");
    expect(body.data.ai.isLive).toBe(false);
  });
});

describe("GET /api/operational-data", () => {
  it("returns simulated rows for the company", async () => {
    const response = await operationalDataGet(
      new Request(`http://localhost/api/operational-data?companyId=${companyId}`),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveLength(30);
    expect(body.data[0].sourceType).toBe("SIMULATED");
    expect(typeof body.data[0].electricityKwh).toBe("number");
  });

  it("rejects a request without a companyId", async () => {
    const response = await operationalDataGet(new Request("http://localhost/api/operational-data"));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(body.error.correlationId).toBeTruthy();
  });
});

describe("GET /api/anomalies", () => {
  it("lists the anomaly candidates with evidence", async () => {
    const response = await anomaliesGet(
      new Request(`http://localhost/api/anomalies?companyId=${companyId}`),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.simulated).toBe(true);
    expect(body.data.count).toBe(2);

    const primary = body.data.anomalies.find(
      (candidate: { date: string }) => candidate.date === DEMO_ANOMALY_DATE,
    );
    expect(primary).toBeDefined();
    expect(primary.deviationPercent).toBeCloseTo(36, 6);
    expect(primary.evidenceSummary).toContain("threshold");
  });
});

describe("POST /api/investigations", () => {
  it("runs a complete investigation end to end", async () => {
    const response = await investigationsPost(
      postJson("http://localhost/api/investigations", { companyId, date: DEMO_ANOMALY_DATE }),
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    const investigation = body.data;

    expect(investigation.status).toBe("COMPLETED");
    expect(investigation.severity).toBe("MEDIUM");
    expect(investigation.deviationPercent).toBeCloseTo(36, 6);
    expect(investigation.methodVersion).toBe("baseline-v1");
    expect(investigation.modelName).toBe("mock-gemini-v1");

    // The mock is explicitly never presented as live AI.
    expect(investigation.result.provider).toBe("mock");
    expect(investigation.result.isLive).toBe(false);
    expect(investigation.result.dataLabel).toBe("SIMULATED DATA");
    expect(investigation.result.evidence).toHaveLength(13);
    expect(investigation.result.discardedEvidenceIds).toEqual([]);
    expect(investigation.result.output.observations.length).toBeGreaterThan(0);
    expect(investigation.result.output.hypotheses.length).toBeGreaterThan(0);
    expect(investigation.result.output.limitations.length).toBeGreaterThan(0);
  });

  it("records insufficient data instead of inventing a result", async () => {
    const response = await investigationsPost(
      postJson("http://localhost/api/investigations", { companyId, date: "2026-09-02" }),
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.data.status).toBe("INSUFFICIENT_DATA");
    expect(body.data.result).toBeNull();
    expect(body.data.errorCode).toBe("INSUFFICIENT_DATA");
  });

  it("returns 404 for a date with no stored data", async () => {
    const response = await investigationsPost(
      postJson("http://localhost/api/investigations", { companyId, date: "2026-08-01" }),
    );
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an invalid body", async () => {
    const response = await investigationsPost(
      postJson("http://localhost/api/investigations", { date: "2026-09-17" }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });

  it("re-running the same day replaces the stored investigation", async () => {
    await investigationsPost(
      postJson("http://localhost/api/investigations", { companyId, date: DEMO_ANOMALY_DATE }),
    );
    const list = await investigationsGet(
      new Request(`http://localhost/api/investigations?companyId=${companyId}`),
    );
    const body = await list.json();
    const matching = body.data.filter(
      (row: { targetDate: string }) => row.targetDate === DEMO_ANOMALY_DATE,
    );
    expect(matching).toHaveLength(1);
  });
});

describe("investigation detail and action lifecycle", () => {
  let investigationId: string;

  beforeAll(async () => {
    const response = await investigationsPost(
      postJson("http://localhost/api/investigations", { companyId, date: DEMO_ANOMALY_DATE }),
    );
    const body = await response.json();
    investigationId = body.data.id;
  });

  it("loads a single investigation by id", async () => {
    const response = await investigationByIdGet(
      new Request(`http://localhost/api/investigations/${investigationId}`),
      { params: Promise.resolve({ id: investigationId }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.id).toBe(investigationId);
  });

  it("returns 404 for an unknown investigation", async () => {
    const response = await investigationByIdGet(
      new Request("http://localhost/api/investigations/does-not-exist"),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(response.status).toBe(404);
  });

  it("creates an action, moves it to in progress, and completes it", async () => {
    const created = await actionsPost(
      postJson("http://localhost/api/actions", {
        investigationId,
        title: "Review cooling runtime for the warm spell",
        ownerName: "Ops team",
      }),
    );
    expect(created.status).toBe(201);
    const action = (await created.json()).data;
    expect(action.status).toBe("OPEN");

    const started = await actionsPatch(
      patchJson("http://localhost/api/actions", { id: action.id, status: "IN_PROGRESS" }),
    );
    const startedBody = (await started.json()).data;
    expect(startedBody.status).toBe("IN_PROGRESS");
    expect(startedBody.startedAt).toBeTruthy();

    const completed = await actionsPatch(
      patchJson("http://localhost/api/actions", {
        id: action.id,
        status: "COMPLETED",
        completionNote: "Runtime compared against the baseline week.",
      }),
    );
    const completedBody = (await completed.json()).data;
    expect(completedBody.status).toBe("COMPLETED");
    expect(completedBody.completedAt).toBeTruthy();
    expect(completedBody.completionNote).toContain("baseline");

    const listed = await actionsGet(
      new Request(`http://localhost/api/actions?companyId=${companyId}`),
    );
    const listedBody = await listed.json();
    expect(
      listedBody.data.some((row: { id: string }) => row.id === action.id),
    ).toBe(true);
  });

  it("refuses a verification while the action is not completed", async () => {
    const created = await actionsPost(
      postJson("http://localhost/api/actions", { investigationId, title: "Check meter calibration" }),
    );
    const action = (await created.json()).data;

    const response = await verificationsPost(
      postJson("http://localhost/api/verifications", {
        actionItemId: action.id,
        beforeFrom: "2026-09-06",
        beforeTo: "2026-09-16",
        afterFrom: "2026-09-18",
        afterTo: "2026-09-30",
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("ACTION_NOT_COMPLETED");
  });

  it("records a before/after verification with its caveat", async () => {
    const created = await actionsPost(
      postJson("http://localhost/api/actions", {
        investigationId,
        title: "Compare shift schedule against baseline week",
      }),
    );
    const action = (await created.json()).data;

    await actionsPatch(
      patchJson("http://localhost/api/actions", { id: action.id, status: "COMPLETED" }),
    );

    const response = await verificationsPost(
      postJson("http://localhost/api/verifications", {
        actionItemId: action.id,
        beforeFrom: "2026-09-06",
        beforeTo: "2026-09-16",
        afterFrom: "2026-09-18",
        afterTo: "2026-09-21",
        notes: "Observed after the schedule review.",
      }),
    );
    expect(response.status).toBe(201);

    const verification = (await response.json()).data;
    expect(verification.beforeIntensity).toBeGreaterThan(0);
    expect(verification.afterIntensity).toBeGreaterThan(0);
    expect(verification.changePercent).not.toBeNull();
    expect(verification.caveat).toContain("Observed change only");
  });

  it("rejects a verification whose windows are inverted", async () => {
    const created = await actionsPost(
      postJson("http://localhost/api/actions", { investigationId, title: "Inspect compressor cycling" }),
    );
    const action = (await created.json()).data;
    await actionsPatch(
      patchJson("http://localhost/api/actions", { id: action.id, status: "COMPLETED" }),
    );

    const response = await verificationsPost(
      postJson("http://localhost/api/verifications", {
        actionItemId: action.id,
        beforeFrom: "2026-09-18",
        beforeTo: "2026-09-21",
        afterFrom: "2026-09-06",
        afterTo: "2026-09-16",
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_RANGE");
  });
});

describe("POST /api/demo/reset token protection", () => {
  const previousToken = process.env.DEMO_RESET_TOKEN;

  beforeAll(() => {
    process.env.DEMO_RESET_TOKEN = "test-reset-token";
  });

  afterAll(() => {
    if (previousToken === undefined) delete process.env.DEMO_RESET_TOKEN;
    else process.env.DEMO_RESET_TOKEN = previousToken;
  });

  it("rejects a reset without the configured token", async () => {
    const response = await demoResetPost(
      new Request("http://localhost/api/demo/reset", { method: "POST" }),
    );
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error.code).toBe("RESET_TOKEN_REQUIRED");
  });
});

describe("POST /api/demo/reset", () => {
  it("restores the deterministic demo state", async () => {
    const response = await demoResetPost(
      new Request("http://localhost/api/demo/reset", { method: "POST" }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.days).toBe(30);

    const investigations = await investigationsGet(
      new Request(`http://localhost/api/investigations?companyId=${companyId}`),
    );
    expect((await investigations.json()).data).toHaveLength(0);
  });
});

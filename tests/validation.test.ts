import { describe, expect, it } from "vitest";

import { HttpError } from "../src/lib/api/http-error";
import { assertRangeOrder, parseJsonBody, parseQuery } from "../src/lib/api/validation";
import {
  createInvestigationSchema,
  createVerificationSchema,
  dateKeySchema,
  operationalDataQuerySchema,
  updateActionSchema,
} from "../src/lib/validation/schemas";

describe("dateKeySchema", () => {
  it("accepts real calendar dates", () => {
    expect(dateKeySchema.safeParse("2026-09-17").success).toBe(true);
    expect(dateKeySchema.safeParse("2024-02-29").success).toBe(true);
  });

  it("rejects malformed or impossible dates", () => {
    for (const value of ["17-09-2026", "2026-13-01", "2026-02-30", "2026-9-17", "", "2026/09/17"]) {
      expect(dateKeySchema.safeParse(value).success).toBe(false);
    }
  });
});

describe("request schemas", () => {
  it("requires a companyId for operational data queries", () => {
    const result = operationalDataQuerySchema.safeParse({ from: "2026-09-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["companyId"]);
    }
  });

  it("coerces and bounds the threshold", () => {
    const ok = createInvestigationSchema.safeParse({
      companyId: "c1",
      date: "2026-09-17",
      thresholdPercent: "20",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.thresholdPercent).toBe(20);

    expect(
      createInvestigationSchema.safeParse({ companyId: "c1", date: "2026-09-17", thresholdPercent: "9000" })
        .success,
    ).toBe(false);
  });

  it("rejects unknown action statuses", () => {
    expect(updateActionSchema.safeParse({ id: "a1", status: "DONE" }).success).toBe(false);
    expect(updateActionSchema.safeParse({ id: "a1", status: "COMPLETED" }).success).toBe(true);
  });

  it("requires all four verification window dates", () => {
    const result = createVerificationSchema.safeParse({
      actionItemId: "a1",
      beforeFrom: "2026-09-01",
      beforeTo: "2026-09-05",
    });
    expect(result.success).toBe(false);
  });
});

/** Runs a synchronous function and returns whatever it threw. */
function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
}

describe("parse helpers", () => {
  it("parses query parameters against a schema", () => {
    const request = new Request("http://localhost/api/operational-data?companyId=c1&from=2026-09-01");
    const parsed = parseQuery(operationalDataQuerySchema, request);
    expect(parsed.companyId).toBe("c1");
    expect(parsed.from).toBe("2026-09-01");
  });

  it("raises INVALID_QUERY with field details", () => {
    const request = new Request("http://localhost/api/operational-data?companyId=");
    const error = thrownBy(() => parseQuery(operationalDataQuerySchema, request));
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ code: "INVALID_QUERY", status: 400 });
  });

  it("raises INVALID_JSON for a body that is not JSON", async () => {
    const request = new Request("http://localhost/api/investigations", {
      method: "POST",
      body: "not json",
    });
    await expect(parseJsonBody(createInvestigationSchema, request)).rejects.toMatchObject({
      code: "INVALID_JSON",
      status: 400,
    });
  });

  it("raises INVALID_BODY with field details", async () => {
    const request = new Request("http://localhost/api/investigations", {
      method: "POST",
      body: JSON.stringify({ date: "2026-09-17" }),
    });
    await expect(parseJsonBody(createInvestigationSchema, request)).rejects.toMatchObject({
      code: "INVALID_BODY",
      status: 400,
    });
  });

  it("rejects a reversed date range", () => {
    expect(() => assertRangeOrder("2026-09-10", "2026-09-01")).toThrow(HttpError);
    expect(() => assertRangeOrder("2026-09-01", "2026-09-10")).not.toThrow();
  });
});

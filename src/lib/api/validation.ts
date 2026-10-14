import { z } from "zod";

import { HttpError } from "./http-error";

function formatIssues(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

/** Parse `URLSearchParams` against a schema. All values arrive as strings. */
export function parseQuery<S extends z.ZodType>(schema: S, request: Request): z.output<S> {
  const url = new URL(request.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (raw[key] === undefined) raw[key] = value;
  });

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(400, "INVALID_QUERY", "Query parameters failed validation.", formatIssues(result.error));
  }
  return result.data;
}

/** Parse a JSON body against a schema, rejecting malformed or oversized input. */
export async function parseJsonBody<S extends z.ZodType>(schema: S, request: Request): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, "INVALID_BODY", "Request body failed validation.", formatIssues(result.error));
  }
  return result.data;
}

/** Guard used by services that accept date windows. */
export function assertRangeOrder(from: string, to: string, label = "range"): void {
  if (from > to) {
    throw new HttpError(400, "INVALID_RANGE", `The ${label} is invalid: "from" must not be after "to".`, {
      from,
      to,
    });
  }
}

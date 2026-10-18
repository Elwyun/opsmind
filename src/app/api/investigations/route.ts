import { withRoute } from "../../../lib/api/handler";
import { checkRateLimit, clientKey } from "../../../lib/api/rate-limit";
import { jsonError, jsonOk } from "../../../lib/api/response";
import { parseJsonBody, parseQuery } from "../../../lib/api/validation";
import {
  investigateDay,
  listInvestigations,
} from "../../../lib/services/investigation-service";
import { createInvestigationSchema, investigationsQuerySchema } from "../../../lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = withRoute(async (request) => {
  const query = parseQuery(investigationsQuerySchema, request);
  const investigations = await listInvestigations(query);
  return jsonOk(investigations);
});

export const POST = withRoute(async (request, context) => {
  // Each investigation can call a paid model, so cap rapid repeats per client.
  const limit = checkRateLimit(`investigations:${clientKey(request)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many investigation requests. Try again shortly.", {
      correlationId: context.correlationId,
      details: { retryAfterSeconds: limit.retryAfterSeconds },
    });
  }

  const body = await parseJsonBody(createInvestigationSchema, request);
  const investigation = await investigateDay(body);
  return jsonOk(investigation, { status: 201 });
});

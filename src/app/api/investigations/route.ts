import { withRoute } from "../../../lib/api/handler";
import { jsonOk } from "../../../lib/api/response";
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

export const POST = withRoute(async (request) => {
  const body = await parseJsonBody(createInvestigationSchema, request);
  const investigation = await investigateDay(body);
  return jsonOk(investigation, { status: 201 });
});

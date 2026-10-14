import { withRoute } from "../../../lib/api/handler";
import { jsonOk } from "../../../lib/api/response";
import { parseQuery } from "../../../lib/api/validation";
import { listOperationalData } from "../../../lib/services/operational-data-service";
import { operationalDataQuerySchema } from "../../../lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = withRoute(async (request) => {
  const query = parseQuery(operationalDataQuerySchema, request);
  const rows = await listOperationalData(query);
  return jsonOk(rows);
});

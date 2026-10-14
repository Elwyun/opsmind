import { withRoute } from "../../../../lib/api/handler";
import { jsonOk } from "../../../../lib/api/response";
import { getInvestigationById } from "../../../../lib/services/investigation-service";

export const dynamic = "force-dynamic";

export const GET = withRoute<{ id: string }>(async (_request, context) => {
  const investigation = await getInvestigationById(context.params.id);
  return jsonOk(investigation);
});

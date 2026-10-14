import { z } from "zod";

import { withRoute } from "../../../lib/api/handler";
import { jsonOk } from "../../../lib/api/response";
import { parseJsonBody, parseQuery } from "../../../lib/api/validation";
import { createAction, listActions, updateAction } from "../../../lib/services/action-service";
import { createActionSchema, idSchema, updateActionSchema } from "../../../lib/validation/schemas";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  companyId: idSchema.optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withRoute(async (request) => {
  const query = parseQuery(listQuerySchema, request);
  const actions = await listActions(query);
  return jsonOk(actions);
});

export const POST = withRoute(async (request) => {
  const body = await parseJsonBody(createActionSchema, request);
  const action = await createAction(body);
  return jsonOk(action, { status: 201 });
});

export const PATCH = withRoute(async (request) => {
  const body = await parseJsonBody(updateActionSchema, request);
  const action = await updateAction(body);
  return jsonOk(action);
});

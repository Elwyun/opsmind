import { z } from "zod";

import { withRoute } from "../../../lib/api/handler";
import { jsonOk } from "../../../lib/api/response";
import { parseJsonBody, parseQuery } from "../../../lib/api/validation";
import {
  createVerification,
  listVerificationsForAction,
} from "../../../lib/services/verification-service";
import { createVerificationSchema, idSchema } from "../../../lib/validation/schemas";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({ actionItemId: idSchema });

export const GET = withRoute(async (request) => {
  const query = parseQuery(listQuerySchema, request);
  const verifications = await listVerificationsForAction(query.actionItemId);
  return jsonOk(verifications);
});

export const POST = withRoute(async (request) => {
  const body = await parseJsonBody(createVerificationSchema, request);
  const verification = await createVerification(body);
  return jsonOk(verification, { status: 201 });
});

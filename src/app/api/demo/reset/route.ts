import { withRoute } from "../../../../lib/api/handler";
import { jsonOk } from "../../../../lib/api/response";
import { resetDemoData } from "../../../../lib/services/demo-service";

export const dynamic = "force-dynamic";

/**
 * Demo reset path required by the roadmap. Rebuilds the deterministic
 * simulated dataset and clears investigations, actions and verifications.
 */
export const POST = withRoute(async () => {
  const result = await resetDemoData();
  return jsonOk(result);
});

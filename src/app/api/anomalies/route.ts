import { withRoute } from "../../../lib/api/handler";
import { jsonOk } from "../../../lib/api/response";
import { parseQuery } from "../../../lib/api/validation";
import { getDashboardSummary, getAnomalyCandidates } from "../../../lib/services/anomaly-service";
import { anomaliesQuerySchema } from "../../../lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = withRoute(async (request) => {
  const query = parseQuery(anomaliesQuerySchema, request);
  const [anomalies, summary] = await Promise.all([
    getAnomalyCandidates(query),
    getDashboardSummary(query),
  ]);

  return jsonOk({
    from: summary.from,
    to: summary.to,
    thresholdPercent: summary.thresholdPercent,
    methodVersion: summary.methodVersion,
    simulated: summary.simulated,
    count: anomalies.length,
    anomalies,
  });
});

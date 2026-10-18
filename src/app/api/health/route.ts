import { getInvestigationProviderInfo } from "../../../lib/ai";
import { withRoute } from "../../../lib/api/handler";
import { jsonError, jsonOk } from "../../../lib/api/response";
import { prisma } from "../../../lib/db";

export const dynamic = "force-dynamic";

/**
 * Deployment health check. Reports whether the database is reachable and
 * whether investigations are using live Gemini or the labelled mock, without
 * exposing any secret or connection detail.
 */
export const GET = withRoute(async (_request, context) => {
  const provider = getInvestigationProviderInfo();

  try {
    await prisma.company.count();
  } catch (error) {
    console.error(
      `[opsmind] health check database failure correlationId=${context.correlationId} ` +
        `name=${error instanceof Error ? error.name : "Unknown"}`,
    );
    return jsonError(503, "DATABASE_UNAVAILABLE", "The database is not reachable.", {
      correlationId: context.correlationId,
    });
  }

  return jsonOk({
    status: "ok",
    database: "ok",
    ai: {
      provider: provider.provider,
      isLive: provider.isLive,
      modelName: provider.modelName,
    },
  });
});

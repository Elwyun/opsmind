import { timingSafeEqual } from "node:crypto";

import { withRoute } from "../../../../lib/api/handler";
import { checkRateLimit, clientKey } from "../../../../lib/api/rate-limit";
import { jsonError, jsonOk } from "../../../../lib/api/response";
import { resetDemoData } from "../../../../lib/services/demo-service";

export const dynamic = "force-dynamic";

function tokensMatch(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Demo reset path required by the roadmap. Rebuilds the deterministic
 * simulated dataset and clears investigations, actions and verifications.
 *
 * A public deployment should set `DEMO_RESET_TOKEN`; the request must then
 * carry the same value in `x-demo-reset-token`. The endpoint is also
 * rate-limited so a client cannot repeatedly wipe the demo.
 */
export const POST = withRoute(async (request, context) => {
  const limit = checkRateLimit(`demo-reset:${clientKey(request)}`, {
    limit: 3,
    windowMs: 10 * 60_000,
  });
  if (!limit.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many demo reset requests. Try again later.", {
      correlationId: context.correlationId,
      details: { retryAfterSeconds: limit.retryAfterSeconds },
    });
  }

  const expectedToken = process.env.DEMO_RESET_TOKEN?.trim();
  if (expectedToken) {
    const suppliedToken = request.headers.get("x-demo-reset-token")?.trim() ?? "";
    if (!tokensMatch(suppliedToken, expectedToken)) {
      return jsonError(
        403,
        "RESET_TOKEN_REQUIRED",
        "A valid demo reset token is required. Set x-demo-reset-token to the configured value.",
        { correlationId: context.correlationId },
      );
    }
  }

  const result = await resetDemoData();
  return jsonOk(result);
});

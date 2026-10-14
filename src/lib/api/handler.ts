import { randomUUID } from "node:crypto";

import { HttpError } from "./http-error";
import { jsonError } from "./response";

export interface RouteContext<P> {
  correlationId: string;
  params: P;
}

type Handler<P> = (request: Request, context: RouteContext<P>) => Promise<Response>;

/**
 * Wraps a route handler so that:
 * - every request gets a correlation ID (returned in `x-correlation-id`),
 * - known `HttpError`s become their declared status and code,
 * - everything else becomes a safe 500 without leaking internals.
 *
 * Logs contain only the error name/message plus the correlation ID. Request
 * bodies, headers and environment values are never logged.
 */
export function withRoute<P = Record<string, never>>(handler: Handler<P>) {
  return async (request: Request, segment?: { params: Promise<P> }): Promise<Response> => {
    const correlationId = randomUUID();

    try {
      const params = segment ? await segment.params : ({} as P);
      const response = await handler(request, { correlationId, params });
      response.headers.set("x-correlation-id", correlationId);
      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        return jsonError(error.status, error.code, error.message, {
          details: error.details,
          correlationId,
        });
      }

      console.error(
        `[opsmind] unhandled route error correlationId=${correlationId} ` +
          `name=${error instanceof Error ? error.name : "Unknown"}`,
      );
      return jsonError(
        500,
        "INTERNAL_ERROR",
        "Something went wrong while handling the request.",
        { correlationId },
      );
    }
  };
}

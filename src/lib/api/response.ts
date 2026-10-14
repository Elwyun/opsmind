/**
 * Every API response uses one of two shapes so clients never have to guess:
 *
 *   success: `{ "data": ... }`
 *   failure: `{ "error": { "code", "message", "details?", "correlationId" } }`
 */

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  correlationId: string;
}

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data }, init);
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  options: { details?: unknown; correlationId?: string } = {},
): Response {
  const payload: ApiErrorPayload = {
    code,
    message,
    correlationId: options.correlationId ?? "unknown",
  };
  if (options.details !== undefined) {
    payload.details = options.details;
  }
  return Response.json({ error: payload }, { status });
}

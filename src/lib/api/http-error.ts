/**
 * Error type thrown by route handlers and services to produce a consistent API
 * error body. Anything that is not an `HttpError` is treated as an unexpected
 * failure and reported as a generic 500 with a correlation ID.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string, id: string) {
    super(404, "NOT_FOUND", `${resource} "${id}" was not found.`);
    this.name = "NotFoundError";
  }
}

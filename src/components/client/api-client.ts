/**
 * The UI never invents values: every mutation goes through the API and the
 * response is narrowed to a success or a structured error.
 */

export interface ApiFailure {
  code: string;
  message: string;
  details?: unknown;
  correlationId: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

interface Envelope {
  data?: unknown;
  error?: { code?: string; message?: string; details?: unknown; correlationId?: string };
}

async function request<T>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "The request could not reach the server.",
        correlationId: "unknown",
      },
    };
  }

  const payload = (await response.json().catch(() => null)) as Envelope | null;

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: payload?.error?.code ?? "UNKNOWN_ERROR",
        message: payload?.error?.message ?? `The request failed with status ${response.status}.`,
        details: payload?.error?.details,
        correlationId: payload?.error?.correlationId ?? "unknown",
      },
    };
  }

  return { ok: true, data: payload?.data as T };
}

export function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(url, "POST", body);
}

export function patchJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(url, "PATCH", body);
}

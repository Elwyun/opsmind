import { buildInvestigationPrompt } from "./investigation-prompt";
import { sanitizeAndValidateOutput } from "./investigation-schema";
import {
  InvestigationModelError,
  type InvestigationContext,
  type InvestigationModelClient,
  type InvestigationModelOutput,
} from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TIMEOUT_MS = 20_000;

/** Narrow fetch shape so tests can substitute a stub without a real network. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface GeminiInvestigationClientOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

/**
 * Calls Gemini from the server only. The API key never reaches the browser.
 *
 * Failure handling is explicit: timeouts, quota errors, malformed JSON and
 * schema mismatches each raise an `InvestigationModelError`. The caller records
 * a failed investigation rather than inventing a result.
 */
export class GeminiInvestigationClient implements InvestigationModelClient {
  readonly provider = "gemini" as const;
  readonly isLive = true;
  readonly modelName: string;

  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: GeminiInvestigationClientOptions) {
    this.apiKey = options.apiKey;
    this.modelName = options.model?.trim() || DEFAULT_GEMINI_MODEL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async investigate(context: InvestigationContext): Promise<InvestigationModelOutput> {
    const { system, user } = buildInvestigationPrompt(context);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(
        `${GEMINI_ENDPOINT}/${encodeURIComponent(this.modelName)}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // Header auth keeps the key out of URLs and request logs.
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new InvestigationModelError(
          "MODEL_TIMEOUT",
          `The model did not respond within ${this.timeoutMs} ms.`,
        );
      }
      throw new InvestigationModelError("MODEL_ERROR", "The model request could not be completed.");
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429) {
      throw new InvestigationModelError(
        "MODEL_QUOTA",
        "The model rate limit or quota was reached. Try again later.",
      );
    }
    if (!response.ok) {
      throw new InvestigationModelError("MODEL_ERROR", `The model returned HTTP ${response.status}.`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new InvestigationModelError(
        "MODEL_INVALID_OUTPUT",
        "The model response was not valid JSON.",
      );
    }

    const text = extractCandidateText(payload);
    if (!text) {
      throw new InvestigationModelError(
        "MODEL_INVALID_OUTPUT",
        "The model response did not contain any text content.",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(text));
    } catch {
      throw new InvestigationModelError(
        "MODEL_INVALID_OUTPUT",
        "The model output could not be parsed as JSON.",
      );
    }

    try {
      return sanitizeAndValidateOutput(parsed, context.allowedEvidenceIds).output;
    } catch {
      throw new InvestigationModelError(
        "MODEL_INVALID_OUTPUT",
        "The model output did not match the required schema.",
      );
    }
  }
}

interface GeminiResponseShape {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export function extractCandidateText(payload: unknown): string | null {
  const shape = payload as GeminiResponseShape;
  const parts = shape.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  return text.length > 0 ? text : null;
}

/** Models sometimes wrap JSON in a fenced block even when asked not to. */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
}

import { GeminiInvestigationClient } from "./gemini-client";
import { MockInvestigationClient } from "./mock-client";
import type { InvestigationModelClient } from "./types";

export * from "./types";
export * from "./investigation-schema";
export * from "./context-builder";
export { PROMPT_VERSION, buildInvestigationPrompt, INVESTIGATION_SYSTEM_PROMPT } from "./investigation-prompt";
export {
  GeminiInvestigationClient,
  DEFAULT_GEMINI_MODEL,
  extractCandidateText,
  stripCodeFence,
  type FetchLike,
} from "./gemini-client";
export { MockInvestigationClient, buildMockOutput, MOCK_MODEL_NAME } from "./mock-client";

export interface InvestigationProviderInfo {
  provider: "gemini" | "mock";
  isLive: boolean;
  modelName: string;
}

/**
 * Chooses the investigation model client.
 *
 * With `GEMINI_API_KEY` set the real Gemini client is used. Without it the
 * deterministic mock runs, so the whole demo path — including failure-free
 * operation offline — still works. The active choice is surfaced in the UI.
 */
export function getInvestigationModelClient(): InvestigationModelClient {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey && apiKey.length > 0) {
    return new GeminiInvestigationClient({
      apiKey,
      model: process.env.GEMINI_MODEL?.trim(),
    });
  }
  return new MockInvestigationClient();
}

export function getInvestigationProviderInfo(): InvestigationProviderInfo {
  const client = getInvestigationModelClient();
  return {
    provider: client.provider,
    isLive: client.isLive,
    modelName: client.modelName,
  };
}

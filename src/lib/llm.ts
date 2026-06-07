import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Thin seam over the LLM provider.
 *
 * Default: Anthropic Claude (token usage billed to ANTHROPIC_API_KEY).
 * To run fully free, swap this for a local model — e.g. install
 * `ollama-ai-provider` and return `ollama(process.env.OLLAMA_MODEL)`.
 * Nothing else in the codebase needs to change because every agent
 * depends only on `getModel()`.
 */

const DEFAULT_MODEL = process.env.CONSULT_DECK_MODEL ?? "claude-sonnet-4-6";

export function getModel(): LanguageModel {
  const provider = process.env.LLM_PROVIDER ?? "anthropic";

  if (provider !== "anthropic") {
    throw new Error(
      `LLM_PROVIDER="${provider}" is not wired up. The default is "anthropic". ` +
        `To use a free local model, add an Ollama/OpenAI-compatible provider here.`,
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.",
    );
  }

  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic(DEFAULT_MODEL);
}

import "server-only";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { anthropicSupportsEffort, type ProviderId } from "@/lib/providers";
import { OPENAI_COMPATIBLE_BASE } from "./provider-models";

export interface AIConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
}

type AnthropicFields = NonNullable<ConstructorParameters<typeof ChatAnthropic>[0]>;
export type Effort = "low" | "medium" | "high";

/** Flip off if the fallback beta ever causes trouble with your account. */
const ENABLE_REFUSAL_FALLBACKS = true;

/**
 * Builds a per-request chat model from the caller's own key. Keys are never
 * stored server-side; the instance lives only for this request.
 */
export function createChatModel({ provider, apiKey, model }: AIConfig, effort: Effort): BaseChatModel {
  switch (provider) {
    case "anthropic": {
      const fields: AnthropicFields = { apiKey, model, maxTokens: 16000, maxRetries: 1 };
      if (anthropicSupportsEffort(model)) fields.outputConfig = { effort };
      // Server-side refusal fallbacks: if a safety classifier declines a request,
      // Anthropic retries it on a fallback model instead of returning a refusal.
      if (ENABLE_REFUSAL_FALLBACKS && model === "claude-opus-5") {
        fields.betas = ["server-side-fallback-2026-07-01"] as NonNullable<AnthropicFields["betas"]>;
        fields.invocationKwargs = { fallbacks: "default" };
      }
      return new ChatAnthropic(fields);
    }
    case "google":
      return new ChatGoogleGenerativeAI({ apiKey, model, maxOutputTokens: 16000, maxRetries: 1 });
    case "openai":
    case "openrouter":
    case "groq":
      return new ChatOpenAI({
        apiKey,
        model,
        maxRetries: 1,
        configuration: {
          baseURL: OPENAI_COMPATIBLE_BASE[provider],
          ...(provider === "openrouter"
            ? { defaultHeaders: { "HTTP-Referer": "https://unfold.local", "X-Title": "Unfold" } }
            : {}),
        },
      });
  }
}

/**
 * How to get structured output from each provider. Anthropic, OpenAI and
 * Gemini enforce a JSON schema natively. Open-weight models on Groq and
 * OpenRouter often ignore a forced tool call (Groq: "tool_use_failed"), so
 * they go straight to JSON prompting instead of wasting a failing request.
 */
export function structuredMethod(provider: ProviderId): "jsonSchema" | "prompt" {
  return provider === "openrouter" || provider === "groq" ? "prompt" : "jsonSchema";
}

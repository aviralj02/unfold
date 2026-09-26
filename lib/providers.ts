export type ProviderId = "anthropic" | "openai" | "google" | "openrouter" | "groq";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  keyUrl: string;
  placeholder: string;
  keyPattern: RegExp;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-…",
    keyPattern: /^sk-ant-/,
  },
  {
    id: "openai",
    label: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    placeholder: "sk-…",
    keyPattern: /^sk-/,
  },
  {
    id: "google",
    label: "Gemini",
    keyUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza…",
    keyPattern: /^AIza/,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyUrl: "https://openrouter.ai/settings/keys",
    placeholder: "sk-or-…",
    keyPattern: /^sk-or-/,
  },
  {
    id: "groq",
    label: "Groq",
    keyUrl: "https://console.groq.com/keys",
    placeholder: "gsk_…",
    keyPattern: /^gsk_/,
  },
];

export function getProvider(id: string | null | undefined): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** More specific prefixes first: OpenRouter's "sk-or-" and Anthropic's "sk-ant-" before OpenAI's "sk-". */
const DETECT_ORDER: ProviderId[] = ["anthropic", "openrouter", "groq", "google", "openai"];

export function detectProvider(key: string): ProviderId | null {
  const k = key.trim();
  return DETECT_ORDER.find((id) => getProvider(id)!.keyPattern.test(k)) ?? null;
}

/** Anthropic models that reject `effort` / adaptive thinking. */
export const anthropicSupportsEffort = (model: string) => !/haiku|claude-3/.test(model);

export interface ModelEntry {
  id: string;
  label?: string;
}

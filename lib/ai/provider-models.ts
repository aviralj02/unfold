import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ModelEntry, ProviderId } from "@/lib/providers";

export class KeyRejectedError extends Error {}

export const OPENAI_COMPATIBLE_BASE: Partial<Record<ProviderId, string>> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
};

const TIMEOUT = 12_000;

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  if (res.status === 401 || res.status === 403) throw new KeyRejectedError();
  if (res.status === 400) {
    const text = await res.text();
    if (/API_KEY_INVALID|API key not valid/i.test(text)) throw new KeyRejectedError();
    throw new Error(`Provider returned 400: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`Provider returned ${res.status}`);
  return res.json();
}

const versionOf = (id: string) => {
  const m = id.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
};

/* ---------- per-provider listing ---------- */

async function anthropicModels(apiKey: string): Promise<ModelEntry[]> {
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: TIMEOUT });
  try {
    const out: ModelEntry[] = [];
    for await (const m of client.models.list({ limit: 100 })) out.push({ id: m.id, label: m.display_name });
    return out;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      throw new KeyRejectedError();
    }
    throw err;
  }
}

const OPENAI_EXCLUDE = /(audio|realtime|transcribe|tts|image|search|instruct|embedding|dall-e|whisper|moderation|davinci|babbage|codex|computer-use|deep-research)/i;

async function openaiModels(apiKey: string): Promise<ModelEntry[]> {
  const data = (await getJson(`${OPENAI_COMPATIBLE_BASE.openai}/models`, { Authorization: `Bearer ${apiKey}` })) as {
    data: { id: string; created?: number }[];
  };
  return data.data
    .filter((m) => /^(gpt-|o\d|chatgpt-)/.test(m.id) && !OPENAI_EXCLUDE.test(m.id))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .map((m) => ({ id: m.id }));
}

async function googleModels(apiKey: string): Promise<ModelEntry[]> {
  const data = (await getJson(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(apiKey)}`,
  )) as { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] };
  return (data.models ?? [])
    .filter(
      (m) =>
        m.supportedGenerationMethods?.includes("generateContent") &&
        /gemini/i.test(m.name) &&
        !/(embedding|tts|image|live|audio|aqa|vision|robotics|computer-use)/i.test(m.name),
    )
    .map((m) => ({ id: m.name.replace(/^models\//, ""), label: m.displayName }))
    .sort((a, b) => versionOf(b.id) - versionOf(a.id));
}

async function openrouterModels(apiKey: string): Promise<ModelEntry[]> {
  // The model list is public, so check the key separately.
  await getJson(`${OPENAI_COMPATIBLE_BASE.openrouter}/key`, { Authorization: `Bearer ${apiKey}` });
  const data = (await getJson(`${OPENAI_COMPATIBLE_BASE.openrouter}/models`)) as {
    data: { id: string; name?: string; architecture?: { output_modalities?: string[] } }[];
  };
  return data.data
    .filter((m) => !m.architecture?.output_modalities || m.architecture.output_modalities.includes("text"))
    .map((m) => ({ id: m.id, label: m.name }));
}

async function groqModels(apiKey: string): Promise<ModelEntry[]> {
  const data = (await getJson(`${OPENAI_COMPATIBLE_BASE.groq}/models`, { Authorization: `Bearer ${apiKey}` })) as {
    data: { id: string; active?: boolean }[];
  };
  return data.data
    .filter((m) => m.active !== false && !/(whisper|tts|guard|playai|distil)/i.test(m.id))
    .map((m) => ({ id: m.id }));
}

/* ---------- defaults ---------- */

function pickDefault(provider: ProviderId, models: ModelEntry[]): string | null {
  const ids = models.map((m) => m.id);
  const first = (re: RegExp) => ids.find((id) => re.test(id));
  switch (provider) {
    case "anthropic":
      return ids.includes("claude-opus-5") ? "claude-opus-5" : (first(/opus/) ?? first(/sonnet/) ?? ids[0] ?? null);
    case "openai":
      // Newest general model without a size/date suffix, e.g. "gpt-5".
      return first(/^gpt-\d+(\.\d+)?$/) ?? first(/^gpt-/) ?? ids[0] ?? null;
    case "google": {
      const stable = ids.filter((id) => !/(preview|exp|latest)/.test(id));
      return stable.find((id) => /pro/.test(id)) ?? stable[0] ?? ids[0] ?? null;
    }
    case "openrouter":
      return ids.includes("anthropic/claude-opus-5") ? "anthropic/claude-opus-5" : (first(/^anthropic\/claude-opus/) ?? first(/^openai\/gpt-/) ?? ids[0] ?? null);
    case "groq":
      return first(/gpt-oss-120b/) ?? first(/70b/) ?? ids[0] ?? null;
  }
}

export async function listModels(provider: ProviderId, apiKey: string) {
  const models = await {
    anthropic: anthropicModels,
    openai: openaiModels,
    google: googleModels,
    openrouter: openrouterModels,
    groq: groqModels,
  }[provider](apiKey);
  return { models, defaultModel: pickDefault(provider, models) };
}

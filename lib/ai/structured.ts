import "server-only";
import type { RunnableConfig } from "@langchain/core/runnables";
import { toJsonSchema } from "@langchain/core/utils/json_schema";
import type { z } from "zod";
import { createChatModel, structuredMethod, type AIConfig, type Effort } from "./model";

type Message = { role: "system" | "user"; content: string };

/** Errors that another attempt with a different output mode won't fix. */
function isFatal(err: unknown) {
  const e = err as { status?: number; name?: string; message?: string };
  if (e?.name === "AbortError" || e?.name === "TimeoutError") return true;
  const status = e?.status;
  if (status && [401, 403, 404, 429].includes(status)) return true;
  if (status && status >= 500) return true;
  return /API key|api_key|unauthori[sz]ed|quota|rate limit/i.test(e?.message ?? "");
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new SyntaxError("No JSON object in response");
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * Structured output that works across providers: the provider's native mode
 * first, then plain JSON prompting for models that don't support it.
 */
export async function invokeStructured<S extends z.ZodType>(
  ai: AIConfig,
  effort: Effort,
  schema: S,
  name: string,
  messages: Message[],
  config?: RunnableConfig,
): Promise<z.infer<S>> {
  const llm = createChatModel(ai, effort);
  const method = structuredMethod(ai.provider);
  if (method !== "prompt") {
    try {
      const structured = llm.withStructuredOutput(schema, { name, method });
      return (await structured.invoke(messages, config)) as z.infer<S>;
    } catch (err) {
      if (isFatal(err)) throw err;
    }
  }

  const jsonSchema = JSON.stringify(toJsonSchema(schema));
  const res = await llm.invoke(
    [
      ...messages,
      {
        role: "user",
        content: `Respond with a single JSON object only — no prose, no markdown — matching this JSON schema:\n${jsonSchema}`,
      },
    ],
    config,
  );
  return schema.parse(extractJson(res.text));
}

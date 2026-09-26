"use client";

import { readSettings } from "@/lib/storage";
import type { ErrorCode, ResearchEvent, ResearchRequest, ResearchResult, ResearchStage } from "@/lib/types";

export class ResearchError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = "unknown",
  ) {
    super(message);
  }
}

export async function runResearch(
  request: ResearchRequest,
  { onStage, signal }: { onStage?: (stage: ResearchStage, detail?: string) => void; signal?: AbortSignal } = {},
): Promise<ResearchResult> {
  const settings = readSettings();
  let res: Response;
  try {
    res = await fetch("/api/research", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ai-provider": settings.provider ?? "",
        "x-ai-key": settings.apiKey,
        "x-ai-model": settings.model,
      },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ResearchError("Couldn't reach the Unfold server. Check your connection and retry.");
  }

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { message?: string; code?: ErrorCode } | null;
    throw new ResearchError(data?.message ?? `Request failed (${res.status}).`, data?.code);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += value;
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ResearchEvent;
      if (event.type === "stage") onStage?.(event.stage, event.detail);
      else if (event.type === "result") return event.result;
      else if (event.type === "error") throw new ResearchError(event.message, event.code);
    }
    if (done) break;
  }
  throw new ResearchError("The research stream ended unexpectedly. Please retry.");
}

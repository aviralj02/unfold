import { buildResearchGraph, initialState } from "@/lib/ai/graph";
import { describeError } from "@/lib/ai/errors";
import { getProvider } from "@/lib/providers";
import type { ResearchEvent, ResearchRequest, ResearchResult, ResearchStage } from "@/lib/types";

export const maxDuration = 120;

const TIMEOUT_MS = 110_000;

/** Which stage begins once a given graph node has finished. */
const NEXT_STAGE: Record<string, ResearchStage> = {
  planner: "searching",
  search: "generating",
  generate: "validating",
};

function parseRequest(body: unknown): ResearchRequest | string {
  const b = body as Partial<ResearchRequest> | null;
  const rootQuery = typeof b?.rootQuery === "string" ? b.rootQuery.trim() : "";
  if (!rootQuery) return "Enter a topic or question to research.";
  if (rootQuery.length > 500) return "Keep the question under 500 characters.";
  if (b?.mode !== "initial" && b?.mode !== "expand") return "Invalid research mode.";

  const useSearch = b.useSearch === true;
  const strings = (v: unknown, max: number) =>
    Array.isArray(v) ? v.filter((t): t is string => typeof t === "string").slice(0, max).map((t) => t.slice(0, 120)) : [];

  if (b.mode === "expand") {
    const title = typeof b.focus?.title === "string" ? b.focus.title.trim() : "";
    if (!title) return "Pick a step to break down.";
    return {
      mode: "expand",
      rootQuery,
      useSearch,
      focus: {
        title: title.slice(0, 120),
        summary: String(b.focus?.summary ?? "").slice(0, 600),
        inputs: strings(b.focus?.inputs, 10),
        outputs: strings(b.focus?.outputs, 10),
      },
      existingTitles: strings(b.existingTitles, 120),
    };
  }
  return { mode: "initial", rootQuery, useSearch };
}

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-ai-key")?.trim();
  const provider = getProvider(request.headers.get("x-ai-provider"));
  const model = request.headers.get("x-ai-model")?.trim();
  // Optional web grounding runs on the server owner's Tavily key, never a visitor's.
  const tavilyKey = process.env.TAVILY_API_KEY || undefined;

  if (!apiKey || !provider || !model) {
    return Response.json({ message: "Connect an AI provider key in Settings to continue.", code: "auth" }, { status: 401 });
  }

  let parsed: ResearchRequest | string;
  try {
    parsed = parseRequest(await request.json());
  } catch {
    parsed = "Malformed request.";
  }
  if (typeof parsed === "string") return Response.json({ message: parsed }, { status: 400 });
  const researchRequest = parsed;
  if (researchRequest.useSearch && !tavilyKey) {
    return Response.json(
      { message: "Web sources aren't available on this server (TAVILY_API_KEY is missing). Turn them off and retry.", code: "search_auth" },
      { status: 503 },
    );
  }

  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(TIMEOUT_MS)]);
  const graph = buildResearchGraph({ ai: { provider: provider.id, apiKey, model }, tavilyKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ResearchEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          // Client went away; nothing left to do.
        }
      };

      send({ type: "stage", stage: researchRequest.useSearch ? "planning" : "generating" });
      try {
        let finalResult: ResearchResult | null = null;
        let lastFeedback: string | null = null;
        const updates = await graph.stream(initialState(researchRequest), {
          streamMode: "updates",
          signal,
        });
        for await (const chunk of updates) {
          for (const [node, update] of Object.entries(chunk as Record<string, Record<string, unknown>>)) {
            if (node === "search") {
              const count = (update.sources as unknown[] | undefined)?.length ?? 0;
              send({ type: "stage", stage: "generating", detail: `${count} source${count === 1 ? "" : "s"} found` });
            } else if (node === "validate") {
              if (update.result) finalResult = update.result as ResearchResult;
              else {
                lastFeedback = (update.feedback as string | null) ?? lastFeedback;
                send({ type: "stage", stage: "generating", detail: "Fixing gaps in the flow" });
              }
            } else if (NEXT_STAGE[node]) {
              send({ type: "stage", stage: NEXT_STAGE[node] });
            }
          }
        }

        if (finalResult) send({ type: "result", result: finalResult });
        else
          send({
            type: "error",
            code: "invalid_output",
            message: lastFeedback
              ? "The AI couldn't produce a connected flow for this. Try rephrasing as \"how does … work\", or retry."
              : "Research finished without a result. Please retry.",
          });
      } catch (err) {
        const { message, code } = describeError(err, provider.label);
        if (code === "unknown") console.error("[research]", (err as Error)?.message);
        send({ type: "error", message, code });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

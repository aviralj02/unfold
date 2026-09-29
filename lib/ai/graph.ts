import "server-only";
import { Annotation, END, START, StateGraph, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";
import {
  STEP_KINDS,
  type GeneratedLink,
  type GeneratedStep,
  type ResearchRequest,
  type ResearchResult,
  type ResearchSource,
  type StepKind,
} from "@/lib/types";
import type { AIConfig } from "./model";
import { generatorPrompt, LIMITS, plannerPrompt } from "./prompts";
import { searchWeb } from "./search";
import { invokeStructured } from "./structured";

/* ---------- Structured output schemas ---------- */

const PlanSchema = z.object({
  searchQueries: z.array(z.string()).describe("Distinct web search queries"),
});

const StepSchema = z.object({
  key: z.string().describe("Short unique id for this step, e.g. s1, s2"),
  title: z.string(),
  kind: z.string().describe(`One of: ${STEP_KINDS.join(", ")}`),
  summary: z.string(),
  details: z.string(),
  keyPoints: z.array(z.string()),
  sourceIds: z.array(z.number().int()).describe("Numbers of the sources that support this step"),
});

const FlowSchema = z.object({
  title: z.string(),
  summary: z.string(),
  steps: z.array(StepSchema).describe("Steps in the order the flow reaches them"),
  links: z
    .array(z.object({ from: z.string(), to: z.string(), label: z.string() }))
    .describe("Directed links between step keys"),
});

type Draft = z.infer<typeof FlowSchema>;

/* ---------- Workflow ---------- */

export interface WorkflowDeps {
  ai: AIConfig;
  /** Present only when the server has a Tavily key. */
  tavilyKey?: string;
}

const MAX_GENERATION_ATTEMPTS = 2;

const ResearchState = Annotation.Root({
  request: Annotation<ResearchRequest>,
  searchQueries: Annotation<string[]>,
  sources: Annotation<ResearchSource[]>,
  draft: Annotation<Draft | null>,
  attempts: Annotation<number>,
  feedback: Annotation<string | null>,
  result: Annotation<ResearchResult | null>,
});

type State = typeof ResearchState.State;

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function clean(text: string | undefined, max: number) {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function pickSources(ids: number[], sources: ResearchSource[]) {
  // Only sources that came back from search are ever attached — the model
  // can reference them by number but cannot introduce new URLs.
  const unique = [...new Set(ids)].filter((i) => Number.isInteger(i) && i >= 1 && i <= sources.length);
  return unique.map((i) => sources[i - 1]);
}

function toKind(value: string): StepKind {
  const v = value.toLowerCase().trim();
  return (STEP_KINDS as string[]).includes(v) ? (v as StepKind) : "process";
}

/**
 * Checks the draft is a usable flow: real steps, unique titles, links that
 * point at existing steps, nothing left disconnected.
 */
export function validateFlow(draft: Draft, request: ResearchRequest, sources: ResearchSource[]) {
  const range = request.mode === "initial" ? LIMITS.initialSteps : LIMITS.expandSteps;
  // Only the step being broken down is off-limits. Other canvas titles are
  // guidance in the prompt: a sub-flow often needs to name a neighbour (e.g.
  // "Vector Store" inside "Retriever"), and dropping it would sever its links.
  const taken = new Set(request.focus ? [normalize(request.focus.title)] : []);

  const steps: GeneratedStep[] = [];
  const keyFor = new Map<string, string>(); // model key or title → our key
  for (const s of draft.steps) {
    const title = clean(s.title, 60);
    const summary = clean(s.summary, 300);
    const norm = normalize(title);
    if (!title || !summary || taken.has(norm)) continue;
    taken.add(norm);
    const key = `k${steps.length}`;
    if (s.key) keyFor.set(clean(s.key, 40).toLowerCase(), key);
    keyFor.set(norm, key);
    steps.push({
      key,
      title,
      kind: toKind(s.kind),
      summary,
      details: clean(s.details, 1200),
      keyPoints: s.keyPoints.map((p) => clean(p, 160)).filter(Boolean).slice(0, 3),
      sources: pickSources(s.sourceIds, sources),
    });
    if (steps.length >= range.max) break;
  }

  const resolve = (ref: string) => keyFor.get(clean(ref, 40).toLowerCase()) ?? keyFor.get(normalize(ref));
  const seen = new Set<string>();
  const links: GeneratedLink[] = [];
  for (const l of draft.links) {
    const from = resolve(l.from);
    const to = resolve(l.to);
    if (!from || !to || from === to || seen.has(`${from}>${to}`)) continue;
    seen.add(`${from}>${to}`);
    links.push({ from, to, label: clean(l.label, 32).toLowerCase() });
  }

  // Drop steps nothing connects to — they're usually facts, not stages.
  const connected = new Set(links.flatMap((l) => [l.from, l.to]));
  const kept = steps.length > 1 ? steps.filter((s) => connected.has(s.key)) : steps;

  if (kept.length < range.min) {
    return {
      ok: false as const,
      feedback:
        links.length === 0
          ? "The steps weren't connected. Every step needs links showing what flows between them, using the step keys."
          : `Only ${kept.length} connected, distinct steps were usable; at least ${range.min} are needed. Make sure each step is linked and titles don't repeat existing steps.`,
    };
  }

  return {
    ok: true as const,
    result: {
      title: clean(draft.title, 80),
      summary: clean(draft.summary, 600),
      steps: kept,
      links,
    } satisfies ResearchResult,
  };
}

/**
 * The same workflow serves the first flow and every step breakdown:
 * [plan → search →] generate → validate, retrying generation once if the
 * output isn't a usable flow. Keys live in the closure, never in graph state.
 */
export function buildResearchGraph({ ai, tavilyKey }: WorkflowDeps) {
  async function planner(state: State, config: LangGraphRunnableConfig): Promise<Partial<State>> {
    const { system, user } = plannerPrompt(state.request);
    const fallback = state.request.focus ? `how ${state.request.focus.title} works` : state.request.rootQuery;
    let planned: string[] = [];
    try {
      const plan = await invokeStructured(
        ai,
        "low",
        PlanSchema,
        "search_plan",
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        config,
      );
      planned = plan.searchQueries;
    } catch (err) {
      // A malformed plan isn't worth failing research over: search the question itself.
      if (!(err instanceof SyntaxError || err instanceof z.ZodError)) throw err;
    }
    const queries = [...new Set(planned.map((q) => q.trim()).filter(Boolean))].slice(0, LIMITS.searchQueries);
    return { searchQueries: queries.length ? queries : [fallback] };
  }

  async function search(state: State, config: LangGraphRunnableConfig): Promise<Partial<State>> {
    if (!tavilyKey) return { sources: [] };
    const sources = await searchWeb(state.searchQueries, tavilyKey, {
      maxPerQuery: 4,
      maxTotal: state.request.mode === "initial" ? 12 : 8,
      signal: config.signal,
    });
    return { sources };
  }

  async function generate(state: State, config: LangGraphRunnableConfig): Promise<Partial<State>> {
    const { system, user } = generatorPrompt(state.request, state.sources, state.feedback);
    try {
      const draft = await invokeStructured(
        ai,
        "medium",
        FlowSchema,
        "flow_diagram",
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        config,
      );
      return { draft, attempts: state.attempts + 1 };
    } catch (err) {
      // Malformed JSON is a validation problem worth one retry; API errors are not.
      if (err instanceof SyntaxError || err instanceof z.ZodError || (err as Error)?.name === "OutputParserException") {
        return { draft: null, attempts: state.attempts + 1, feedback: "The response was not valid JSON for the schema." };
      }
      throw err;
    }
  }

  function validate(state: State): Partial<State> {
    if (!state.draft) return { result: null };
    const outcome = validateFlow(state.draft, state.request, state.sources);
    return outcome.ok ? { result: outcome.result, feedback: null } : { result: null, feedback: outcome.feedback };
  }

  const afterStart = (state: State) => (state.request.useSearch && tavilyKey ? "planner" : "generate");
  const afterValidate = (state: State) =>
    state.result || state.attempts >= MAX_GENERATION_ATTEMPTS ? END : "generate";

  return new StateGraph(ResearchState)
    .addNode("planner", planner)
    .addNode("search", search)
    .addNode("generate", generate)
    .addNode("validate", validate)
    .addConditionalEdges(START, afterStart, ["planner", "generate"])
    .addEdge("planner", "search")
    .addEdge("search", "generate")
    .addEdge("generate", "validate")
    .addConditionalEdges("validate", afterValidate, ["generate", END])
    .compile();
}

export function initialState(request: ResearchRequest): State {
  return {
    request,
    searchQueries: [],
    sources: [],
    draft: null,
    attempts: 0,
    feedback: null,
    result: null,
  };
}

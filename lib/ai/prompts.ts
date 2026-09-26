import "server-only";
import type { ResearchRequest, ResearchSource } from "@/lib/types";

export const LIMITS = {
  initialSteps: { min: 4, max: 12 },
  expandSteps: { min: 2, max: 7 },
  searchQueries: 3,
};

export function plannerPrompt(req: ResearchRequest) {
  const system = `You choose web searches that help explain how something works, step by step.
Pick ${LIMITS.searchQueries} distinct search queries that would surface explanations of the mechanism, architecture, pipeline or lifecycle — official docs, engineering blogs, technical explainers. Avoid queries that only return definitions, news or product pages.`;

  const user =
    req.mode === "initial"
      ? `Question: ${req.rootQuery}`
      : `Overall question: ${req.rootQuery}
Step to break down: ${req.focus?.title} — ${req.focus?.summary}
Search for what happens inside this step specifically.`;

  return { system, user };
}

export function formatSources(sources: ResearchSource[]) {
  return sources
    .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet ?? "(no excerpt)"}`)
    .join("\n\n");
}

const FLOW_RULES = `You draw flow diagrams for Unfold, a canvas that shows how things work. The diagram is read top to bottom: it starts where the process starts (a trigger, input or request) and follows what happens, in order, until the result.

What a good flow looks like:
- Each step is a stage, component or actor that does something. Its title names it (1-4 words, e.g. "Prompt Template", "Retriever", "Token Sampling"). Never make a step out of a definition, history, pros/cons, use case or fun fact — if it doesn't do something in the flow, leave it out.
- Links carry the flow. Each link's label says what passes along it or when it's taken, in 1-3 lowercase words ("user question", "embeddings", "tool call", "if valid", "retry"). Every step must be connected.
- Order matters: list steps in the order the flow reaches them. Use branches for decisions or parallel paths, and a link back to an earlier step for loops (retries, agent loops, feedback). Most steps should have one clear way in and out.
- Kinds: "input" (where the flow starts), "process" (transforms or computes), "decision" (chooses a path; its outgoing links say which condition), "store" (database, cache, memory, index), "external" (outside service, API, user, model provider), "output" (final result).
- For "what is X" questions, still draw how X works or how it's used end to end.
- Explain like a strong engineer onboarding a colleague: concrete, specific names of real components, no filler.

Per step:
- summary: one sentence, under 30 words, saying what happens here and what it hands on.
- details: 40-100 words on how it works inside, with concrete specifics.
- keyPoints: 1-3 short bullets (under 16 words) — gotchas, key parameters, or why it matters.`;

const GROUNDING_WITH_SOURCES = `
Grounding:
- Prefer facts from the numbered sources and cite them in the step's sourceIds. Only cite a source that actually supports that step.
- You may fill gaps from general knowledge; leave sourceIds empty for those steps.
- Never invent URLs or source numbers.`;

const GROUNDING_WITHOUT_SOURCES = `
Grounding: there are no web sources for this request. Use well-established knowledge, stay concrete, and leave every sourceIds list empty.`;

export function generatorPrompt(req: ResearchRequest, sources: ResearchSource[], feedback?: string | null) {
  const range = req.mode === "initial" ? LIMITS.initialSteps : LIMITS.expandSteps;
  const system = FLOW_RULES + (sources.length ? GROUNDING_WITH_SOURCES : GROUNDING_WITHOUT_SOURCES);

  const task =
    req.mode === "initial"
      ? `Question: ${req.rootQuery}

Draw the end-to-end flow in ${range.min}-${range.max} steps. Give it a short title (2-6 words naming the subject, title case) and a 2-3 sentence summary of the flow as a whole.`
      : `Overall question: ${req.rootQuery}
Step to break down: "${req.focus?.title}" — ${req.focus?.summary}
It receives from: ${req.focus?.inputs.join(", ") || "(nothing — it's where the flow starts)"}
It hands off to: ${req.focus?.outputs.join(", ") || "(nothing — it's the end of the flow)"}

Draw the sub-flow inside "${req.focus?.title}" in ${range.min}-${range.max} steps: what happens from the moment it receives its input to the moment it hands off. Stay inside this step — don't redraw the surrounding flow.
These steps already exist on the canvas. Don't redraw them as new stages; only name one if the sub-flow hands data to or from it:
${(req.existingTitles ?? []).map((t) => `- ${t}`).join("\n") || "- (none)"}
For "title" give "Inside ${req.focus?.title}", and a one-sentence summary.`;

  const retry = feedback ? `\n\nYour previous answer was rejected: ${feedback} Fix this in the new answer.` : "";
  const sourceBlock = sources.length ? `Sources:\n\n${formatSources(sources)}\n\n` : "";

  return { system, user: `${sourceBlock}${task}${retry}` };
}

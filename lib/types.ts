export type NodeStatus = "idle" | "loading" | "complete" | "error";

/** What role a step plays in the flow; drives its icon and styling. */
export type StepKind = "input" | "process" | "decision" | "store" | "external" | "output";

export const STEP_KINDS: StepKind[] = ["input", "process", "decision", "store", "external", "output"];

export interface ResearchSource {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

interface BaseNode {
  id: string;
  /** Sub-steps point at the group that contains them. Top-level nodes: null. */
  parentId: string | null;
  /** Absolute for top-level nodes, relative to the group for sub-steps. */
  position: { x: number; y: number };
}

/** A stage or component in the flow. */
export interface StepNode extends BaseNode {
  type: "step";
  title: string;
  kind: StepKind;
  /** What happens at this step, in a sentence or two. */
  summary: string;
  details?: string;
  keyPoints?: string[];
  sources: ResearchSource[];
  status: NodeStatus;
  /** Id of the group holding this step's breakdown, once expanded. */
  subflowId?: string;
}

/** A container for the sub-flow that breaks one step down. */
export interface GroupNode extends BaseNode {
  type: "group";
  /** The step this group breaks down. */
  stepId: string;
  title: string;
  size: { width: number; height: number };
}

export type ResearchNode = StepNode | GroupNode;

export interface ResearchEdge {
  id: string;
  source: string;
  target: string;
  /** What passes between the two steps, e.g. "prompt", "tokens", "yes". */
  label?: string;
  /** "flow" = data/control flow; "breakdown" = step → its sub-flow group. */
  variant?: "flow" | "breakdown";
}

export type CanvasStatus = "pending" | "ready" | "error";

export interface ResearchCanvas {
  id: string;
  title: string;
  rootQuery: string;
  /** One-paragraph overview of the whole flow. */
  summary?: string;
  /** Ground generation in live web search (Tavily). */
  useSearch: boolean;
  nodes: ResearchNode[];
  edges: ResearchEdge[];
  status: CanvasStatus;
  error?: string;
  errorCode?: ErrorCode;
  createdAt: number;
  updatedAt: number;
  /** Bumped when the stored shape changes; older canvases can't be rendered. */
  version?: number;
}

export const CANVAS_VERSION = 2;

/* ---------- API contract ---------- */

export type ResearchMode = "initial" | "expand";

export interface ResearchRequest {
  mode: ResearchMode;
  /** The user's original question — always present so expansions stay on-topic. */
  rootQuery: string;
  useSearch: boolean;
  /** Expansion only: the step being broken down, with its place in the flow. */
  focus?: {
    title: string;
    summary: string;
    /** Steps feeding into / out of the focus, for context. */
    inputs: string[];
    outputs: string[];
  };
  /** Expansion only: step titles already on the canvas, to avoid repeats. */
  existingTitles?: string[];
}

export interface GeneratedStep {
  /** Model-assigned key, only meaningful within one result. */
  key: string;
  title: string;
  kind: StepKind;
  summary: string;
  details: string;
  keyPoints: string[];
  sources: ResearchSource[];
}

export interface GeneratedLink {
  from: string;
  to: string;
  label: string;
}

export interface ResearchResult {
  title: string;
  summary: string;
  steps: GeneratedStep[];
  links: GeneratedLink[];
}

export type ResearchStage = "planning" | "searching" | "generating" | "validating";

export type ResearchEvent =
  | { type: "stage"; stage: ResearchStage; detail?: string }
  | { type: "result"; result: ResearchResult }
  | { type: "error"; message: string; code?: ErrorCode };

export type ErrorCode = "auth" | "search_auth" | "rate_limit" | "timeout" | "invalid_output" | "unknown";

import type { GroupNode, ResearchCanvas, ResearchEdge, ResearchNode, StepNode } from "@/lib/types";

export type ExportSource = Pick<ResearchCanvas, "title" | "rootQuery" | "summary" | "nodes" | "edges">;

const isStep = (n: ResearchNode): n is StepNode => n.type === "step";
const isGroup = (n: ResearchNode): n is GroupNode => n.type === "group";
const flowEdges = (edges: ResearchEdge[]) => edges.filter((e) => e.variant !== "breakdown");

/**
 * Steps in the order the flow reaches them: a topological sort that breaks
 * ties (and loops) by on-canvas position, top to bottom then left to right.
 */
export function orderSteps(steps: StepNode[], edges: ResearchEdge[]): StepNode[] {
  const ids = new Set(steps.map((s) => s.id));
  const links = flowEdges(edges).filter((e) => ids.has(e.source) && ids.has(e.target));
  const indegree = new Map(steps.map((s) => [s.id, 0]));
  links.forEach((e) => indegree.set(e.target, indegree.get(e.target)! + 1));

  const byPosition = (a: StepNode, b: StepNode) => a.position.y - b.position.y || a.position.x - b.position.x;
  const remaining = [...steps].sort(byPosition);
  const ordered: StepNode[] = [];

  while (remaining.length) {
    // Prefer a step nothing still points at; in a loop, take the top-most one.
    const idx = Math.max(0, remaining.findIndex((s) => indegree.get(s.id) === 0));
    const [next] = remaining.splice(idx, 1);
    ordered.push(next);
    links.filter((e) => e.source === next.id).forEach((e) => indegree.set(e.target, indegree.get(e.target)! - 1));
  }
  return ordered;
}

export interface FlowTree {
  steps: StepNode[];
  /** Breakdown group for a step, with its own ordered steps. */
  subflows: Map<string, { group: GroupNode; steps: StepNode[] }>;
}

/** Top-level steps in order, plus each breakdown's steps in order. */
export function flowTree(nodes: ResearchNode[], edges: ResearchEdge[]): FlowTree {
  const steps = nodes.filter(isStep);
  const subflows = new Map<string, { group: GroupNode; steps: StepNode[] }>();
  for (const group of nodes.filter(isGroup)) {
    subflows.set(group.stepId, { group, steps: orderSteps(steps.filter((s) => s.parentId === group.id), edges) });
  }
  return { steps: orderSteps(steps.filter((s) => !s.parentId), edges), subflows };
}

export function neighbours(stepId: string, nodes: ResearchNode[], edges: ResearchEdge[]) {
  const title = (id: string) => nodes.find((n): n is StepNode => n.id === id && isStep(n))?.title;
  const fmt = (id: string, label?: string) => {
    const t = title(id);
    return t ? (label ? `${t} (${label})` : t) : null;
  };
  const flow = flowEdges(edges);
  return {
    inputs: flow.filter((e) => e.target === stepId).map((e) => fmt(e.source, e.label)).filter((x): x is string => !!x),
    outputs: flow.filter((e) => e.source === stepId).map((e) => fmt(e.target, e.label)).filter((x): x is string => !!x),
  };
}

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "unfold-flow"
  );
}

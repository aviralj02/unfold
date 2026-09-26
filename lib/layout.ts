import { Graph, layout } from "@dagrejs/dagre";
import { nanoid } from "nanoid";
import type { GroupNode, ResearchEdge, ResearchNode, ResearchResult, StepNode } from "@/lib/types";

/** Step cards render at exactly this size so layout estimates are exact. */
export const STEP_SIZE = { width: 260, height: 128 };
/** Inner padding of a sub-flow group; the top leaves room for its header. */
export const GROUP_PAD = { top: 52, side: 28, bottom: 28 };

type Point = { x: number; y: number };
type Box = Point & { width: number; height: number };

/* ---------- geometry ---------- */

export function absolutePosition(node: ResearchNode, all: ResearchNode[]): Point {
  if (!node.parentId) return node.position;
  const parent = all.find((n) => n.id === node.parentId);
  if (!parent) return node.position;
  const p = absolutePosition(parent, all);
  return { x: p.x + node.position.x, y: p.y + node.position.y };
}

function boxOf(node: ResearchNode, all: ResearchNode[]): Box {
  const size = node.type === "group" ? node.size : STEP_SIZE;
  return { ...absolutePosition(node, all), width: size.width, height: size.height };
}

function overlaps(a: Box, b: Box, gap = 40) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

/* ---------- dagre ---------- */

/** Top-to-bottom layered layout. Returns top-left positions and the overall size. */
function layered(ids: string[], links: { source: string; target: string }[]) {
  const g = new Graph();
  g.setGraph({ rankdir: "TB", nodesep: 56, ranksep: 76, marginx: 0, marginy: 0, ranker: "network-simplex" });
  g.setDefaultEdgeLabel(() => ({}));
  ids.forEach((id) => g.setNode(id, { width: STEP_SIZE.width, height: STEP_SIZE.height }));
  links.forEach((l) => g.setEdge(l.source, l.target));
  layout(g);

  const positions = new Map<string, Point>();
  let maxX = 0;
  let maxY = 0;
  for (const id of ids) {
    const n = g.node(id) as { x: number; y: number };
    const pos = { x: Math.round(n.x - STEP_SIZE.width / 2), y: Math.round(n.y - STEP_SIZE.height / 2) };
    positions.set(id, pos);
    maxX = Math.max(maxX, pos.x + STEP_SIZE.width);
    maxY = Math.max(maxY, pos.y + STEP_SIZE.height);
  }
  return { positions, width: maxX, height: maxY };
}

/* ---------- building from AI results ---------- */

function stepsFromResult(result: ResearchResult, parentId: string | null) {
  const idFor = new Map(result.steps.map((s) => [s.key, nanoid(10)]));
  const steps: StepNode[] = result.steps.map((s) => ({
    type: "step",
    id: idFor.get(s.key)!,
    parentId,
    title: s.title,
    kind: s.kind,
    summary: s.summary,
    details: s.details,
    keyPoints: s.keyPoints,
    sources: s.sources,
    status: "complete",
    position: { x: 0, y: 0 },
  }));
  const edges: ResearchEdge[] = result.links.map((l) => ({
    id: `e-${nanoid(8)}`,
    source: idFor.get(l.from)!,
    target: idFor.get(l.to)!,
    label: l.label || undefined,
    variant: "flow",
  }));
  return { steps, edges };
}

/** The first flow for a question, laid out top to bottom around the origin. */
export function buildInitialFlow(result: ResearchResult) {
  const { steps, edges } = stepsFromResult(result, null);
  const { positions, width } = layered(
    steps.map((s) => s.id),
    edges,
  );
  steps.forEach((s) => (s.position = { x: positions.get(s.id)!.x - width / 2, y: positions.get(s.id)!.y }));
  return { nodes: steps as ResearchNode[], edges };
}

/**
 * A step's breakdown: its sub-steps laid out inside a group, placed to the
 * right of the step and nudged until it doesn't overlap anything.
 */
export function buildSubflow(parent: StepNode, result: ResearchResult, existing: ResearchNode[]) {
  const groupId = nanoid(10);
  const { steps, edges } = stepsFromResult(result, groupId);
  const { positions, width, height } = layered(
    steps.map((s) => s.id),
    edges,
  );
  steps.forEach((s) => {
    const p = positions.get(s.id)!;
    s.position = { x: p.x + GROUP_PAD.side, y: p.y + GROUP_PAD.top };
  });
  const size = { width: width + GROUP_PAD.side * 2, height: height + GROUP_PAD.top + GROUP_PAD.bottom };

  const parentBox = boxOf(parent, existing);
  // Groups always live at the top level, so obstacles are top-level boxes.
  const obstacles = existing.filter((n) => !n.parentId).map((n) => boxOf(n, existing));
  const candidate: Box = { x: parentBox.x + parentBox.width + 110, y: parentBox.y - GROUP_PAD.top, ...size };
  for (let i = 0; i < 40 && obstacles.some((o) => overlaps(candidate, o)); i++) {
    // Alternate pushing right and down so the group stays near its step.
    if (i % 2 === 0) candidate.x += 160;
    else candidate.y += 120;
  }

  const group: GroupNode = {
    type: "group",
    id: groupId,
    parentId: null,
    stepId: parent.id,
    title: result.title || `Inside ${parent.title}`,
    size,
    position: { x: Math.round(candidate.x), y: Math.round(candidate.y) },
  };
  const breakdown: ResearchEdge = { id: `e-${nanoid(8)}`, source: parent.id, target: groupId, variant: "breakdown" };

  // React Flow needs a parent listed before its children.
  return { nodes: [group, ...steps] as ResearchNode[], edges: [breakdown, ...edges], group };
}

/** Re-runs the layered layout on the main flow and re-seats each sub-flow beside its step. */
export function tidyLayout(nodes: ResearchNode[], edges: ResearchEdge[]) {
  const top = nodes.filter((n): n is StepNode => n.type === "step" && !n.parentId);
  const topIds = new Set(top.map((n) => n.id));
  const { positions, width } = layered(
    top.map((n) => n.id),
    edges.filter((e) => e.variant !== "breakdown" && topIds.has(e.source) && topIds.has(e.target)),
  );

  let next: ResearchNode[] = nodes.map((n) =>
    topIds.has(n.id) ? { ...n, position: { x: positions.get(n.id)!.x - width / 2, y: positions.get(n.id)!.y } } : n,
  );

  // Place groups in the order their steps appear, each avoiding the ones before it.
  const groups = next.filter((n): n is GroupNode => n.type === "group");
  const placed: ResearchNode[] = next.filter((n) => n.type !== "group");
  for (const g of groups) {
    const step = next.find((n) => n.id === g.stepId);
    if (!step) {
      placed.push(g);
      continue;
    }
    const parentBox = boxOf(step, next);
    const candidate: Box = { x: parentBox.x + parentBox.width + 110, y: parentBox.y - GROUP_PAD.top, ...g.size };
    const obstacles = placed.filter((n) => !n.parentId).map((n) => boxOf(n, next));
    for (let i = 0; i < 40 && obstacles.some((o) => overlaps(candidate, o)); i++) {
      if (i % 2 === 0) candidate.x += 160;
      else candidate.y += 120;
    }
    const moved = { ...g, position: { x: Math.round(candidate.x), y: Math.round(candidate.y) } };
    placed.push(moved);
    next = next.map((n) => (n.id === g.id ? moved : n));
  }
  return next;
}

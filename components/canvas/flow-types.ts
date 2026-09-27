import type { Edge, Node } from "@xyflow/react";
import { STEP_SIZE } from "@/lib/layout";
import type { GroupNode, ResearchEdge, ResearchNode, StepNode } from "@/lib/types";

export type StepData = {
  node: StepNode;
  /** Seconds to wait before the entrance animation; only set for freshly added nodes. */
  enterDelay?: number;
};
export type GroupData = { node: GroupNode; enterDelay?: number };

export type FlowStep = Node<StepData, "step">;
export type FlowGroup = Node<GroupData, "group">;
export type FlowNode = FlowStep | FlowGroup;

export type RelationEdgeData = { label?: string; variant?: "flow" | "breakdown"; active?: boolean; fresh?: boolean };
export type FlowEdge = Edge<RelationEdgeData, "relation">;

export const isStep = (n: FlowNode): n is FlowStep => n.type === "step";

export function toFlowNodes(nodes: ResearchNode[], enter = false, baseDelay = 0.1): FlowNode[] {
  let i = 0;
  return nodes.map((n) => {
    const enterDelay = enter ? baseDelay + i++ * 0.06 : undefined;
    const common = { id: n.id, position: n.position, ...(n.parentId ? { parentId: n.parentId, extent: "parent" as const } : {}) };
    if (n.type === "group") {
      return {
        ...common,
        type: "group",
        data: { node: n, enterDelay },
        style: { width: n.size.width, height: n.size.height },
        selectable: false,
        focusable: false,
        zIndex: -1,
      } satisfies FlowGroup;
    }
    return {
      ...common,
      type: "step",
      data: { node: n, enterDelay },
      width: STEP_SIZE.width,
      height: STEP_SIZE.height,
    } satisfies FlowStep;
  });
}

export function toFlowEdges(edges: ResearchEdge[], fresh = false): FlowEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "relation",
    data: { label: e.label, variant: e.variant ?? "flow", fresh },
  }));
}

/** Strips transient UI state before persisting. */
export function toResearchNode(n: FlowNode): ResearchNode {
  const position = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
  if (n.type === "group") return { ...n.data.node, position };
  const status = n.data.node.status === "loading" || n.data.node.status === "error" ? "complete" : n.data.node.status;
  return { ...n.data.node, position, status };
}

export function toResearchEdge(e: FlowEdge): ResearchEdge {
  return { id: e.id, source: e.source, target: e.target, label: e.data?.label, variant: e.data?.variant };
}

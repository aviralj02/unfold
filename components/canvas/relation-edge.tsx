"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { FlowEdge } from "./flow-types";

type Box = { x: number; y: number; w: number; h: number };

function boxOf(n: InternalNode): Box {
  return {
    x: n.internals.positionAbsolute.x,
    y: n.internals.positionAbsolute.y,
    w: n.measured.width ?? 0,
    h: n.measured.height ?? 0,
  };
}

/** Where the line from this box's centre towards `target` leaves the box. */
function borderPoint(box: Box, target: { x: number; y: number }) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy, side: Position.Bottom };
  const sx = box.w / 2 / Math.abs(dx || 1e-6);
  const sy = box.h / 2 / Math.abs(dy || 1e-6);
  const s = Math.min(sx, sy);
  const side = sx < sy ? (dx > 0 ? Position.Right : Position.Left) : dy > 0 ? Position.Bottom : Position.Top;
  return { x: cx + dx * s, y: cy + dy * s, side };
}

/** Shared arrowhead markers; render once inside the canvas. */
export function ArrowDefs() {
  return (
    <svg className="pointer-events-none absolute h-0 w-0" aria-hidden>
      <defs>
        {[
          ["unfold-arrow", "var(--edge)"],
          ["unfold-arrow-active", "var(--brand)"],
        ].map(([id, color]) => (
          <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill={color} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

export const RelationEdge = memo(function RelationEdge({ id, source, target, data }: EdgeProps<FlowEdge>) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t || !s.measured.width || !t.measured.width) return null;

  const sb = boxOf(s);
  const tb = boxOf(t);
  const sp = borderPoint(sb, { x: tb.x + tb.w / 2, y: tb.y + tb.h / 2 });
  const tp = borderPoint(tb, { x: sb.x + sb.w / 2, y: sb.y + sb.h / 2 });

  const [path, labelX, labelY] = getBezierPath({
    sourceX: sp.x,
    sourceY: sp.y,
    sourcePosition: sp.side,
    targetX: tp.x,
    targetY: tp.y,
    targetPosition: tp.side,
    curvature: 0.25,
  });
  const length = Math.hypot(tp.x - sp.x, tp.y - sp.y) * 1.2;
  const active = data?.active;
  const breakdown = data?.variant === "breakdown";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#${active ? "unfold-arrow-active" : "unfold-arrow"})`}
        className={cn(data?.fresh && !breakdown && "edge-enter")}
        style={{
          stroke: active ? "var(--brand)" : "var(--edge)",
          strokeWidth: active ? 1.75 : 1.4,
          strokeDasharray: breakdown ? "5 5" : undefined,
          transition: "stroke 200ms",
          ["--edge-length" as string]: `${Math.ceil(length)}`,
        }}
      />
      {data?.label && !breakdown && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className={cn(
              "nodrag nopan pointer-events-none absolute max-w-40 truncate rounded-full border bg-canvas px-2 py-0.5 text-[10.5px] transition-colors",
              active ? "border-brand/40 text-brand" : "border-border text-muted-foreground",
            )}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export const edgeTypes = { relation: RelationEdge };

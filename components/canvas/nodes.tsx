"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Layers, Link2, Loader2, Minimize2, SquareSplitVertical } from "lucide-react";
import { KIND_META } from "@/lib/kinds";
import { STEP_SIZE } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { useCanvasActions } from "./canvas-context";
import type { FlowGroup, FlowStep } from "./flow-types";

/** Edges are drawn centre-to-border by the floating edge, so handles are invisible anchors. */
function HiddenHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} className="!pointer-events-none !opacity-0" />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!pointer-events-none !opacity-0" />
    </>
  );
}

function Enter({ delay, className, children }: { delay?: number; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (delay === undefined || reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export const StepCard = memo(function StepCard({ id, data, selected }: NodeProps<FlowStep>) {
  const { node, enterDelay } = data;
  const { explore } = useCanvasActions();
  const kind = KIND_META[node.kind] ?? KIND_META.process;
  const Icon = kind.icon;
  const loading = node.status === "loading";

  return (
    <Enter delay={enterDelay}>
      <HiddenHandles />
      <div
        style={{ width: STEP_SIZE.width, height: STEP_SIZE.height }}
        className={cn(
          "group/node relative flex flex-col overflow-hidden rounded-[14px] border bg-card px-3.5 pt-3 pb-2.5 shadow-[0_1px_2px_oklch(0_0_0/0.04),0_6px_16px_-10px_oklch(0.3_0.02_60/0.25)] transition-[border-color,box-shadow]",
          "hover:border-edge hover:shadow-[0_1px_2px_oklch(0_0_0/0.05),0_10px_24px_-12px_oklch(0.3_0.02_60/0.3)]",
          selected && "border-brand ring-3 ring-brand/15 hover:border-brand",
          loading && "border-brand/50",
        )}
      >
        {loading && <span className="pointer-events-none absolute inset-0 animate-pulse bg-brand-soft/50" aria-hidden />}

        <div className="relative flex items-center gap-2">
          <span
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase"
            style={{ background: kind.tint, color: kind.ink }}
          >
            <Icon className="size-3" />
            {kind.label}
          </span>
          {node.subflowId && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Has a breakdown">
              <Layers className="size-3" /> broken down
            </span>
          )}
        </div>

        <h3 className="relative mt-2 truncate text-[14.5px] leading-snug font-semibold tracking-tight">{node.title}</h3>
        <p className="relative mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{node.summary}</p>

        <div className="relative mt-auto flex h-6 items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {node.sources.length > 0 && (
              <span className="flex items-center gap-1" title="Retrieved web sources">
                <Link2 className="size-3" />
                {node.sources.length}
              </span>
            )}
            {loading && (
              <span className="flex items-center gap-1 font-medium text-brand" role="status">
                <Loader2 className="size-3 animate-spin" /> Breaking down…
              </span>
            )}
            {node.status === "error" && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="size-3" /> Breakdown failed
              </span>
            )}
          </div>
          {!loading && !node.subflowId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                explore(id);
              }}
              className={cn(
                "nodrag flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-brand opacity-0 outline-none transition-opacity hover:bg-brand-soft group-hover/node:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50",
                selected && "opacity-100",
              )}
              aria-label={`Break down ${node.title}`}
            >
              <SquareSplitVertical className="size-3" /> Break down
            </button>
          )}
        </div>
      </div>
    </Enter>
  );
});

export const GroupBox = memo(function GroupBox({ data }: NodeProps<FlowGroup>) {
  const { node, enterDelay } = data;
  const { removeSubflow } = useCanvasActions();

  return (
    <Enter delay={enterDelay} className="h-full w-full">
      <HiddenHandles />
      <div className="h-full w-full rounded-[20px] border border-dashed border-edge bg-card/40">
        <div className="flex h-11 items-center justify-between gap-2 px-4">
          <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <Layers className="size-3.5 shrink-0 text-brand" />
            <span className="truncate">{node.title}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeSubflow(node.id);
            }}
            className="nodrag flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Remove ${node.title}`}
            title="Remove this breakdown"
          >
            <Minimize2 className="size-3" /> Collapse
          </button>
        </div>
      </div>
    </Enter>
  );
});

export const nodeTypes = { step: StepCard, group: GroupBox };

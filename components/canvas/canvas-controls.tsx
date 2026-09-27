"use client";

import { useReactFlow, useViewport } from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function ControlButton({ label, shortcut, onClick, children }: { label: string; shortcut?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
        {shortcut && <span className="ml-2 text-background/60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col items-center gap-0.5 rounded-xl border bg-card p-1 shadow-sm">
      <ControlButton label="Zoom in" shortcut="+" onClick={() => zoomIn({ duration: 200 })}>
        <Plus />
      </ControlButton>
      <span className="py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums" aria-live="polite">
        {Math.round(zoom * 100)}%
      </span>
      <ControlButton label="Zoom out" shortcut="−" onClick={() => zoomOut({ duration: 200 })}>
        <Minus />
      </ControlButton>
      <div className="my-0.5 h-px w-5 bg-border" />
      <ControlButton label="Fit to view" shortcut="F" onClick={() => fitView({ duration: 500, padding: 0.15 })}>
        <Maximize />
      </ControlButton>
    </div>
  );
}

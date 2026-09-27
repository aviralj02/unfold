"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { InlineRename } from "@/components/canvas-actions";
import { SidebarToggle } from "@/components/sidebar-toggle";
import type { ResearchCanvas } from "@/lib/types";

export function WorkspaceHeader({
  canvas,
  children,
}: {
  canvas: Pick<ResearchCanvas, "id" | "title" | "rootQuery">;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const showQuery = canvas.rootQuery.trim().toLowerCase() !== canvas.title.trim().toLowerCase();

  return (
    <header className="z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
      <SidebarToggle />
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        {editing ? (
          <InlineRename canvas={canvas} onDone={() => setEditing(false)} className="h-8 max-w-md font-serif text-lg" />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="group flex min-w-0 items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            title="Rename canvas"
          >
            <h1 className="truncate font-serif text-[22px] leading-none tracking-tight">{canvas.title}</h1>
            <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
          </button>
        )}
        {showQuery && !editing && (
          <span className="hidden truncate text-[13px] text-muted-foreground md:inline">“{canvas.rootQuery}”</span>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}

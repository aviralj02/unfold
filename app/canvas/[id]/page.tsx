"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ResearchCanvasView } from "@/components/canvas/research-canvas";
import { Button } from "@/components/ui/button";
import { ResearchFailed } from "@/components/workspace/research-failed";
import { ResearchProgress } from "@/components/workspace/research-progress";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { startInitialResearch, useResearchProgress } from "@/lib/research-runner";
import { updateCanvas, useCanvases, useHydrated } from "@/lib/storage";
import { CANVAS_VERSION } from "@/lib/types";

export default function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const canvas = useCanvases().find((c) => c.id === id);
  const progress = useResearchProgress(id);
  const status = canvas?.status;

  useEffect(() => {
    if (status === "pending") startInitialResearch(id);
  }, [id, status]);

  if (!hydrated) return null;

  if (!canvas)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-serif text-3xl">Canvas not found</h1>
        <p className="text-sm text-muted-foreground">It may have been deleted, or it was saved in a different browser.</p>
        <Button render={<Link href="/" />} nativeButton={false} className="mt-2">
          Start new research
        </Button>
      </div>
    );

  // Canvases from the earlier concept-map format can't be drawn as flows.
  if (canvas.status === "ready" && canvas.version !== CANVAS_VERSION)
    return (
      <>
        <WorkspaceHeader canvas={canvas} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
          <h2 className="font-serif text-3xl">This canvas uses an older format</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            It was made before Unfold switched to flow diagrams. Regenerate it to see “{canvas.rootQuery}” as a flow.
          </p>
          <Button
            className="mt-2"
            onClick={() =>
              updateCanvas(canvas.id, {
                status: "pending",
                version: CANVAS_VERSION,
                useSearch: canvas.useSearch ?? false,
                nodes: [],
                edges: [],
                summary: undefined,
              })
            }
          >
            Regenerate as a flow
          </Button>
        </div>
      </>
    );

  if (canvas.status === "ready") return <ResearchCanvasView key={canvas.id} canvas={canvas} />;

  return (
    <>
      <WorkspaceHeader canvas={canvas} />
      {canvas.status === "pending" ? (
        <ResearchProgress query={canvas.rootQuery} progress={progress} useSearch={!!canvas.useSearch} />
      ) : (
        <ResearchFailed key={canvas.updatedAt} canvas={canvas} />
      )}
    </>
  );
}

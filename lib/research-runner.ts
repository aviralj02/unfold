"use client";

import { useSyncExternalStore } from "react";
import { buildInitialFlow } from "@/lib/layout";
import { ResearchError, runResearch } from "@/lib/research-client";
import { getCanvas, updateCanvas } from "@/lib/storage";
import { CANVAS_VERSION, type ResearchStage } from "@/lib/types";

export interface Progress {
  stage: ResearchStage;
  detail?: string;
  startedAt: number;
}

/**
 * Initial research runs outside any component so it survives navigation:
 * start a canvas, open another one, and the first still finishes and saves.
 */
const inflight = new Map<string, Progress>();
const listeners = new Set<() => void>();
let runningIds: ReadonlySet<string> = new Set();
const emit = () => {
  runningIds = new Set(inflight.keys());
  listeners.forEach((l) => l());
};

export function startInitialResearch(canvasId: string) {
  const canvas = getCanvas(canvasId);
  if (!canvas || canvas.status !== "pending" || inflight.has(canvasId)) return;

  inflight.set(canvasId, { stage: canvas.useSearch ? "planning" : "generating", startedAt: Date.now() });
  emit();

  runResearch(
    { mode: "initial", rootQuery: canvas.rootQuery, useSearch: canvas.useSearch },
    {
      onStage: (stage, detail) => {
        const prev = inflight.get(canvasId);
        if (!prev) return;
        inflight.set(canvasId, { ...prev, stage, detail: detail ?? (prev.stage === stage ? prev.detail : undefined) });
        emit();
      },
    },
  )
    .then((result) => {
      if (!getCanvas(canvasId)) return; // deleted while researching
      const { nodes, edges } = buildInitialFlow(result);
      const saved = updateCanvas(canvasId, {
        status: "ready",
        title: result.title || canvas.title,
        summary: result.summary,
        version: CANVAS_VERSION,
        nodes,
        edges,
        error: undefined,
        errorCode: undefined,
      });
      if (!saved) {
        updateCanvas(canvasId, {
          status: "error",
          error: "The flow was generated but couldn't be saved — browser storage is full. Delete an old canvas and retry.",
        });
      }
    })
    .catch((err: unknown) => {
      if (!getCanvas(canvasId)) return;
      const e = err instanceof ResearchError ? err : new ResearchError("Something went wrong. Please retry.");
      updateCanvas(canvasId, { status: "error", error: e.message, errorCode: e.code });
    })
    .finally(() => {
      inflight.delete(canvasId);
      emit();
    });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const EMPTY: ReadonlySet<string> = new Set();

/** Ids of canvases whose initial research is running in this tab. */
export function useRunningResearch(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => runningIds,
    () => EMPTY,
  );
}

export function useResearchProgress(canvasId: string): Progress | null {
  return useSyncExternalStore(
    subscribe,
    () => inflight.get(canvasId) ?? null,
    () => null,
  );
}

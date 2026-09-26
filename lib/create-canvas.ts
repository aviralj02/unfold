"use client";

import { nanoid } from "nanoid";
import { upsertCanvas } from "@/lib/storage";
import { CANVAS_VERSION, type ResearchCanvas } from "@/lib/types";

/** Creates a pending canvas; the workspace starts research when it opens it. */
export function createPendingCanvas(query: string, useSearch = false): ResearchCanvas | null {
  const q = query.trim().replace(/\s+/g, " ");
  const now = Date.now();
  const canvas: ResearchCanvas = {
    id: nanoid(12),
    title: q.length > 60 ? `${q.slice(0, 57)}…` : q,
    rootQuery: q,
    useSearch,
    version: CANVAS_VERSION,
    nodes: [],
    edges: [],
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  return upsertCanvas(canvas) ? canvas : null;
}

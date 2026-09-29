"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { AnimatePresence } from "framer-motion";
import { Check, ChevronDown, CloudOff, Loader2, Save, Workflow } from "lucide-react";
import { toast } from "sonner";
import { useAppConfig } from "@/components/key-gate";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { buildSubflow, tidyLayout } from "@/lib/layout";
import { ResearchError, runResearch } from "@/lib/research-client";
import { updateCanvas } from "@/lib/storage";
import type { ResearchCanvas, StepNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CanvasActionsContext } from "./canvas-context";
import { CanvasControls } from "./canvas-controls";
import { DetailPanel, type Neighbour } from "./detail-panel";
import {
  isStep,
  toFlowEdges,
  toFlowNodes,
  toResearchEdge,
  toResearchNode,
  type FlowEdge,
  type FlowNode,
  type FlowStep,
} from "./flow-types";
import { nodeTypes } from "./nodes";
import { ExportMenu } from "./export-menu";
import { ArrowDefs, edgeTypes } from "./relation-edge";

type SaveState = "saved" | "saving" | "error";

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export function ResearchCanvasView({ canvas }: { canvas: ResearchCanvas }) {
  return (
    <ReactFlowProvider>
      <CanvasInner canvas={canvas} />
    </ReactFlowProvider>
  );
}

function CanvasInner({ canvas }: { canvas: ResearchCanvas }) {
  const { openSettings } = useAppConfig();
  const rf = useReactFlow<FlowNode, FlowEdge>();

  // A canvas generated moments ago animates in; one reopened from storage appears at rest.
  const [isFresh] = useState(() => Date.now() - canvas.updatedAt < 4000 && canvas.nodes.length > 0);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(toFlowNodes(canvas.nodes, isFresh));
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(toFlowEdges(canvas.edges, isFresh));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const controllers = useRef(new Map<string, AbortController>());
  const exploreRef = useRef<(id: string) => void>(() => {});

  /* ---------- persistence ---------- */

  const snapshot = useMemo(
    () => JSON.stringify({ nodes: nodes.map(toResearchNode), edges: edges.map(toResearchEdge) }),
    [nodes, edges],
  );
  const lastSaved = useRef(snapshot); // opening a canvas shouldn't count as a change

  const saveNow = useCallback(
    (data = snapshot) => {
      const parsed = JSON.parse(data) as Pick<ResearchCanvas, "nodes" | "edges">;
      const ok = updateCanvas(canvas.id, parsed);
      if (ok) lastSaved.current = data;
      setSaveState(ok ? "saved" : "error");
      if (!ok) toast.error("Couldn't save — browser storage is unavailable or full.", { id: "save-error" });
      return ok;
    },
    [canvas.id, snapshot],
  );

  useEffect(() => {
    if (snapshot === lastSaved.current) return;
    setSaveState("saving");
    const t = setTimeout(() => saveNow(snapshot), 600);
    return () => clearTimeout(t);
  }, [snapshot, saveNow]);

  useEffect(() => {
    const map = controllers.current;
    return () => map.forEach((c) => c.abort());
  }, []);

  /* ---------- helpers ---------- */

  const patchStep = useCallback(
    (id: string, patch: Partial<StepNode>) =>
      setNodes((ns) =>
        ns.map((n) => (n.id === id && isStep(n) ? { ...n, data: { ...n.data, node: { ...n.data.node, ...patch } } } : n)),
      ),
    [setNodes],
  );

  /** Steps feeding into / out of a step along flow edges. */
  const neighbours = useCallback((id: string, list: FlowNode[], links: FlowEdge[]) => {
    const title = (nid: string) => list.find((n) => n.id === nid && isStep(n))?.data.node.title;
    const flow = links.filter((e) => e.data?.variant !== "breakdown");
    const map = (e: FlowEdge, other: string): Neighbour | null => {
      const t = title(other);
      return t ? { id: other, title: t, label: e.data?.label } : null;
    };
    return {
      inputs: flow.filter((e) => e.target === id).map((e) => map(e, e.source)).filter((n): n is Neighbour => !!n),
      outputs: flow.filter((e) => e.source === id).map((e) => map(e, e.target)).filter((n): n is Neighbour => !!n),
    };
  }, []);

  const focusNodes = useCallback(
    (ids: string[], maxZoom = 1) =>
      requestAnimationFrame(() =>
        setTimeout(() => rf.fitView({ nodes: ids.map((id) => ({ id })), duration: 650, padding: 0.2, maxZoom }), 60),
      ),
    [rf],
  );

  /* ---------- break a step down ---------- */

  const explore = useCallback(
    async (id: string) => {
      const target = rf.getNode(id);
      if (!target || !isStep(target) || target.data.node.status === "loading" || target.data.node.subflowId) return;

      patchStep(id, { status: "loading" });
      const controller = new AbortController();
      controllers.current.set(id, controller);

      try {
        const all = rf.getNodes();
        const { inputs, outputs } = neighbours(id, all, rf.getEdges());
        const result = await runResearch(
          {
            mode: "expand",
            rootQuery: canvas.rootQuery,
            useSearch: canvas.useSearch,
            focus: {
              title: target.data.node.title,
              summary: target.data.node.summary,
              inputs: inputs.map((n) => n.title),
              outputs: outputs.map((n) => n.title),
            },
            existingTitles: all.filter(isStep).map((n) => n.data.node.title),
          },
          { signal: controller.signal },
        );

        const current = rf.getNodes();
        const parent = current.find((n): n is FlowStep => n.id === id && isStep(n));
        if (!parent) return; // removed meanwhile
        const researchNodes = current.map(toResearchNode);
        const sub = buildSubflow(toResearchNode(parent) as StepNode, result, researchNodes);

        setNodes((ns) => [
          ...ns.map((n) =>
            n.id === id && isStep(n)
              ? { ...n, data: { ...n.data, node: { ...n.data.node, status: "complete" as const, subflowId: sub.group.id } } }
              : n,
          ),
          ...toFlowNodes(sub.nodes, true, 0.05),
        ]);
        setEdges((es) => [...es, ...toFlowEdges(sub.edges, true)]);
        focusNodes([id, sub.group.id]);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        patchStep(id, { status: "error" });
        const e = err instanceof ResearchError ? err : new ResearchError("Couldn't break this step down.");
        toast.error(`Couldn't break down “${target.data.node.title}”`, {
          description: e.message,
          action:
            e.code === "auth"
              ? { label: "Settings", onClick: openSettings }
              : { label: "Retry", onClick: () => exploreRef.current(id) },
        });
      } finally {
        controllers.current.delete(id);
      }
    },
    [rf, canvas.rootQuery, canvas.useSearch, neighbours, patchStep, setNodes, setEdges, focusNodes, openSettings],
  );

  useEffect(() => {
    exploreRef.current = explore;
  }, [explore]);

  /* ---------- collapse a breakdown ---------- */

  const removeSubflow = useCallback(
    (groupId: string) => {
      const all = rf.getNodes();
      const removed = new Set<string>();
      const collect = (gid: string) => {
        removed.add(gid);
        for (const n of all) {
          if (n.parentId !== gid) continue;
          removed.add(n.id);
          if (isStep(n) && n.data.node.subflowId) collect(n.data.node.subflowId);
        }
      };
      collect(groupId);
      const group = all.find((n) => n.id === groupId);
      const stepId = group && !isStep(group) ? group.data.node.stepId : null;

      setNodes((ns) =>
        ns
          .filter((n) => !removed.has(n.id))
          .map((n) =>
            n.id === stepId && isStep(n) ? { ...n, data: { ...n.data, node: { ...n.data.node, subflowId: undefined } } } : n,
          ),
      );
      setEdges((es) => es.filter((e) => !removed.has(e.source) && !removed.has(e.target)));
      if (selectedId && removed.has(selectedId)) setSelectedId(null);
    },
    [rf, setNodes, setEdges, selectedId],
  );

  const actions = useMemo(() => ({ explore, removeSubflow }), [explore, removeSubflow]);

  /* ---------- tidy ---------- */

  const tidy = useCallback(() => {
    const laidOut = tidyLayout(rf.getNodes().map(toResearchNode), rf.getEdges().map(toResearchEdge));
    const pos = new Map(laidOut.map((n) => [n.id, n.position]));
    setNodes((ns) => ns.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })));
    requestAnimationFrame(() => setTimeout(() => rf.fitView({ duration: 600, padding: 0.12, maxZoom: 1 }), 60));
  }, [rf, setNodes]);

  /* ---------- selection ---------- */

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams<FlowNode>) => {
    const steps = sel.filter(isStep);
    setSelectedId(steps.length === 1 ? steps[0].id : null);
  }, []);

  const selectNode = useCallback(
    (id: string) => {
      setNodes((ns) => ns.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })));
      const internal = rf.getInternalNode(id);
      if (internal) {
        const { x, y } = internal.internals.positionAbsolute;
        rf.setCenter(x + (internal.measured.width ?? 0) / 2 + 200, y + (internal.measured.height ?? 0) / 2, {
          zoom: Math.max(rf.getZoom(), 0.8),
          duration: 450,
        });
      }
    },
    [rf, setNodes],
  );

  const clearSelection = useCallback(
    () => setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n))),
    [setNodes],
  );

  const selected = nodes.find((n): n is FlowStep => n.id === selectedId && isStep(n));
  const selectedLinks = selected ? neighbours(selected.id, nodes, edges) : null;
  const selectedGroup = selected?.parentId ? nodes.find((n) => n.id === selected.parentId) : undefined;

  // Highlight the selected step's connections.
  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const active = !!selectedId && (e.source === selectedId || e.target === selectedId);
        return e.data?.active === active ? e : { ...e, data: { ...e.data, active } };
      }),
    [edges, selectedId],
  );

  /* ---------- keyboard ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (saveNow()) toast.success("Canvas saved", { id: "saved" });
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape" && selectedId) clearSelection();
      else if (e.key === "f" || e.key === "F") rf.fitView({ duration: 500, padding: 0.12 });
      else if (e.key === "+" || e.key === "=") rf.zoomIn({ duration: 200 });
      else if (e.key === "-" || e.key === "_") rf.zoomOut({ duration: 200 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rf, saveNow, selectedId, clearSelection]);

  return (
    <CanvasActionsContext.Provider value={actions}>
      <WorkspaceHeader canvas={canvas}>
        <SaveIndicator state={saveState} />
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="sm" className="gap-1.5" onClick={tidy} />}>
            <Workflow /> Tidy layout
          </TooltipTrigger>
          <TooltipContent side="bottom">Re-arrange the flow top to bottom</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-card"
                onClick={() => saveNow() && toast.success("Canvas saved", { id: "saved" })}
              />
            }
          >
            <Save /> Save
          </TooltipTrigger>
          <TooltipContent side="bottom">Ctrl / ⌘ + S</TooltipContent>
        </Tooltip>
        <ExportMenu
          meta={{ title: canvas.title, rootQuery: canvas.rootQuery, summary: canvas.summary }}
          onBeforeImage={clearSelection}
        />
      </WorkspaceHeader>

      <div className="relative flex-1">
        <ReactFlow<FlowNode, FlowEdge>
          nodes={nodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
          minZoom={0.1}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
          aria-label="Flow canvas"
        >
          {/* Inside the viewport so image exports include the arrowheads. */}
          <ViewportPortal>
            <ArrowDefs />
          </ViewportPortal>
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--edge)" />
          <MiniMap
            pannable
            zoomable
            ariaLabel="Canvas overview"
            nodeBorderRadius={8}
            nodeColor={(n) =>
              n.type === "group" ? "oklch(0.93 0.008 80)" : n.id === selectedId ? "var(--brand)" : "var(--edge)"
            }
            className="!rounded-xl !border !shadow-sm transition-[right] duration-300"
            style={{ right: selected ? 412 : 0, width: 168, height: 112 }}
          />
          <CanvasControls />
        </ReactFlow>

        {canvas.summary && !selected && <Overview title={canvas.title} summary={canvas.summary} />}

        <AnimatePresence>
          {selected && selectedLinks && (
            <DetailPanel
              key="panel"
              node={selected.data.node}
              inputs={selectedLinks.inputs}
              outputs={selectedLinks.outputs}
              groupTitle={selectedGroup && !isStep(selectedGroup) ? selectedGroup.data.node.title : undefined}
              onSelect={selectNode}
              onExplore={() => explore(selected.id)}
              onShowSubflow={() => selected.data.node.subflowId && focusNodes([selected.data.node.subflowId], 1.1)}
              onClose={clearSelection}
            />
          )}
        </AnimatePresence>
      </div>
    </CanvasActionsContext.Provider>
  );
}

function Overview({ title, summary }: { title: string; summary: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="absolute top-3 left-3 z-10 w-[320px] max-w-[calc(100%-24px)] rounded-xl border bg-card/95 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-expanded={open}
      >
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Overview</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <div className="px-4 pb-3.5">
          <p className="text-[13px] leading-relaxed text-foreground/85">{summary}</p>
          <p className="mt-2.5 text-[11.5px] text-muted-foreground">
            Select a step for details · <span className="text-foreground">Break down</span> to see inside it
          </p>
        </div>
      )}
      <span className="sr-only">{title}</span>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" role="status">
      {state === "saving" && (
        <>
          <Loader2 className="size-3 animate-spin" /> Saving…
        </>
      )}
      {state === "saved" && (
        <>
          <Check className="size-3" /> Saved locally
        </>
      )}
      {state === "error" && (
        <span className="flex items-center gap-1.5 text-destructive">
          <CloudOff className="size-3" /> Not saved
        </span>
      )}
    </span>
  );
}

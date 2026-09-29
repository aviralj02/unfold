"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Download, FileText, Image as ImageIcon, Loader2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { slugify, type ExportSource } from "@/lib/export/flow";
import { toMarkdown } from "@/lib/export/markdown";
import { toMermaid } from "@/lib/export/mermaid";
import { downloadText, downloadUrl, renderFlowPng } from "@/lib/export/png";
import { toResearchEdge, toResearchNode, type FlowEdge, type FlowNode } from "./flow-types";

type Meta = Pick<ExportSource, "title" | "rootQuery" | "summary">;

export function ExportMenu({ meta, onBeforeImage }: { meta: Meta; onBeforeImage?: () => void }) {
  const rf = useReactFlow<FlowNode, FlowEdge>();
  const [busy, setBusy] = useState(false);

  const source = (): ExportSource => ({
    ...meta,
    nodes: rf.getNodes().map(toResearchNode),
    edges: rf.getEdges().map(toResearchEdge),
  });
  const filename = slugify(meta.title);

  async function exportImage() {
    const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewport) return;
    setBusy(true);
    onBeforeImage?.(); // clear selection so highlights don't end up in the image
    try {
      // Let the deselect render before capturing.
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));
      const png = await renderFlowPng(viewport, rf.getNodesBounds(rf.getNodes()), meta.title);
      downloadUrl(png, `${filename}.png`);
      toast.success("Image downloaded");
    } catch {
      toast.error("Couldn't create the image. Try zooming out or collapsing a breakdown, then retry.");
    } finally {
      setBusy(false);
    }
  }

  async function copyMermaid() {
    try {
      await navigator.clipboard.writeText(toMermaid(source()));
      toast.success("Mermaid copied", { description: "Paste it into GitHub, Notion, Obsidian or mermaid.live." });
    } catch {
      toast.error("Couldn't access the clipboard. Allow clipboard access and retry.");
    }
  }

  function exportMarkdown() {
    downloadText(toMarkdown(source()), `${filename}.md`);
    toast.success("Markdown downloaded");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5 bg-card" disabled={busy} />}>
        {busy ? <Loader2 className="animate-spin" /> : <Download />} Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={exportImage}>
          <ImageIcon />
          <span className="flex flex-col">
            <span>Download image</span>
            <span className="text-xs text-muted-foreground">PNG of the whole flow</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyMermaid}>
          <Workflow />
          <span className="flex flex-col">
            <span>Copy as Mermaid</span>
            <span className="text-xs text-muted-foreground">Editable diagram for docs</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportMarkdown}>
          <FileText />
          <span className="flex flex-col">
            <span>Download Markdown</span>
            <span className="text-xs text-muted-foreground">Diagram plus every step&apos;s details</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

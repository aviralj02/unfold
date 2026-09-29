import type { StepKind, StepNode } from "@/lib/types";
import { flowTree, type ExportSource } from "./flow";

/** Mermaid node shape per step kind. */
const SHAPE: Record<StepKind, [string, string]> = {
  input: ["([", "])"],
  output: ["([", "])"],
  decision: ["{", "}"],
  store: ["[(", ")]"],
  external: ["[[", "]]"],
  process: ["[", "]"],
};

/** Mermaid breaks on quotes and some brackets inside labels; use its entity codes. */
const esc = (text: string) => text.replace(/"/g, "#quot;").replace(/\n/g, " ").trim();

/** The flow as a Mermaid flowchart: top to bottom, breakdowns as subgraphs. */
export function toMermaid({ nodes, edges }: ExportSource): string {
  const { steps, subflows } = flowTree(nodes, edges);
  const ids = new Map<string, string>();
  const idOf = (id: string) => {
    if (!ids.has(id)) ids.set(id, `${nodes.find((n) => n.id === id)?.type === "group" ? "g" : "s"}${ids.size + 1}`);
    return ids.get(id)!;
  };

  const lines = ["flowchart TD"];
  const declare = (s: StepNode, indent: string) => {
    const [open, close] = SHAPE[s.kind] ?? SHAPE.process;
    lines.push(`${indent}${idOf(s.id)}${open}"${esc(s.title)}"${close}:::${s.kind}`);
  };

  steps.forEach((s) => declare(s, "  "));
  for (const { group, steps: inner } of subflows.values()) {
    lines.push(`  subgraph ${idOf(group.id)}["${esc(group.title)}"]`, "    direction TB");
    inner.forEach((s) => declare(s, "    "));
    lines.push("  end", `  style ${idOf(group.id)} fill:#faf9f6,stroke:#bcb6af,stroke-dasharray:5 5,color:#69625d`);
  }

  lines.push("");
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    if (e.variant === "breakdown") lines.push(`  ${idOf(e.source)} -.-> ${idOf(e.target)}`);
    else lines.push(`  ${idOf(e.source)} -->${e.label ? `|"${esc(e.label)}"|` : ""} ${idOf(e.target)}`);
  }

  // Muted tints that match the canvas.
  lines.push(
    "",
    "  classDef input fill:#ffeadc,stroke:#c26030,color:#201b16",
    "  classDef process fill:#ffffff,stroke:#bcb6af,color:#201b16",
    "  classDef decision fill:#fbf1d9,stroke:#b08a2e,color:#201b16",
    "  classDef store fill:#e3f1f4,stroke:#4f8a99,color:#201b16",
    "  classDef external fill:#e9ebfb,stroke:#5a64b0,color:#201b16",
    "  classDef output fill:#e2f4e6,stroke:#3d8a52,color:#201b16",
  );
  return lines.join("\n");
}

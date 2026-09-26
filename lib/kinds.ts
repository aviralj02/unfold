import { Cog, Database, Flag, GitFork, Globe, Play, type LucideIcon } from "lucide-react";
import type { StepKind } from "@/lib/types";

/** Icon, label and tint for each kind of step. Tints are low-chroma so the canvas stays calm. */
export const KIND_META: Record<StepKind, { label: string; icon: LucideIcon; tint: string; ink: string }> = {
  input: { label: "Start", icon: Play, tint: "oklch(0.95 0.035 45)", ink: "oklch(0.52 0.13 45)" },
  process: { label: "Step", icon: Cog, tint: "oklch(0.95 0.006 80)", ink: "oklch(0.42 0.012 60)" },
  decision: { label: "Decision", icon: GitFork, tint: "oklch(0.95 0.04 85)", ink: "oklch(0.5 0.1 75)" },
  store: { label: "Store", icon: Database, tint: "oklch(0.95 0.025 200)", ink: "oklch(0.46 0.07 210)" },
  external: { label: "External", icon: Globe, tint: "oklch(0.95 0.025 270)", ink: "oklch(0.48 0.08 275)" },
  output: { label: "Result", icon: Flag, tint: "oklch(0.95 0.035 150)", ink: "oklch(0.45 0.09 150)" },
};

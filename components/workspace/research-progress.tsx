"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type { Progress } from "@/lib/research-runner";
import type { ResearchStage } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_STAGES: { id: ResearchStage; label: string; hint: string; searchOnly?: boolean }[] = [
  { id: "planning", label: "Planning searches", hint: "Picking what to look up", searchOnly: true },
  { id: "searching", label: "Searching the web", hint: "Collecting sources", searchOnly: true },
  { id: "generating", label: "Drawing the flow", hint: "Working out each step and what passes between them" },
  { id: "validating", label: "Checking the flow", hint: "Making sure every step is connected" },
];

export function ResearchProgress({
  query,
  progress,
  useSearch,
}: {
  query: string;
  progress: Progress | null;
  useSearch: boolean;
}) {
  const STAGES = ALL_STAGES.filter((s) => useSearch || !s.searchOnly);
  const activeIndex = progress ? Math.max(0, STAGES.findIndex((s) => s.id === progress.stage)) : 0;
  const elapsed = useElapsed(progress?.startedAt);

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-canvas">
      <div
        className="absolute inset-0 opacity-70"
        style={{ backgroundImage: "radial-gradient(var(--edge) 1.1px, transparent 1.1px)", backgroundSize: "22px 22px" }}
        aria-hidden
      />
      <GhostMap />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-2xl border bg-card p-7 shadow-[0_24px_48px_-24px_oklch(0.25_0.02_60/0.3)]"
        role="status"
        aria-live="polite"
      >
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Researching</p>
        <h2 className="mt-1.5 font-serif text-[28px] leading-[1.1] tracking-tight">{query}</h2>

        <ol className="mt-6 flex flex-col gap-3.5">
          {STAGES.map((s, i) => {
            const done = i < activeIndex;
            const active = i === activeIndex;
            return (
              <li key={s.id} className="flex gap-3">
                <span
                  className={cn(
                    "mt-px flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors",
                    done && "border-brand bg-brand text-brand-foreground",
                    active && "border-brand text-brand",
                    !done && !active && "text-muted-foreground/60",
                  )}
                >
                  {done ? <Check className="size-3" /> : active ? <Loader2 className="size-3 animate-spin" /> : i + 1}
                </span>
                <span className="flex flex-col">
                  <span className={cn("text-sm", active ? "font-medium" : done ? "text-foreground/80" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                  {active && (
                    <motion.span
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-xs text-muted-foreground"
                    >
                      {progress?.detail ?? s.hint}
                    </motion.span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
          {useSearch ? "Usually takes 20–60 seconds" : "Usually takes 10–40 seconds"}{elapsed >= 5 ? ` · ${elapsed}s so far` : ""}. You can leave this page — research
          keeps going and the canvas saves when it&apos;s ready.
        </p>
      </motion.div>
    </div>
  );
}

function useElapsed(startedAt?: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}

/** Placeholder cards that breathe behind the progress card. */
function GhostMap() {
  const spots = [
    { x: "14%", y: "18%" },
    { x: "74%", y: "14%" },
    { x: "8%", y: "62%" },
    { x: "80%", y: "58%" },
    { x: "30%", y: "82%" },
    { x: "62%", y: "84%" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {spots.map((s, i) => (
        <motion.div
          key={i}
          className="absolute h-24 w-52 rounded-[14px] border bg-card/70"
          style={{ left: s.x, top: s.y }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        >
          <div className="m-4 h-2.5 w-24 rounded-full bg-muted" />
          <div className="mx-4 h-2 w-36 rounded-full bg-muted/70" />
          <div className="mx-4 mt-1.5 h-2 w-28 rounded-full bg-muted/70" />
        </motion.div>
      ))}
    </div>
  );
}

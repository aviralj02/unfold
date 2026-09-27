"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, Globe, Info, Layers, Loader2, SquareSplitVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KIND_META } from "@/lib/kinds";
import type { StepNode } from "@/lib/types";

export interface Neighbour {
  id: string;
  title: string;
  label?: string;
}

export function DetailPanel({
  node,
  inputs,
  outputs,
  groupTitle,
  onSelect,
  onExplore,
  onShowSubflow,
  onClose,
}: {
  node: StepNode;
  inputs: Neighbour[];
  outputs: Neighbour[];
  /** Set when this step sits inside a breakdown. */
  groupTitle?: string;
  onSelect: (id: string) => void;
  onExplore: () => void;
  onShowSubflow: () => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const loading = node.status === "loading";
  const kind = KIND_META[node.kind] ?? KIND_META.process;
  const Icon = kind.icon;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [node.id]);

  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="absolute top-3 right-3 bottom-3 z-10 flex w-[400px] max-w-[calc(100%-24px)] flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_24px_48px_-24px_oklch(0.25_0.02_60/0.35)]"
      aria-label={`Details for ${node.title}`}
    >
      <div className="flex items-start justify-between gap-3 px-6 pt-5">
        <span className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
          <span
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase"
            style={{ background: kind.tint, color: kind.ink }}
          >
            <Icon className="size-3" /> {kind.label}
          </span>
          {groupTitle && <span className="truncate">in {groupTitle.replace(/^Inside /, "")}</span>}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details" className="-mr-2">
          <X />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-6">
        <h2 className="mt-1 font-serif text-[32px] leading-[1.05] tracking-tight">{node.title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed">{node.summary}</p>

        {(inputs.length > 0 || outputs.length > 0) && (
          <section className="mt-5 grid gap-2 rounded-xl border bg-background/60 p-3" aria-label="Connections">
            <FlowList icon={ArrowDownToLine} label="Receives" items={inputs} empty="Flow starts here" onSelect={onSelect} />
            <div className="h-px bg-border" />
            <FlowList icon={ArrowUpFromLine} label="Hands off" items={outputs} empty="Flow ends here" onSelect={onSelect} />
          </section>
        )}

        {node.details && (
          <section className="mt-6" aria-labelledby="how-heading">
            <h3 id="how-heading" className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              How it works
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/85">{node.details}</p>
          </section>
        )}

        {node.keyPoints && node.keyPoints.length > 0 && (
          <section className="mt-6" aria-labelledby="points-heading">
            <h3 id="points-heading" className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Key points
            </h3>
            <ul className="mt-2.5 flex flex-col gap-2">
              {node.keyPoints.map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </section>
        )}

        {node.sources.length > 0 && (
          <section className="mt-7" aria-labelledby="sources-heading">
            <h3 id="sources-heading" className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Globe className="size-3" /> Web sources · {node.sources.length}
            </h3>
            <ul className="mt-2.5 flex flex-col gap-2">
              {node.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="group block rounded-xl border bg-background/60 px-3.5 py-3 outline-none transition-colors hover:border-brand/40 hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{s.domain}</span>
                      <ArrowUpRight className="ml-auto size-3.5 shrink-0 transition-colors group-hover:text-brand" />
                    </span>
                    <span className="mt-1 block text-[13.5px] leading-snug font-medium group-hover:underline group-hover:decoration-brand/40 group-hover:underline-offset-2">
                      {s.title}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-6 flex gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" />
          Generated by AI{node.sources.length ? " from the sources above" : ""} and may contain mistakes.
        </p>
      </div>

      <div className="border-t bg-card px-6 py-4">
        {node.subflowId ? (
          <Button onClick={onShowSubflow} variant="outline" size="lg" className="h-10 w-full gap-2">
            <Layers /> Show breakdown
          </Button>
        ) : (
          <Button onClick={onExplore} disabled={loading} size="lg" className="h-10 w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Breaking down…
              </>
            ) : (
              <>
                <SquareSplitVertical /> Break down this step
              </>
            )}
          </Button>
        )}
      </div>
    </motion.aside>
  );
}

function FlowList({
  icon: Icon,
  label,
  items,
  empty,
  onSelect,
}: {
  icon: typeof ArrowDownToLine;
  label: string;
  items: Neighbour[];
  empty: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex w-20 shrink-0 items-center gap-1.5 self-start pt-0.5 text-[11px] text-muted-foreground">
        <Icon className="size-3" /> {label}
      </span>
      {items.length === 0 ? (
        <span className="text-[12.5px] text-muted-foreground/80 italic">{empty}</span>
      ) : (
        <ul className="flex min-w-0 flex-col gap-1">
          {items.map((n) => (
            <li key={n.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(n.id)}
                className="max-w-full truncate text-left text-[13px] font-medium underline-offset-2 hover:text-brand hover:underline"
              >
                {n.title}
              </button>
              {n.label && <span className="ml-1.5 text-[11.5px] text-muted-foreground">· {n.label}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Globe } from "lucide-react";
import { toast } from "sonner";
import { useAppConfig } from "@/components/key-gate";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { createPendingCanvas } from "@/lib/create-canvas";
import { plural, timeAgo } from "@/lib/format";
import { useCanvases } from "@/lib/storage";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "How does LangChain work?",
  "How does a request flow through Next.js?",
  "How does HTTPS establish a connection?",
  "How does Git store a commit?",
  "How does Kubernetes schedule a pod?",
  "How does a credit card payment go through?",
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function HomePage() {
  const router = useRouter();
  const canvases = useCanvases();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { serverSearch } = useAppConfig();
  const [useSearch, setUseSearch] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const recent = useMemo(
    () => [...canvases].filter((c) => c.status === "ready").sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [canvases],
  );

  function start(q: string) {
    if (!q.trim()) {
      setError("Enter a topic or question to start.");
      inputRef.current?.focus();
      return;
    }
    const canvas = createPendingCanvas(q, serverSearch && useSearch);
    if (!canvas) {
      toast.error("Couldn't create the canvas — browser storage is unavailable or full. Delete an old canvas and retry.");
      return;
    }
    router.push(`/canvas/${canvas.id}`);
  }

  return (
    <div className="relative h-full overflow-y-auto bg-background">
      <div className="absolute top-3 left-3 z-10">
        <SidebarToggle />
      </div>

      <div className="mx-auto flex min-h-full max-w-2xl flex-col px-6 pt-[18vh] pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="text-center font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl"
        >
          How does it <em className="text-brand">work?</em>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease }}
          className="mt-4 text-center text-[15px] text-muted-foreground"
        >
          Ask about any system, process or tool. Get its flow, step by step — then zoom into any step.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          onSubmit={(e) => {
            e.preventDefault();
            start(query);
          }}
          className="mt-10"
        >
          <div className="group relative rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04),0_8px_24px_-12px_oklch(0.3_0.02_60/0.18)] transition-shadow focus-within:border-brand/60 focus-within:shadow-[0_0_0_4px_var(--brand-soft),0_8px_24px_-12px_oklch(0.3_0.02_60/0.18)]">
            <label htmlFor="research-query" className="sr-only">
              Research topic or question
            </label>
            <textarea
              id="research-query"
              ref={inputRef}
              autoFocus
              rows={3}
              maxLength={500}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  start(query);
                }
              }}
              placeholder="e.g. How does a RAG pipeline answer a question?"
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "query-error" : undefined}
              className="block w-full resize-none bg-transparent px-5 pt-4 pb-14 text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
            />
            <div className="absolute right-3 bottom-3 left-5 flex items-center justify-between">
              <span className="flex items-center gap-3 text-xs text-muted-foreground/80">
                {serverSearch && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useSearch}
                    onClick={() => setUseSearch((v) => !v)}
                    title="Search the web first and cite sources. Slower, but better for new or niche topics."
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      useSearch ? "border-brand/50 bg-brand-soft text-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Globe className="size-3" /> Web sources {useSearch ? "on" : "off"}
                  </button>
                )}
                <span className="hidden sm:inline">
                  <kbd className="font-sans">Enter</kbd> to start · <kbd className="font-sans">Shift + Enter</kbd> new line
                </span>
              </span>
              <Button type="submit" size="icon" className="size-9 rounded-full" aria-label="Start research">
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
          {error && (
            <p id="query-error" className="mt-2 px-1 text-sm text-destructive">
              {error}
            </p>
          )}
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="mt-6 flex flex-wrap justify-center gap-2"
        >
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => start(ex)}
              className="rounded-full border bg-card px-3.5 py-1.5 text-[13px] text-muted-foreground outline-none transition-colors hover:border-brand/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {ex}
            </button>
          ))}
        </motion.div>

        {recent.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="mt-20"
            aria-labelledby="recent-heading"
          >
            <h2 id="recent-heading" className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Recent canvases
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/canvas/${c.id}`}
                    className="group flex h-full flex-col rounded-xl border bg-card p-4 outline-none transition-all hover:-translate-y-px hover:border-brand/40 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-serif text-xl leading-tight">{c.title}</span>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
                    </span>
                    <span className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">{c.rootQuery}</span>
                    <span className="mt-3 text-[11px] text-muted-foreground">
                      {plural(c.nodes.filter((n) => n.type === "step").length, "step")} · {timeAgo(c.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </div>
    </div>
  );
}

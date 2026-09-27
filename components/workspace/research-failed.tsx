"use client";

import { useState } from "react";
import { AlertTriangle, KeyRound, RotateCw } from "lucide-react";
import { useAppConfig } from "@/components/key-gate";
import { Button } from "@/components/ui/button";
import { updateCanvas } from "@/lib/storage";
import type { ResearchCanvas } from "@/lib/types";

export function ResearchFailed({ canvas }: { canvas: ResearchCanvas }) {
  const { openSettings } = useAppConfig();
  const [query, setQuery] = useState(canvas.rootQuery);
  const [error, setError] = useState<string | null>(null);
  const keyProblem = canvas.errorCode === "auth" || canvas.errorCode === "rate_limit";
  const searchProblem = canvas.errorCode === "search_auth" && canvas.useSearch;

  function retry(withoutSearch = false) {
    const q = query.trim().replace(/\s+/g, " ");
    if (!q) {
      setError("Enter a topic or question to research.");
      return;
    }
    const changed = q !== canvas.rootQuery;
    updateCanvas(canvas.id, {
      status: "pending",
      rootQuery: q,
      ...(changed ? { title: q.length > 60 ? `${q.slice(0, 57)}…` : q } : {}),
      ...(withoutSearch ? { useSearch: false } : {}),
      error: undefined,
      errorCode: undefined,
    });
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
        <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-4" />
        </div>
        <h2 className="mt-4 font-serif text-[28px] leading-tight tracking-tight">Research didn&apos;t finish</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {canvas.error ?? "Something went wrong while building this map."}
        </p>

        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            retry();
          }}
        >
          <label htmlFor="retry-query" className="text-xs font-medium text-muted-foreground">
            Your question
          </label>
          <textarea
            id="retry-query"
            rows={2}
            maxLength={500}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                retry();
              }
            }}
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-[15px] leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="h-9 flex-1 gap-2">
              <RotateCw /> Retry research
            </Button>
            {searchProblem && (
              <Button type="button" variant="outline" className="h-9" onClick={() => retry(true)}>
                Retry without web sources
              </Button>
            )}
            {keyProblem && (
              <Button type="button" variant="outline" className="h-9 gap-2" onClick={openSettings}>
                <KeyRound /> Open settings
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

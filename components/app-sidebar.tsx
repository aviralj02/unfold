"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, MoreHorizontal, PanelLeftClose, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { useSidebar } from "@/components/app-shell";
import { DeleteCanvasDialog, InlineRename } from "@/components/canvas-actions";
import { useAppConfig } from "@/components/key-gate";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { timeAgo } from "@/lib/format";
import { getProvider } from "@/lib/providers";
import { useRunningResearch } from "@/lib/research-runner";
import { useCanvases, useSettings } from "@/lib/storage";
import type { ResearchCanvas } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { open, toggle } = useSidebar();
  const { openSettings } = useAppConfig();
  const canvases = useCanvases();
  const running = useRunningResearch();
  const settings = useSettings();
  const pathname = usePathname();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ResearchCanvas | null>(null);

  const sorted = useMemo(() => [...canvases].sort((a, b) => b.updatedAt - a.updatedAt), [canvases]);

  return (
    <>
      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 264, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="z-20 flex h-full shrink-0 flex-col overflow-hidden border-r bg-sidebar"
            aria-label="Canvases"
          >
            <div className="flex w-[264px] flex-1 flex-col overflow-hidden">
              <div className="flex h-14 items-center justify-between px-4">
                <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Logo />
                </Link>
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Hide sidebar" />}
                  >
                    <PanelLeftClose />
                  </TooltipTrigger>
                  <TooltipContent side="right">Hide sidebar</TooltipContent>
                </Tooltip>
              </div>

              <div className="px-3 pb-3">
                <Button
                  render={<Link href="/" />}
                  nativeButton={false}
                  variant="outline"
                  className="h-9 w-full justify-start gap-2 bg-card"
                >
                  <Plus /> New research
                </Button>
              </div>

              <div className="px-4 pt-3 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Canvases
              </div>
              <nav className="flex-1 overflow-y-auto px-2 pb-3">
                {sorted.length === 0 ? (
                  <p className="px-2 py-3 text-[13px] leading-relaxed text-muted-foreground">
                    Your research canvases will appear here.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-px">
                    {sorted.map((c) => {
                      const active = pathname === `/canvas/${c.id}`;
                      if (renaming === c.id)
                        return (
                          <li key={c.id} className="px-1 py-0.5">
                            <InlineRename canvas={c} onDone={() => setRenaming(null)} className="h-8 bg-card text-[13px]" />
                          </li>
                        );
                      return (
                        <li key={c.id} className="group/item relative">
                          <Link
                            href={`/canvas/${c.id}`}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex flex-col gap-0.5 rounded-md py-2 pr-9 pl-2.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                              active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
                            )}
                          >
                            <span className="flex items-center gap-1.5 truncate text-[13px] font-medium">
                              {running.has(c.id) && <Loader2 className="size-3 shrink-0 animate-spin text-brand" />}
                              {c.status === "error" && <AlertCircle className="size-3 shrink-0 text-destructive" />}
                              <span className="truncate">{c.title}</span>
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {c.status === "ready"
                                ? `${c.nodes.filter((n) => n.type === "step").length} steps · ${timeAgo(c.updatedAt)}`
                                : c.status === "pending"
                                  ? running.has(c.id)
                                    ? "Researching…"
                                    : "Paused · open to resume"
                                  : "Needs a retry"}
                            </span>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label={`Options for ${c.title}`}
                                  className="absolute top-2 right-1.5 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
                                />
                              }
                            >
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => setRenaming(c.id)}>
                                <Pencil /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(c)}>
                                <Trash2 /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </nav>

              <div className="border-t p-2">
                <button
                  onClick={openSettings}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Settings className="size-4 text-muted-foreground" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[13px] font-medium">Settings</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {getProvider(settings.provider)?.label} · {settings.model}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <DeleteCanvasDialog canvas={deleting} onOpenChange={(o) => !o && setDeleting(null)} />
    </>
  );
}

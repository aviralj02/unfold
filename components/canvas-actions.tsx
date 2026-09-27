"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteCanvas, updateCanvas } from "@/lib/storage";
import type { ResearchCanvas } from "@/lib/types";

export function renameCanvas(id: string, title: string) {
  const t = title.trim().slice(0, 120);
  if (!t) return false;
  if (!updateCanvas(id, { title: t })) {
    toast.error("Couldn't save the new name — browser storage is unavailable or full.");
    return false;
  }
  return true;
}

/** Inline title editor: Enter saves, Escape cancels, blur saves. */
export function InlineRename({
  canvas,
  onDone,
  className,
}: {
  canvas: Pick<ResearchCanvas, "id" | "title">;
  onDone: () => void;
  className?: string;
}) {
  const [value, setValue] = useState(canvas.title);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    if (value.trim() && value.trim() !== canvas.title) renameCanvas(canvas.id, value);
    onDone();
  };

  return (
    <Input
      ref={ref}
      value={value}
      aria-label="Canvas title"
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onDone();
      }}
      className={className}
    />
  );
}

export function DeleteCanvasDialog({
  canvas,
  onOpenChange,
}: {
  canvas: Pick<ResearchCanvas, "id" | "title"> | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  return (
    <Dialog open={!!canvas} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this canvas?</DialogTitle>
          <DialogDescription>
            &ldquo;{canvas?.title}&rdquo; and all of its concepts will be removed from this browser. This can&apos;t be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="-mx-6 -mb-6 px-6">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              if (!canvas) return;
              const onPage = window.location.pathname === `/canvas/${canvas.id}`;
              deleteCanvas(canvas.id);
              onOpenChange(false);
              if (onPage) router.push("/");
              toast("Canvas deleted");
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

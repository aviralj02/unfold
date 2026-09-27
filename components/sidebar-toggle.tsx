"use client";

import { PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Shown in page headers only while the sidebar is hidden. */
export function SidebarToggle() {
  const { open, toggle } = useSidebar();
  if (open) return null;
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Show sidebar" />}>
        <PanelLeftOpen />
      </TooltipTrigger>
      <TooltipContent side="bottom">Show sidebar</TooltipContent>
    </Tooltip>
  );
}

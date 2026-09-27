"use client";

import { createContext, useContext, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";

const SidebarContext = createContext<{ open: boolean; toggle: () => void }>({ open: true, toggle: () => {} });
export const useSidebar = () => useContext(SidebarContext);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <SidebarContext.Provider value={{ open, toggle: () => setOpen((o) => !o) }}>
      <div className="flex h-full">
        <AppSidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </SidebarContext.Provider>
  );
}

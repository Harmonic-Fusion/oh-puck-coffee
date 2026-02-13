"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const SIDEBAR_COLLAPSED_KEY = "coffee-sidebar-collapsed";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

function getSavedSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  return saved === "true";
}

function saveSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false");
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(false);

  useEffect(() => {
    setCollapsedState(getSavedSidebarCollapsed());
  }, []);

  const setCollapsed = (newCollapsed: boolean) => {
    setCollapsedState(newCollapsed);
    saveSidebarCollapsed(newCollapsed);
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

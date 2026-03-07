"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
} from "react";

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

function subscribeSidebarCollapsed(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const collapsedFromStore = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSavedSidebarCollapsed,
    () => false,
  );
  const [localCollapsed, setLocalCollapsed] = useState<boolean | null>(null);

  const collapsed = localCollapsed ?? collapsedFromStore;

  const setCollapsed = useCallback((newCollapsed: boolean) => {
    setLocalCollapsed(newCollapsed);
    saveSidebarCollapsed(newCollapsed);
  }, []);

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

"use client";

import { Suspense } from "react";
import { NavBar } from "./NavBar";
import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Skeleton } from "@/components/common/Skeleton";

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />
      <div className={`transition-all duration-300 ${collapsed ? "sm:pl-20" : "sm:pl-64"}`}>
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-6 pb-20 sm:pb-6">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-32 w-full" />
                </div>
              }
            >
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellContent>{children}</AppShellContent>
    </SidebarProvider>
  );
}

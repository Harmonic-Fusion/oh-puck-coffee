"use client";

import { useState } from "react";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutContentProps {
  children: React.ReactNode;
  userEmail: string;
  navLinks: Array<{ href: string; label: string }>;
}

export function AdminLayoutContent({
  children,
  userEmail,
  navLinks,
}: AdminLayoutContentProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Admin Header */}
      <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="sm:hidden"
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {isSidebarOpen ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <Bars3Icon className="h-5 w-5" />
                )}
              </Button>

              <span className="rounded bg-amber-700 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                Pucking Super Admin
              </span>
              <span className="hidden text-sm text-stone-500 dark:text-stone-400 sm:inline">
                {userEmail}
              </span>
            </div>
            <Link
              href={AppRoutes.log.path}
              className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop toggle button */}
      <div className="hidden sm:block">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed left-4 top-20 z-40 rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? (
            <XMarkIcon className="h-5 w-5" />
          ) : (
            <Bars3Icon className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 py-6">
          {/* Collapsible Sidebar Nav */}
          <AdminSidebar
            navLinks={navLinks}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          {/* Main Content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

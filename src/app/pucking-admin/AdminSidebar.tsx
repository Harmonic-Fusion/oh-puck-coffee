"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  navLinks: Array<{ href: string; label: string }>;
  isOpen: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ navLinks, isOpen, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-stone-200 bg-white transition-all duration-300 dark:border-stone-800 dark:bg-stone-900 sm:relative sm:z-auto sm:transition-all ${
          isOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        } ${isOpen ? "w-55" : "w-0 sm:w-0"} overflow-hidden`}
      >
        <div className="flex h-14 items-center justify-between border-b border-stone-200 px-4 dark:border-stone-800 sm:hidden">
          <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Admin Navigation
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  // Close on mobile when link is clicked
                  if (window.innerWidth < 640) {
                    onToggle();
                  }
                }}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400"
                    : "text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

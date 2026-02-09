"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";

const navItems = [
  { label: "Log Shot", href: AppRoutes.log.path },
  { label: "History", href: AppRoutes.history.path },
  { label: "Dashboard", href: AppRoutes.dashboard.path },
  { label: "Settings", href: AppRoutes.settings.path },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href={AppRoutes.log.path}
          className="flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500"
        >
          <span>☕</span>
          <span className="hidden sm:inline">Coffee Tracker</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="h-7 w-7 rounded-full"
            />
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

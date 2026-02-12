"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";

const navItems = [
  { label: "Log", href: AppRoutes.log.path, mobileLabel: "☕ Log" },
  { label: "History", href: AppRoutes.history.path, mobileLabel: "📋 History" },
  { label: "Dashboard", href: AppRoutes.dashboard.path, mobileLabel: "📊 Dashboard" },
  { label: "Settings", href: AppRoutes.settings.path, mobileLabel: "⚙️" },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Desktop / tablet top bar - hidden on lg+ when sidebar is shown */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/80 lg:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href={AppRoutes.log.path}
            className="flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500"
          >
            <img
              src="/logos/logo_complex.png"
              alt="Coffee Tracker"
              className="h-6 w-6"
            />
            <span className="hidden sm:inline">Coffee Tracker</span>
          </Link>

          {/* Desktop nav items */}
          <nav className="hidden items-center gap-1 sm:flex">
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
              onClick={() => signOut({ callbackUrl: AppRoutes.login.path })}
              className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-stone-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden dark:border-stone-700 dark:bg-stone-900/90">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-stone-500 dark:text-stone-400"
              }`}
            >
              {item.mobileLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

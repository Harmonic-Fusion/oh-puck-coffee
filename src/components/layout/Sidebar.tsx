"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";

const navItems = [
  { label: "Log Shot", href: AppRoutes.log.path, icon: "☕" },
  { label: "History", href: AppRoutes.history.path, icon: "📋" },
  { label: "Dashboard", href: AppRoutes.dashboard.path, icon: "📊" },
  { label: "Settings", href: AppRoutes.settings.path, icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-stone-200 bg-white px-6 pb-4 dark:border-stone-700 dark:bg-stone-900">
        <div className="flex h-16 shrink-0 items-center gap-2">
          <img
            src="/logos/logo_complex.png"
            alt="Coffee Tracker"
            className="h-8 w-8"
          />
          <span className="text-lg font-bold text-amber-800 dark:text-amber-500">
            Coffee Tracker
          </span>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex gap-x-3 rounded-md p-3 text-sm font-medium leading-6 transition-colors ${
                      isActive
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        : "text-stone-700 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto border-t border-stone-200 pt-4 dark:border-stone-700">
            {session?.user && (
              <div className="flex items-center gap-3 px-3 py-2">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                    {session.user.name || "User"}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Sign out
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}

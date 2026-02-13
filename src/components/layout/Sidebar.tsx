"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BeakerIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import { useSidebar } from "./SidebarContext";

const navItems = [
  { label: "Log Shot", href: AppRoutes.log.path, icon: BeakerIcon },
  { label: "History", href: AppRoutes.history.path, icon: ClipboardDocumentListIcon },
  { label: "Dashboard", href: AppRoutes.dashboard.path, icon: ChartBarIcon },
  { label: "Settings", href: AppRoutes.settings.path, icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, setCollapsed } = useSidebar();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300 ${collapsed ? "lg:w-20" : "lg:w-64"}`}>
      <div className={`flex grow flex-col gap-y-5 overflow-y-auto border-r border-stone-200 bg-white pb-4 dark:border-stone-700 dark:bg-stone-900 transition-all duration-300 ${collapsed ? "px-3" : "px-6"}`}>
        <div className={`flex h-16 shrink-0 items-center ${collapsed ? "justify-center" : "gap-2"}`}>
          <img
            src="/logos/logo_complex.png"
            alt="Coffee Tracker"
            className="h-8 w-8 flex-shrink-0"
          />
          {!collapsed && (
            <span className="text-lg font-bold text-amber-800 dark:text-amber-500">
              Coffee Tracker
            </span>
          )}
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="ml-auto rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
              aria-label="Collapse sidebar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center px-3">
            <button
              onClick={toggleCollapsed}
              className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
              aria-label="Expand sidebar"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
        )}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex rounded-md text-sm font-medium leading-6 transition-colors ${
                      collapsed ? "justify-center p-3" : "gap-x-3 p-3"
                    } ${
                      isActive
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        : "text-stone-700 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-6 w-6 flex-shrink-0" />
                    {!collapsed && item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto border-t border-stone-200 pt-4 dark:border-stone-700">
            {session?.user && !collapsed && (
              <div className="flex items-center gap-3 px-3 py-2">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-8 w-8 rounded-full flex-shrink-0"
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
              onClick={() => signOut({ callbackUrl: AppRoutes.login.path })}
              className={`w-full rounded-md py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800 ${
                collapsed ? "flex justify-center px-3" : "px-3 text-left"
              }`}
              title={collapsed ? "Sign out" : undefined}
            >
              {collapsed ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              ) : (
                "Sign out"
              )}
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}

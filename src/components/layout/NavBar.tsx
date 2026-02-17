"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BeakerIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";

// Desktop top bar: Dashboard, Log, User Menu (dropdown)
const desktopNavItems = [
  { label: "Dashboard", href: AppRoutes.dashboard.path },
  { label: "Log", href: AppRoutes.log.path },
];

// Mobile bottom bar: Profile, History, Dashboard, Log
const mobileNavItems = [
  { label: "Profile", href: AppRoutes.settings.path, icon: UserIcon },
  { label: "History", href: AppRoutes.history.path, icon: ClipboardDocumentListIcon },
  { label: "Dashboard", href: AppRoutes.dashboard.path, icon: ChartBarIcon },
  { label: "Log", href: AppRoutes.log.path, icon: BeakerIcon },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, handleClickOutside, handleKeyDown]);

  const userName = session?.user?.name || "User";
  const userImage = session?.user?.image;
  const isHistoryActive = pathname.startsWith(AppRoutes.history.path);
  const isSettingsActive = pathname.startsWith(AppRoutes.settings.path);
  const isUserMenuActive = isHistoryActive || isSettingsActive;

  return (
    <>
      {/* Desktop / tablet top bar — hidden on mobile (sm:flex), hidden on lg+ (sidebar takes over) */}
      <header className="border-b border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 hidden sm:block lg:hidden">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href={AppRoutes.log.path}
            className="flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500"
          >
            <img
              src="/logos/logo_complex.png"
              alt="Coffee Tracker"
              className="h-6 w-6"
            />
            <span>Coffee Tracker</span>
          </Link>

          <div className="flex items-center gap-1">
            {/* Dashboard, Log */}
            <nav className="flex items-center gap-1">
              {desktopNavItems.map((item) => {
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

            {/* User Menu trigger */}
            <div ref={menuRef} className="relative ml-2">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                  isUserMenuActive || menuOpen
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                }`}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                  <Link
                    href={AppRoutes.history.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isHistoryActive
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                        : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                    }`}
                  >
                    <ClipboardDocumentListIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                    History
                  </Link>
                  <Link
                    href={AppRoutes.settings.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isSettingsActive
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                        : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                    }`}
                  >
                    <Cog6ToothIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                    Profile
                  </Link>
                  <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                  <button
                    onClick={() => signOut({ callbackUrl: AppRoutes.login.path })}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <ArrowRightStartOnRectangleIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav bar — sm:hidden (only on mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-stone-200 bg-white/90 h-16 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden dark:border-stone-700 dark:bg-stone-900/90">
        {mobileNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-stone-500 dark:text-stone-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

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
  ChatBubbleLeftRightIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import { useSidebar } from "./SidebarContext";
import { FeedbackModal } from "@/components/common/FeedbackModal";

const navItems = [
  { label: "Dashboard", href: AppRoutes.dashboard.path, icon: ChartBarIcon },
  { label: "Log Shot", href: AppRoutes.log.path, icon: BeakerIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, setCollapsed } = useSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

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
  const userEmail = session?.user?.email;
  const userImage = session?.user?.image;
  const isHistoryActive = pathname.startsWith(AppRoutes.history.path);
  const isSettingsActive = pathname.startsWith(AppRoutes.settings.path);
  const isUserMenuActive = isHistoryActive || isSettingsActive;

  return (
    <aside className={`hidden sm:fixed sm:inset-y-0 sm:left-0 sm:z-40 sm:flex sm:flex-col transition-all duration-300 ${collapsed ? "sm:w-20" : "sm:w-64"}`}>
      <div className={`flex grow flex-col gap-y-5 overflow-y-auto border-r border-stone-200 bg-white pb-4 dark:border-stone-700 dark:bg-stone-900 transition-all duration-300 ${collapsed ? "px-3" : "px-6"}`}>
        <div className={`flex h-16 shrink-0 items-center ${collapsed ? "justify-center" : "gap-2"}`}>
          {!collapsed && (
            <>
              <img
                src="/logos/logo_complex.png"
                alt="Coffee Tracker"
                className="h-8 w-8 flex-shrink-0"
              />
              <span className="text-lg font-bold text-amber-800 dark:text-amber-500">
                Coffee Tracker
              </span>
            </>
          )}
          <button
            onClick={toggleCollapsed}
            className={`rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300 ${collapsed ? "" : "ml-auto"}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col">
          {/* Main nav: Dashboard, Log */}
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

          {/* User menu at bottom */}
          <div ref={menuRef} className="relative mt-auto border-t border-stone-200 pt-4 dark:border-stone-700">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`w-full rounded-md transition-colors ${
                isUserMenuActive
                  ? "bg-amber-50 dark:bg-amber-900/30"
                  : "hover:bg-stone-50 dark:hover:bg-stone-800"
              }`}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              title={collapsed ? userName : undefined}
            >
              {!collapsed ? (
                <div className="flex items-center gap-3 px-3 py-2">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName}
                      className="h-8 w-8 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <UserIcon className="h-6 w-6 flex-shrink-0 text-stone-400 dark:text-stone-500" />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-sm font-medium truncate ${isUserMenuActive ? "text-amber-800 dark:text-amber-400" : "text-stone-800 dark:text-stone-200"}`}>
                      {userName}
                    </p>
                    {userEmail && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                        {userEmail}
                      </p>
                    )}
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
              ) : (
                <div className="flex justify-center py-2">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <UserIcon className="h-6 w-6 text-stone-400 dark:text-stone-500" />
                  )}
                </div>
              )}
            </button>

            {/* Popup menu — opens upward */}
            {menuOpen && (
              <div className={`absolute bottom-full mb-2 w-56 rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900 ${collapsed ? "left-0" : "left-2"}`}>
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
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setIsFeedbackModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                  Send Feedback
                </button>
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
        </nav>
      </div>
      <FeedbackModal
        open={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </aside>
  );
}

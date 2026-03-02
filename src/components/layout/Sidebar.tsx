"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Bars3Icon, UserIcon } from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "./SidebarContext";
import { FeedbackModal } from "@/components/common/FeedbackModal";
import {
  desktopMainNav,
  getDesktopUserMenuItems,
  isRouteActive,
  isNavItem,
} from "./nav-items";

// Desktop sidebar navigation

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { collapsed, setCollapsed } = useSidebar();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email;
  const userImage = session?.user?.image;

  const userMenuItems = getDesktopUserMenuItems(session?.user?.role);

  function handleUserMenuItemClick(item: typeof userMenuItems[0]) {
    if (isNavItem(item)) {
      router.push(item.href);
    } else if (item.label === "Send Feedback") {
      setFeedbackOpen(true);
    } else if (item.label === "Sign Out") {
      signOut({ callbackUrl: AppRoutes.login.path });
    }
  }

  return (
    <>
      <aside
        className={`hidden sm:fixed sm:inset-y-0 sm:left-0 sm:z-40 sm:flex sm:flex-col transition-all duration-300 ${
          collapsed ? "sm:w-20" : "sm:w-64"
        }`}
      >
        <div
          className={`flex grow flex-col gap-y-5 overflow-y-auto border-r border-stone-200 bg-white pb-4 transition-all duration-300 dark:border-stone-700 dark:bg-stone-900 ${
            collapsed ? "px-3" : "px-6"
          }`}
        >
          {/* Header */}
          <div
            className={`flex h-16 shrink-0 items-center ${
              collapsed ? "justify-center" : "gap-2"
            }`}
          >
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className={collapsed ? "" : "ml-auto"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Bars3Icon className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            {/* Main navigation (Add, Stats, Tasting) */}
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {desktopMainNav.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group flex rounded-md text-sm font-medium leading-6 transition-colors ${
                        collapsed ? "justify-center p-3" : "gap-x-3 p-3"
                      } ${
                        active
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

            {/* User menu */}
            <Separator className="mb-4" />

            <div className="relative">
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 px-3 py-2 h-auto ${
                    isRouteActive(pathname, AppRoutes.settings.path)
                      ? "bg-amber-50 dark:bg-amber-900/30"
                      : ""
                  }`}
                  title={collapsed ? userName : undefined}
                >
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName}
                      className="h-8 w-8 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <UserIcon className="h-6 w-6 flex-shrink-0 text-stone-400 dark:text-stone-500" />
                  )}
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <p
                        className={`text-sm font-medium truncate ${
                          isRouteActive(pathname, AppRoutes.settings.path)
                            ? "text-amber-800 dark:text-amber-400"
                            : "text-stone-800 dark:text-stone-200"
                        }`}
                      >
                        {userName}
                      </p>
                      {userEmail && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-56 border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
              >
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {userName}
                  </p>
                  {userEmail && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      {userEmail}
                    </p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {userMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  const active = isNavItem(item) && isRouteActive(pathname, item.href);
                  const isSignOut = item.label === "Sign Out";
                  const showSeparator = isSignOut && index > 0;
                  
                  return (
                    <div key={isNavItem(item) ? item.href : item.label}>
                      {showSeparator && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => handleUserMenuItemClick(item)}
                        className={isNavItem(item) && item.href === AppRoutes.settings.path ? "gap-3 p-0" : "gap-3"}
                      >
                        {isNavItem(item) && item.href === AppRoutes.settings.path ? (
                          <Link
                            href={item.href}
                            className="flex w-full items-center gap-3 px-2 py-1.5"
                          >
                            <Icon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                            {item.label}
                          </Link>
                        ) : (
                          <>
                            <Icon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                            {item.label}
                          </>
                        )}
                      </DropdownMenuItem>
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </nav>
        </div>
      </aside>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

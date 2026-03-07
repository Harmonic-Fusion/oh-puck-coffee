"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Bars3Icon, UserIcon } from "@heroicons/react/24/outline";
import { AppRoutes, ApiRoutes } from "@/app/routes";
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
import { useShareInvites } from "@/components/beans/hooks";
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

  const { data: profile } = useQuery<{ name: string | null; image: string | null }>({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.users.me.path);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const userName = profile?.name ?? session?.user?.name ?? "User";
  const userEmail = session?.user?.email;
  const userImage = profile?.image ?? session?.user?.image;
  const [userImageFailed, setUserImageFailed] = useState(false);
  const [prevUserImage, setPrevUserImage] = useState(userImage);

  // Reset image failed flag when userImage changes (store previous value during render)
  if (userImage !== prevUserImage) {
    setPrevUserImage(userImage);
    setUserImageFailed(false);
  }

  const showUserImage = userImage && !userImageFailed;

  const userMenuItems = getDesktopUserMenuItems(session?.user?.role);

  const { data: invites } = useShareInvites();
  const pendingInviteCount = invites?.filter((i) => i.id).length ?? 0;
  const showBeansBadge = pendingInviteCount > 0;

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
                <Image
                  src="/logos/logo_complex.png"
                  alt="Coffee Tracker"
                  width={32}
                  height={32}
                  className="flex-shrink-0"
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
                const isBeans = item.href === AppRoutes.beans.path;
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
                      <span className="relative flex-shrink-0">
                        <Icon className="h-6 w-6" />
                        {collapsed && isBeans && showBeansBadge && (
                          <span
                            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white"
                            aria-label={`${pendingInviteCount} pending invite${pendingInviteCount !== 1 ? "s" : ""}`}
                          >
                            {pendingInviteCount > 9 ? "9+" : pendingInviteCount}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <span className="flex flex-1 items-center gap-2">
                          {item.label}
                          {isBeans && showBeansBadge && (
                            <span
                              className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white"
                              aria-label={`${pendingInviteCount} pending invite${pendingInviteCount !== 1 ? "s" : ""}`}
                            >
                              {pendingInviteCount > 9 ? "9+" : pendingInviteCount}
                            </span>
                          )}
                        </span>
                      )}
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
                  {showUserImage ? (
                    <Image
                      src={userImage}
                      alt={userName}
                      width={32}
                      height={32}
                      className="rounded-full flex-shrink-0"
                      onError={() => setUserImageFailed(true)}
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

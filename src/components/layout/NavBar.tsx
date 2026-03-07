"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  mobileMainTabs,
  getMobileMenuItems,
  isRouteActive,
  isNavItem,
} from "./nav-items";
import { useShareInvites } from "@/components/beans/hooks";
import { FeedbackModal } from "@/components/common/FeedbackModal";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const menuItems = getMobileMenuItems(session?.user?.role);

  const { data: invites } = useShareInvites();
  const pendingInviteCount = invites?.filter((i) => i.id).length ?? 0;
  const showBeansBadge = pendingInviteCount > 0;

  function handleMenuItemClick(item: typeof menuItems[0]) {
    if (isNavItem(item)) {
      router.push(item.href);
    } else if (item.label === "Send Feedback") {
      setFeedbackOpen(true);
    }
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-stone-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/90 sm:hidden">
        {/* Hamburger menu (Bars3Icon) */}
        <div className="relative flex flex-1 items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-auto w-auto flex-col gap-0.5 rounded-none p-2 text-xs font-medium text-stone-500 hover:bg-transparent hover:text-amber-700 dark:text-stone-400 dark:hover:bg-transparent dark:hover:text-amber-400"
                aria-label="Menu"
              >
                <Bars3Icon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={12}
              className="min-w-[11rem] border-stone-200 bg-white/95 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95"
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItem(item) && isRouteActive(pathname, item.href);
                return (
                  <DropdownMenuItem
                    key={isNavItem(item) ? item.href : item.label}
                    onClick={() => handleMenuItemClick(item)}
                    className={`gap-3 px-3 py-2.5 text-sm ${
                      active
                        ? "text-amber-700 dark:text-amber-400"
                        : ""
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main tabs (Shots, Stats, Add) */}
        {mobileMainTabs.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(pathname, item.href);
          const isBeans = item.href === AppRoutes.beans.path;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                active
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {isBeans && showBeansBadge && (
                  <span
                    className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white"
                    aria-label={`${pendingInviteCount} pending invite${pendingInviteCount !== 1 ? "s" : ""}`}
                  >
                    {pendingInviteCount > 9 ? "9+" : pendingInviteCount}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

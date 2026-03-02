"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FeedbackModal } from "@/components/common/FeedbackModal";
import {
  getDesktopUserMenuItems,
  isNavItem,
} from "@/components/layout/nav-items";

type UserDropdownProps = {
  userName: string | null | undefined;
  userImage: string | null | undefined;
};

export function UserDropdown({ userName, userImage }: UserDropdownProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const userMenuItems = getDesktopUserMenuItems(session?.user?.role);

  function handleMenuItemClick(item: typeof userMenuItems[0]) {
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 rounded-lg border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            {userImage ? (
              <img
                src={userImage}
                alt=""
                className="h-6 w-6 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {userName?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
            <span className="hidden sm:inline">{userName ?? "Account"}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="w-48 border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
        >
          {userMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isSignOut = item.label === "Sign Out";
            const showSeparator = isSignOut && index > 0;

            return (
              <div key={isNavItem(item) ? item.href : item.label}>
                {showSeparator && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => handleMenuItemClick(item)}
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

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

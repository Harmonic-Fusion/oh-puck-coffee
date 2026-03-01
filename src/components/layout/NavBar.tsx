"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserIcon,
  SparklesIcon,
  Bars3Icon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Mobile bottom bar: Menu, Shots, Dashboard, Log
const mobileNavItems = [
  {
    label: "Shots",
    href: AppRoutes.shots.path,
    icon: ClipboardDocumentListIcon,
  },
  { label: "Stats", href: AppRoutes.dashboard.path, icon: ChartBarIcon },
  { label: "Add", href: AppRoutes.log.path, icon: PlusCircleIcon },
];

// Menu items for the dropdown
const menuNavItems = [
  { label: "Profile", href: AppRoutes.settings.path, icon: UserIcon },
  { label: "Tasting", href: AppRoutes.tasting.path, icon: SparklesIcon },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {/* Mobile bottom nav bar — hidden on sm+ (sidebar takes over) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-stone-200 bg-white/90 h-16 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden dark:border-stone-700 dark:bg-stone-900/90">
        {/* Menu button with dropdown */}
        <div className="relative flex flex-1 flex-col items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors text-stone-500 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400">
              <Bars3Icon className="h-6 w-6" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="center"
              sideOffset={8}
              className="min-w-[200px] bg-white/90 backdrop-blur-md border-stone-200 dark:border-stone-700 dark:bg-stone-900/90"
            >
              {menuNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`flex items-center gap-3 px-4 py-3 text-base ${
                      isActive
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Regular nav items */}
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

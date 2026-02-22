"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BeakerIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";

// Mobile bottom bar: Profile, History, Dashboard, Log
const mobileNavItems = [
  { label: "Profile", href: AppRoutes.settings.path, icon: UserIcon },
  { label: "History", href: AppRoutes.history.path, icon: ClipboardDocumentListIcon },
  { label: "Dashboard", href: AppRoutes.dashboard.path, icon: ChartBarIcon },
  { label: "Log", href: AppRoutes.log.path, icon: BeakerIcon },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile bottom nav bar — hidden on sm+ (sidebar takes over) */}
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

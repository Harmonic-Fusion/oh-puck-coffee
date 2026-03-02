import {
  ClipboardDocumentListIcon,
  ChartBarIcon,
  SparklesIcon,
  PlusCircleIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightStartOnRectangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import { BeanIcon } from "@/components/common/BeanIcon";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export type MenuAction = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// ── Common menu items ───────────────────────────────────────────────
export const navItems = {
  admin: {
    label: "Admin",
    href: AppRoutes.puckingAdmin.path,
    icon: ShieldCheckIcon,
  },
  profile: {
    label: "Profile",
    href: AppRoutes.settings.path,
    icon: Cog6ToothIcon,
  },
  tasting: {
    label: "Tasting",
    href: AppRoutes.tasting.path,
    icon: SparklesIcon,
  },
  beans: {
    label: "Beans",
    href: AppRoutes.beans.path,
    icon: BeanIcon,
  },
  shots: {
    label: "Shots",
    href: AppRoutes.shots.path,
    icon: ClipboardDocumentListIcon,
  },
  stats: {
    label: "Stats",
    href: AppRoutes.dashboard.path,
    icon: ChartBarIcon,
  },
  add: {
    label: "Add",
    href: AppRoutes.log.path,
    icon: PlusCircleIcon,
  },
} as const;

// ── Menu actions (not navigation links) ───────────────────────────────
export const menuActions = {
  feedback: {
    label: "Send Feedback",
    icon: ChatBubbleLeftRightIcon,
  },
  signOut: {
    label: "Sign Out",
    icon: ArrowRightStartOnRectangleIcon,
  },
} as const;

// ── Mobile navigation structure ───────────────────────────────────────
/**
 * Mobile main tabs (Shots, Stats, Add)
 */
export const mobileMainTabs: NavItem[] = [
  navItems.beans,
  navItems.shots,
  navItems.stats,
  navItems.add,
];

/**
 * Mobile hamburger menu items (Bars3Icon submenu)
 * Order: Admin (if super-admin), Feedback, Profile, Tasting
 */
export function getMobileMenuItems(
  userRole?: "member" | "admin" | "super-admin",
): (NavItem | MenuAction)[] {  
  const adminItems = userRole === "super-admin" ? [
    navItems.admin,
  ] : [];
  return [
    ...adminItems,
    menuActions.feedback,
    navItems.profile,
    navItems.tasting,
  ];
}

// ── Desktop navigation structure ─────────────────────────────────────
/**
 * Desktop main navigation (Add, Stats, Tasting)
 */
export const desktopMainNav: NavItem[] = [
  navItems.add,
  navItems.beans,
  navItems.shots,
  navItems.stats,
  navItems.tasting,
];

/**
 * Desktop user menu items (User Name submenu)
 * Order: Admin (if super-admin), Profile, Feedback, Sign Out
 */
export function getDesktopUserMenuItems(
  userRole?: "member" | "admin" | "super-admin",
): (NavItem | MenuAction)[] {
  const adminItems = userRole === "super-admin" ? [
    navItems.admin,
  ] : [];
  return [
    ...adminItems,
    navItems.profile,
    menuActions.feedback,
    menuActions.signOut,
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────
export function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

/**
 * Check if a menu item is a NavItem (has href) or MenuAction (no href)
 */
export function isNavItem(
  item: NavItem | MenuAction,
): item is NavItem {
  return "href" in item;
}

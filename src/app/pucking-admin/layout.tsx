import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { AppRoutes } from "@/app/routes";
import Link from "next/link";

const { puckingAdmin } = AppRoutes;
const equipment = puckingAdmin.equipment as typeof puckingAdmin.equipment & {
  grinders: { path: string };
  machines: { path: string };
  tools: { path: string };
};

const adminNavLinks = [
  { href: puckingAdmin.path, label: "Overview" },
  { href: puckingAdmin.users.path, label: "Users" },
  { href: puckingAdmin.beans.path, label: "Beans" },
  { href: puckingAdmin.shots.path, label: "Shots" },
  { href: equipment.grinders.path, label: "Grinders" },
  { href: equipment.machines.path, label: "Machines" },
  { href: equipment.tools.path, label: "Tools" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "super-admin") {
    redirect(AppRoutes.home.path);
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Admin Header */}
      <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded bg-amber-700 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                Pucking Super Admin
              </span>
              <span className="text-sm text-stone-500 dark:text-stone-400">
                {session.user.email}
              </span>
            </div>
            <Link
              href={AppRoutes.home.path}
              className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 py-6">
          {/* Sidebar Nav */}
          <aside className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {adminNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

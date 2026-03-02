import Link from "next/link";
import { AdminMetrics } from "@/components/admin/AdminMetrics";

const adminSections = [
  {
    title: "Users",
    href: "/pucking-admin/users",
    description: "View and manage all registered users",
    icon: "👤",
  },
  {
    title: "Beans",
    href: "/pucking-admin/beans",
    description: "View all coffee beans across all users",
    icon: "☕",
  },
  {
    title: "Shots",
    href: "/pucking-admin/shots",
    description: "View all espresso shots logged",
    icon: "📊",
  },
  {
    title: "Grinders",
    href: "/pucking-admin/equipment/grinders",
    description: "View all grinder equipment",
    icon: "⚙️",
  },
  {
    title: "Machines",
    href: "/pucking-admin/equipment/machines",
    description: "View all espresso machines",
    icon: "🔧",
  },
  {
    title: "Tools",
    href: "/pucking-admin/equipment/tools",
    description: "View all tools and accessories",
    icon: "🛠️",
  },
];

export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
        Admin Overview
      </h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Manage all application data
      </p>

      <AdminMetrics />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-amber-700 dark:hover:bg-stone-800"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{section.icon}</span>
              <h2 className="font-semibold text-stone-900 group-hover:text-amber-800 dark:text-stone-100 dark:group-hover:text-amber-400">
                {section.title}
              </h2>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

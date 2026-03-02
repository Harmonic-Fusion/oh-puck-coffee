import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { AppRoutes } from "@/app/routes";
import { AdminLayoutContent } from "./AdminLayoutContent";

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
    <AdminLayoutContent
      userEmail={session.user.email ?? ""}
      navLinks={adminNavLinks}
    >
      {children}
    </AdminLayoutContent>
  );
}

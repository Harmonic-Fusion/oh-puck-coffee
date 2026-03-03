import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { AppRoutes } from "@/app/routes";
import { AdminLayoutContent } from "./AdminLayoutContent";

const { puckingAdmin } = AppRoutes;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pa = puckingAdmin as any;

const adminNavLinks = [
  { href: puckingAdmin.path, label: "Overview" },
  { href: puckingAdmin.users.path, label: "Users" },
  { href: pa.feedback.path as string, label: "Feedback" },
  { href: puckingAdmin.subscriptions.path, label: "Subscriptions" },
  { href: puckingAdmin.billing.path, label: "Billing & Sync" },
  { href: puckingAdmin.beans.path, label: "Beans" },
  { href: puckingAdmin.shots.path, label: "Shots" },
  { href: pa.equipment.grinders.path as string, label: "Grinders" },
  { href: pa.equipment.machines.path as string, label: "Machines" },
  { href: pa.equipment.tools.path as string, label: "Tools" },
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

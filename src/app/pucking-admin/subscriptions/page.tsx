"use client";

import { GenericDataTable, type ColumnDef } from "@/components/admin/GenericDataTable";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { ApiRoutes } from "@/app/routes";

interface AdminSubscription {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  stripeSubscriptionId: string | null;
  stripeProductId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

const statusColorMap: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  trialing: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  incomplete: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  canceled: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

const ENDPOINT = ApiRoutes.admin.subscriptions.path;

export default function AdminSubscriptionsPage() {
  const columns: ColumnDef<AdminSubscription>[] = [
    {
      key: "userEmail",
      label: "User",
      render: (v) => (
        <span className="font-mono text-xs">{v as string ?? "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => {
        const status = v as string;
        return (
          <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${statusColorMap[status] ?? statusColorMap.canceled}`}>
            {status}
          </span>
        );
      },
    },
    {
      key: "cancelAtPeriodEnd",
      label: "Canceling",
    },
    {
      key: "currentPeriodEnd",
      label: "Period End",
      render: (v) => {
        if (!v) return <span className="text-stone-400">—</span>;
        return (
          <span className="text-xs text-stone-600 dark:text-stone-400">
            {new Date(v as string).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: "stripeSubscriptionId",
      label: "Stripe Sub ID",
      render: (v) => (
        <span className="font-mono text-xs text-stone-400">
          {v ? String(v).slice(0, 20) + "…" : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
    },
  ];

  return (
    <>
      <AdminBreadcrumb segments={[{ label: "Subscriptions" }]} />
      <GenericDataTable<AdminSubscription>
        endpoint={ENDPOINT}
        columns={columns}
        title="Subscriptions"
        searchable
      />
    </>
  );
}

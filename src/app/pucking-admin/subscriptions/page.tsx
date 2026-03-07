"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  entitlementMismatch?: boolean;
}

const ENDPOINT = ApiRoutes.admin.subscriptions.path;
const subscriptionsRoutes = ApiRoutes.admin.subscriptions as unknown as {
  path: string;
  fixEntitlements: { path: string };
  mismatchCount: { path: string };
};
const FIX_ENTITLEMENTS_PATH = subscriptionsRoutes.fixEntitlements.path;
const MISMATCH_COUNT_PATH = subscriptionsRoutes.mismatchCount.path;

const statusColorMap: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  trialing: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  incomplete: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  canceled: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [fixingAll, setFixingAll] = useState(false);
  const [fixingUserId, setFixingUserId] = useState<string | null>(null);

  const { data: mismatchData } = useQuery<{ count: number }>({
    queryKey: ["admin-subscriptions-mismatch-count"],
    queryFn: async () => {
      const res = await fetch(
        `${typeof window !== "undefined" ? window.location.origin : ""}${MISMATCH_COUNT_PATH}`,
      );
      if (!res.ok) throw new Error("Failed to fetch mismatch count");
      return res.json();
    },
  });
  const mismatchCount = mismatchData?.count ?? 0;

  async function handleFixAll() {
    setFixingAll(true);
    try {
      const res = await fetch(
        `${typeof window !== "undefined" ? window.location.origin : ""}${FIX_ENTITLEMENTS_PATH}`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error("Fix failed");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-subscriptions-mismatch-count"] }),
        queryClient.invalidateQueries({ queryKey: [ENDPOINT] }),
      ]);
    } finally {
      setFixingAll(false);
    }
  }

  async function handleFixRow(userId: string) {
    setFixingUserId(userId);
    try {
      const res = await fetch(
        `${typeof window !== "undefined" ? window.location.origin : ""}${FIX_ENTITLEMENTS_PATH}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      if (!res.ok) throw new Error("Fix failed");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-subscriptions-mismatch-count"] }),
        queryClient.invalidateQueries({ queryKey: [ENDPOINT] }),
      ]);
    } finally {
      setFixingUserId(null);
    }
  }

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
      key: "entitlementMismatch",
      label: "JWT / Plan",
      render: (v, row) => {
        const mismatch = row.entitlementMismatch === true;
        if (mismatch) {
          return (
            <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              Mismatch
            </span>
          );
        }
        const isActive = row.status === "active" || row.status === "trialing";
        return isActive ? (
          <span className="text-xs text-stone-500 dark:text-stone-400">OK</span>
        ) : (
          <span className="text-stone-400">—</span>
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
      {mismatchCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{mismatchCount}</strong> subscription{mismatchCount !== 1 ? "s" : ""} with entitlement mismatch
            (active plan but JWT shows Free). Users should use Settings → Advance → Refresh JWT after fix.
          </p>
          <button
            type="button"
            onClick={handleFixAll}
            disabled={fixingAll}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {fixingAll ? "Fixing…" : "Fix all"}
          </button>
        </div>
      )}
      <GenericDataTable<AdminSubscription>
        endpoint={ENDPOINT}
        columns={columns}
        title="Subscriptions"
        searchable
        rowActions={(row) =>
          row.entitlementMismatch ? (
            <button
              type="button"
              onClick={() => handleFixRow(row.userId)}
              disabled={fixingUserId !== null}
              className="rounded border border-amber-600 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
            >
              {fixingUserId === row.userId ? "Fixing…" : "Fix"}
            </button>
          ) : null
        }
      />
    </>
  );
}

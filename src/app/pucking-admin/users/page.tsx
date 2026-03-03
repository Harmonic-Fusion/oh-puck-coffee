"use client";

import { useState } from "react";
import { GenericDataTable, type ColumnDef } from "@/components/admin/GenericDataTable";
import { UserRoleForm } from "@/components/admin/forms/UserRoleForm";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { ApiRoutes, AppRoutes } from "@/app/routes";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  emailVerified: string | null;
  isCustomName: boolean;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean | null;
  entitlements: string[];
}

const ENDPOINT = ApiRoutes.admin.users.path;

export default function AdminUsersPage() {
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);

  const columns: ColumnDef<AdminUser>[] = [
    {
      key: "email",
      label: "Email",
      render: (v) => (
        <span className="font-mono text-xs">{v as string ?? "—"}</span>
      ),
    },
    { key: "name", label: "Name" },
    {
      key: "role",
      label: "Role",
      render: (v) => {
        const role = v as string;
        const colorMap: Record<string, string> = {
          "super-admin": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
          admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
          member: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
        };
        return (
          <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${colorMap[role] ?? colorMap.member}`}>
            {role}
          </span>
        );
      },
    },
    {
      key: "subscriptionStatus",
      label: "Subscription",
      render: (v, row) => {
        if (!v) return <span className="text-stone-400">—</span>;
        const status = v as string;
        const colorMap: Record<string, string> = {
          active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          trialing: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
          incomplete: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
          canceled: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
        };
        return (
          <span className="flex items-center gap-1.5">
            <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${colorMap[status] ?? colorMap.canceled}`}>
              {status}
            </span>
            {row.cancelAtPeriodEnd && (
              <span className="text-xs text-red-500" title="Cancels at period end">⏳</span>
            )}
          </span>
        );
      },
    },
    {
      key: "entitlements",
      label: "Entitlements",
      render: (v) => {
        const list = v as string[];
        if (!list || list.length === 0) return <span className="text-stone-400">—</span>;
        return (
          <span className="flex flex-wrap gap-1">
            {list.map((e) => (
              <span
                key={e}
                className="inline-flex rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
              >
                {e}
              </span>
            ))}
          </span>
        );
      },
    },
    { key: "isCustomName", label: "Custom Name" },
    { key: "emailVerified", label: "Verified" },
    {
      key: "id",
      label: "ID",
      render: (v) => (
        <span className="font-mono text-xs text-stone-400">{String(v).slice(0, 8)}…</span>
      ),
    },
  ];

  return (
    <>
      <AdminBreadcrumb segments={[{ label: "Users" }]} />
      <GenericDataTable<AdminUser>
        endpoint={ENDPOINT}
        columns={columns}
        title="Users"
        searchable
        rowHref={(row) => `${AppRoutes.puckingAdmin.users.path}/${row.id}`}
        rowActions={(row) => (
          <button
            onClick={() => setEditTarget(row)}
            className="rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            Edit Role
          </button>
        )}
      />

      {editTarget && (
        <UserRoleForm
          open
          onClose={() => setEditTarget(null)}
          user={editTarget}
        />
      )}
    </>
  );
}

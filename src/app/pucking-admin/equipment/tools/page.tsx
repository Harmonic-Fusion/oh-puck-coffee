"use client";

import { useState } from "react";
import { GenericDataTable, type ColumnDef } from "@/components/admin/GenericDataTable";
import { ToolForm } from "@/components/admin/forms/ToolForm";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { ApiRoutes, AppRoutes } from "@/app/routes";

const { puckingAdmin } = AppRoutes;
const appEquipment = puckingAdmin.equipment as typeof puckingAdmin.equipment & {
  tools: { path: string };
};

interface AdminTool {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
}

const { equipment } = ApiRoutes.admin;
const adminEquipment = equipment as typeof equipment & { tools: { path: string } };
const ENDPOINT = adminEquipment.tools.path;

export default function AdminToolsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminTool | null>(null);

  const columns: ColumnDef<AdminTool>[] = [
    { key: "name", label: "Name" },
    {
      key: "slug",
      label: "Slug",
      render: (v) => (
        <span className="font-mono text-xs text-stone-500">{v as string}</span>
      ),
    },
    { key: "description", label: "Description" },
    { key: "createdAt", label: "Created" },
  ];

  return (
    <>
      <AdminBreadcrumb segments={[{ label: "Tools" }]} />
      <GenericDataTable<AdminTool>
        endpoint={ENDPOINT}
        columns={columns}
        title="Tools"
        rowHref={(row) => `${appEquipment.tools.path}/${row.id}`}
        toolbar={
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
          >
            + New Tool
          </button>
        }
        rowActions={(row) => (
          <button
            onClick={() => setEditTarget(row)}
            className="rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            Edit
          </button>
        )}
      />

      <ToolForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {editTarget && (
        <ToolForm
          open
          onClose={() => setEditTarget(null)}
          initial={editTarget}
        />
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { GenericDataTable, type ColumnDef } from "@/components/admin/GenericDataTable";
import { NameForm } from "@/components/admin/forms/NameForm";
import { ApiRoutes } from "@/app/routes";

interface AdminGrinder {
  id: string;
  name: string;
  createdAt: string;
}

const { equipment } = ApiRoutes.admin;
const adminEquipment = equipment as typeof equipment & { grinders: { path: string } };
const ENDPOINT = adminEquipment.grinders.path;

export default function AdminGrindersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminGrinder | null>(null);

  const columns: ColumnDef<AdminGrinder>[] = [
    { key: "name", label: "Name" },
    { key: "createdAt", label: "Created" },
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
      <GenericDataTable<AdminGrinder>
        endpoint={ENDPOINT}
        columns={columns}
        title="Grinders"
        toolbar={
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
          >
            + New Grinder
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

      <NameForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Grinder"
        endpoint={ENDPOINT}
        queryKey={ENDPOINT}
      />

      {editTarget && (
        <NameForm
          open
          onClose={() => setEditTarget(null)}
          title="Edit Grinder"
          endpoint={ENDPOINT}
          queryKey={ENDPOINT}
          initialName={editTarget.name}
          id={editTarget.id}
        />
      )}
    </>
  );
}

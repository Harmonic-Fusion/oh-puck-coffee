"use client";

import { useState } from "react";
import { GenericDataTable, type ColumnDef } from "@/components/admin/GenericDataTable";
import { NameForm } from "@/components/admin/forms/NameForm";
import { ApiRoutes } from "@/app/routes";

interface AdminMachine {
  id: string;
  name: string;
  createdAt: string;
}

const { equipment } = ApiRoutes.admin;
const adminEquipment = equipment as typeof equipment & { machines: { path: string } };
const ENDPOINT = adminEquipment.machines.path;

export default function AdminMachinesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminMachine | null>(null);

  const columns: ColumnDef<AdminMachine>[] = [
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
      <GenericDataTable<AdminMachine>
        endpoint={ENDPOINT}
        columns={columns}
        title="Machines"
        toolbar={
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
          >
            + New Machine
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
        title="New Machine"
        endpoint={ENDPOINT}
        queryKey={ENDPOINT}
      />

      {editTarget && (
        <NameForm
          open
          onClose={() => setEditTarget(null)}
          title="Edit Machine"
          endpoint={ENDPOINT}
          queryKey={ENDPOINT}
          initialName={editTarget.name}
          id={editTarget.id}
        />
      )}
    </>
  );
}

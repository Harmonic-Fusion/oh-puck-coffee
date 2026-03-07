"use client";

import { GenericDataTable, type ColumnDef } from "@/components/admin/GenericDataTable";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { ApiRoutes, AppRoutes } from "@/app/routes";

interface AdminBean {
  id: string;
  name: string;
  roastLevel: string;
  roaster: string | null;
  origin: string | null;
  processingMethod: string | null;
  roastDate: string | null;
  createdBy: string;
  userEmail: string | null;
  createdAt: string;
}

const columns: ColumnDef<AdminBean>[] = [
  { key: "name", label: "Bean Name" },
  { key: "roastLevel", label: "Roast" },
  { key: "roaster", label: "Roaster" },
  { key: "origin", label: "Origin" },
  { key: "processingMethod", label: "Process" },
  { key: "roastDate", label: "Roast Date" },
  {
    key: "userEmail",
    label: "User",
    render: (v) => (
      <span className="font-mono text-xs text-stone-500">{v as string ?? "—"}</span>
    ),
  },
  { key: "createdAt", label: "Created" },
];

export default function AdminBeansPage() {
  return (
    <>
      <AdminBreadcrumb segments={[{ label: "Beans" }]} />
      <GenericDataTable<AdminBean>
        endpoint={ApiRoutes.admin.beans.path}
        columns={columns}
        title="Beans"
        searchable
        rowHref={(row) => `${AppRoutes.puckingAdmin.beans.path}/${row.id}`}
      />
    </>
  );
}

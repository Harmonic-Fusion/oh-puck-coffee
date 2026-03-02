"use client";

import { GenericDataTable, type ColumnDef } from "@/components/admin/GenericDataTable";
import { ApiRoutes } from "@/app/routes";

interface AdminShot {
  id: string;
  userId: string;
  userEmail: string | null;
  beanId: string;
  beanName: string | null;
  grinderName: string | null;
  machineName: string | null;
  doseGrams: string | null;
  yieldGrams: string | null;
  yieldActualGrams: string | null;
  brewTimeSecs: string | null;
  rating: number | null;
  shotQuality: number | null;
  isReferenceShot: boolean;
  isHidden: boolean;
  createdAt: string;
}

const columns: ColumnDef<AdminShot>[] = [
  {
    key: "userEmail",
    label: "User",
    render: (v) => (
      <span className="font-mono text-xs text-stone-500">{v as string ?? "—"}</span>
    ),
  },
  { key: "beanName", label: "Bean" },
  { key: "grinderName", label: "Grinder" },
  { key: "machineName", label: "Machine" },
  {
    key: "doseGrams",
    label: "Dose",
    render: (v) => v ? `${v}g` : "—",
  },
  {
    key: "yieldActualGrams",
    label: "Yield",
    render: (v) => v ? `${v}g` : "—",
  },
  {
    key: "brewTimeSecs",
    label: "Time",
    render: (v) => v ? `${v}s` : "—",
  },
  { key: "rating", label: "Rating" },
  { key: "isReferenceShot", label: "Reference" },
  { key: "isHidden", label: "Hidden" },
  { key: "createdAt", label: "Created" },
];

export default function AdminShotsPage() {
  return (
    <GenericDataTable<AdminShot>
      endpoint={ApiRoutes.admin.shots.path}
      columns={columns}
      title="Shots"
    />
  );
}

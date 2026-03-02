"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AppRoutes } from "@/app/routes";

interface MachineDetail {
  id: string;
  name: string;
  createdAt: string;
}

const { puckingAdmin } = AppRoutes;
const equipment = puckingAdmin.equipment as typeof puckingAdmin.equipment & {
  machines: { path: string };
};

export default function AdminMachineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery<MachineDetail>({
    queryKey: ["admin-machine-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/equipment/machines/${id}`);
      if (!res.ok) throw new Error("Failed to fetch machine details");
      return res.json();
    },
  });

  return (
    <div>
      <AdminBreadcrumb
        segments={[
          { label: "Machines", href: equipment.machines.path },
          { label: isLoading ? "..." : data?.name ?? "Machine" },
        ]}
      />

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load machine details.
        </div>
      )}

      {isLoading && (
        <div className="h-32 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
      )}

      {data && (
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {data.name}
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-stone-100 py-2 dark:border-stone-800">
              <span className="text-stone-500 dark:text-stone-400">ID</span>
              <span className="font-mono text-stone-400">{data.id}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-stone-500 dark:text-stone-400">Created</span>
              <span className="text-stone-900 dark:text-stone-100">
                {new Date(data.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

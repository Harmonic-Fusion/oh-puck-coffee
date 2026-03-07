"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AppRoutes } from "@/app/routes";

interface BeanDetail {
  bean: {
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
  };
  shotCount: number;
  lastShot: string | null;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-stone-100 py-2.5 last:border-0 dark:border-stone-800">
      <span className="text-sm text-stone-500 dark:text-stone-400">{label}</span>
      <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
        {value || "—"}
      </span>
    </div>
  );
}

export default function AdminBeanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery<BeanDetail>({
    queryKey: ["admin-bean-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/beans/${id}`);
      if (!res.ok) throw new Error("Failed to fetch bean details");
      return res.json();
    },
  });

  return (
    <div>
      <AdminBreadcrumb
        segments={[
          { label: "Beans", href: AppRoutes.puckingAdmin.beans.path },
          { label: isLoading ? "..." : data?.bean.name ?? "Bean" },
        ]}
      />

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load bean details.
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
        </div>
      )}

      {data && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">
              {data.bean.name}
            </h2>
            <InfoRow label="Roast Level" value={data.bean.roastLevel} />
            <InfoRow label="Roaster" value={data.bean.roaster} />
            <InfoRow label="Origin" value={data.bean.origin} />
            <InfoRow label="Processing" value={data.bean.processingMethod} />
            <InfoRow
              label="Roast Date"
              value={data.bean.roastDate ? new Date(data.bean.roastDate).toLocaleDateString() : null}
            />
            <InfoRow
              label="Created"
              value={new Date(data.bean.createdAt).toLocaleDateString()}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Stats
              </p>
              <div className="mt-3 space-y-2">
                <InfoRow label="Total Shots" value={data.shotCount} />
                <InfoRow
                  label="Last Shot"
                  value={data.lastShot ? new Date(data.lastShot).toLocaleDateString() : "Never"}
                />
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Owner
              </p>
              <div className="mt-3">
                <InfoRow label="Email" value={
                  <Link
                    href={`${AppRoutes.puckingAdmin.users.path}/${data.bean.createdBy}`}
                    className="font-mono text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    {data.bean.userEmail}
                  </Link>
                } />
                <InfoRow label="User ID" value={
                  <span className="font-mono text-xs text-stone-400">{data.bean.createdBy.slice(0, 8)}...</span>
                } />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

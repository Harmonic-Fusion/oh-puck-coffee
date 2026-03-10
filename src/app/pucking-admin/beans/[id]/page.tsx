"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AppRoutes } from "@/app/routes";

interface BeanShare {
  id: string;
  userId: string;
  userEmail: string | null;
  status: string;
  shotHistoryAccess: string;
  reshareAllowed: boolean;
  createdAt: string;
}

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
  shares: BeanShare[];
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
        <>
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

        {/* Sharing table */}
        <div className="mt-6 rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Shares ({data.shares.length})
            </p>
          </div>
          {data.shares.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-400">No share records</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left dark:border-stone-800">
                    <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">Email</th>
                    <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">Status</th>
                    <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">Shot Access</th>
                    <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">Reshare</th>
                    <th className="px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
                  {data.shares.map((share) => (
                    <tr key={share.id}>
                      <td className="px-4 py-2">
                        <Link
                          href={`${AppRoutes.puckingAdmin.users.path}/${share.userId}`}
                          className="font-mono text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                        >
                          {share.userEmail ?? share.userId.slice(0, 8) + "…"}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                          share.status === "owner" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : share.status === "accepted" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : share.status === "pending" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                        }`}>
                          {share.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-stone-600 dark:text-stone-400">{share.shotHistoryAccess}</td>
                      <td className="px-4 py-2 text-xs text-stone-600 dark:text-stone-400">{share.reshareAllowed ? "Yes" : "No"}</td>
                      <td className="px-4 py-2 text-xs text-stone-500 dark:text-stone-400">
                        {new Date(share.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}

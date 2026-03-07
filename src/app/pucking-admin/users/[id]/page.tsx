"use client";

import { use, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { UserBillingForm } from "@/components/admin/forms/UserBillingForm";
import { AppRoutes } from "@/app/routes";

interface UserDetail {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    image: string | null;
    emailVerified: string | null;
    isCustomName: boolean;
  };
  subscription: {
    status: string;
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
  } | null;
  entitlements: string[];
  shotCount: number;
  lastShot: string | null;
  avgRating: number | null;
  avgQuality: number | null;
  shotsPerDay: { date: string; shots: number }[];
  dayOfWeek: { day: string; shots: number }[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string | number | null | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </p>
      <div className="mt-2">
        {isLoading ? (
          <div className="h-9 w-20 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
        ) : (
          <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">
            {value ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}

const roleColorMap: Record<string, string> = {
  "super-admin": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  member: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

const subStatusColorMap: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  trialing: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  incomplete: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  canceled: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

function SubscriptionBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${subStatusColorMap[status] ?? subStatusColorMap.canceled}`}>
        {status}
      </span>
      {cancelAtPeriodEnd && (
        <span className="text-xs text-red-500" title="Cancels at period end">⏳</span>
      )}
    </span>
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [billingOpen, setBillingOpen] = useState(false);

  const queryKey = ["admin-user-detail", id];
  const { data, isLoading, isError } = useQuery<UserDetail>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error("Failed to fetch user details");
      return res.json();
    },
  });

  const displayName = data?.user.name || data?.user.email || "User";

  return (
    <div>
      <AdminBreadcrumb
        segments={[
          { label: "Users", href: AppRoutes.puckingAdmin.users.path },
          { label: isLoading ? "..." : displayName },
        ]}
      />

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load user details.
        </div>
      )}

      {/* User Info Card */}
      {data && (
        <div className="mb-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <div className="flex items-center gap-4">
            {data.user.image && (
              <Image
                src={data.user.image}
                alt=""
                width={48}
                height={48}
                className="rounded-full"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {data.user.name || "No name"}
              </h1>
              <p className="font-mono text-sm text-stone-500 dark:text-stone-400">
                {data.user.email || "No email"}
              </p>
            </div>
            <span
              className={`ml-auto inline-flex rounded px-2 py-0.5 text-xs font-medium ${roleColorMap[data.user.role] ?? roleColorMap.member}`}
            >
              {data.user.role}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
            <span>
              Verified: {data.user.emailVerified ? new Date(data.user.emailVerified).toLocaleDateString() : "No"}
            </span>
            <span>Custom Name: {data.user.isCustomName ? "Yes" : "No"}</span>
            <span className="font-mono text-stone-400">ID: {data.user.id.slice(0, 8)}...</span>
            <Link
              href={`${AppRoutes.puckingAdmin.beans.path}?userId=${data.user.id}`}
              className="ml-auto text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
            >
              View Beans →
            </Link>
          </div>

          {/* Billing */}
          <div className="mt-5 border-t border-stone-100 pt-5 dark:border-stone-800">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Billing
              </p>
              <button
                onClick={() => setBillingOpen(true)}
                className="text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Edit
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {data.subscription ? (
                <>
                  <SubscriptionBadge
                    status={data.subscription.status}
                    cancelAtPeriodEnd={data.subscription.cancelAtPeriodEnd}
                  />
                  {data.subscription.currentPeriodEnd && (
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {data.subscription.cancelAtPeriodEnd ? "Access until" : "Renews"}{" "}
                      {new Date(data.subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </span>
                  )}
                  {data.subscription.stripeSubscriptionId && (
                    <span className="font-mono text-xs text-stone-400">
                      {data.subscription.stripeSubscriptionId}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-stone-400">No subscription</span>
              )}
            </div>
            {data.entitlements.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.entitlements.map((e) => (
                  <span
                    key={e}
                    className="inline-flex rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Shots" value={data?.shotCount} isLoading={isLoading} />
        <StatCard
          label="Last Shot"
          value={data?.lastShot ? new Date(data.lastShot).toLocaleDateString() : "Never"}
          isLoading={isLoading}
        />
        <StatCard
          label="Avg Rating"
          value={data?.avgRating != null ? data.avgRating.toFixed(1) : null}
          isLoading={isLoading}
        />
        <StatCard
          label="Avg Quality"
          value={data?.avgQuality != null ? data.avgQuality.toFixed(1) : null}
          isLoading={isLoading}
        />
      </div>

      {/* Shots Over Time */}
      <div className="mb-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Shots Over Time — Last 90 Days
        </p>
        {isLoading ? (
          <div className="h-48 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
        ) : !data?.shotsPerDay.some((d) => d.shots > 0) ? (
          <p className="py-12 text-center text-sm text-stone-400">No shots in the last 90 days</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data.shotsPerDay}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-stone-200 dark:stroke-stone-700"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => formatDate(v)}
                interval={13}
                className="fill-stone-500 dark:fill-stone-400"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                className="fill-stone-500 dark:fill-stone-400"
              />
              <Tooltip
                labelFormatter={(v) => formatDate(v as string)}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #e7e5e4",
                }}
              />
              <Bar
                dataKey="shots"
                name="Shots"
                fill="#b45309"
                radius={[2, 2, 0, 0]}
                maxBarSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {data && billingOpen && (
        <UserBillingForm
          open
          onClose={() => setBillingOpen(false)}
          userId={id}
          subscription={data.subscription}
          entitlements={data.entitlements}
          queryKey={queryKey}
        />
      )}

      {/* Day of Week */}
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Shots by Day of Week
        </p>
        {isLoading ? (
          <div className="h-48 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
        ) : !data?.dayOfWeek.some((d) => d.shots > 0) ? (
          <p className="py-12 text-center text-sm text-stone-400">No shot data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.dayOfWeek}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-stone-200 dark:stroke-stone-700"
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                className="fill-stone-500 dark:fill-stone-400"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                className="fill-stone-500 dark:fill-stone-400"
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #e7e5e4",
                }}
              />
              <Bar
                dataKey="shots"
                name="Shots"
                fill="#b45309"
                radius={[3, 3, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

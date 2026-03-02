"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from "recharts";

interface ShotsByDay {
  date: string;
  shots: number;
  activeUsers: number;
}

interface AdminStatsData {
  totalUsers: number;
  dailyActiveUsers: number;
  totalShots: number;
  shotsPerDay: ShotsByDay[];
}

async function fetchAdminStats(): Promise<AdminStatsData> {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) throw new Error("Failed to fetch admin stats");
  return res.json();
}

function StatCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number | undefined;
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
          <p className="text-4xl font-bold text-stone-900 dark:text-stone-100">
            {(value ?? 0).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AdminMetrics() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    staleTime: 60_000,
  });

  return (
    <div className="mb-8 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Users"
          value={data?.totalUsers}
          isLoading={isLoading}
        />
        <StatCard
          label="Daily Active Users"
          value={data?.dailyActiveUsers}
          isLoading={isLoading}
        />
        <StatCard
          label="Total Shots"
          value={data?.totalShots}
          isLoading={isLoading}
        />
      </div>

      {/* Activity Chart */}
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Activity — Last 14 Days
        </p>
        {isLoading ? (
          <div className="h-48 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
        ) : data?.shotsPerDay.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-400">
            No shots logged in the last 14 days
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart
              data={data?.shotsPerDay.map((d) => ({
                ...d,
                date: formatDate(d.date),
              }))}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-stone-200 dark:stroke-stone-700"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-stone-500 dark:fill-stone-400"
              />
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                className="fill-stone-500 dark:fill-stone-400"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
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
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar
                yAxisId="left"
                dataKey="shots"
                name="Shots Pulled"
                fill="#b45309"
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
              />
              <Line
                yAxisId="right"
                dataKey="activeUsers"
                name="Active Users"
                stroke="#78716c"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

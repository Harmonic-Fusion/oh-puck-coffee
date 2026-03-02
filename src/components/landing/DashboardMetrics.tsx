"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface LeaderboardEntry {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  shotCount: number;
}

interface DashboardData {
  dailyActiveUsers: number;
  leaderboard: LeaderboardEntry[];
}

const LIMIT_OPTIONS = [5, 10, 25, 50];

async function fetchDashboard(limit: number): Promise<DashboardData> {
  const res = await fetch(`/api/stats/dashboard?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export function DashboardMetrics() {
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", limit],
    queryFn: () => fetchDashboard(limit),
  });

  return (
    <section className="bg-stone-50 py-16 dark:bg-stone-900 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
            Community Stats
          </h2>
          <p className="mt-2 text-lg text-stone-600 dark:text-stone-400">
            See how the community is dialing in their shots
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Daily Active Users */}
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Daily Active Brewers
            </h3>
            <div className="mt-4 flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-14 w-24 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
              ) : (
                <>
                  <span className="text-6xl font-bold text-amber-700 dark:text-amber-500">
                    {data?.dailyActiveUsers ?? 0}
                  </span>
                  <span className="text-lg text-stone-500 dark:text-stone-400">
                    users in the last 24h
                  </span>
                </>
              )}
            </div>
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              Unique users who pulled a shot in the last 24 hours
            </p>
          </div>

          {/* Leaderboard */}
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Shot Leaderboard
              </h3>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-md border border-stone-200 bg-white px-2 py-1 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    Top {n}
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded bg-stone-100 dark:bg-stone-700"
                  />
                ))}
              </div>
            ) : (
              <ol className="mt-4 space-y-2">
                {data?.leaderboard.length === 0 ? (
                  <li className="py-4 text-center text-sm text-stone-400">
                    No shots logged yet — be the first!
                  </li>
                ) : (
                  data?.leaderboard.map((entry, index) => (
                    <li
                      key={entry.userId}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            index === 0
                              ? "bg-amber-500 text-white"
                              : index === 1
                                ? "bg-stone-300 text-stone-700 dark:bg-stone-600 dark:text-stone-200"
                                : index === 2
                                  ? "bg-amber-700/30 text-amber-800 dark:text-amber-400"
                                  : "bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                          {entry.userName || entry.userEmail?.split("@")[0] || "Anonymous"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-500">
                        {entry.shotCount} shots
                      </span>
                    </li>
                  ))
                )}
              </ol>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

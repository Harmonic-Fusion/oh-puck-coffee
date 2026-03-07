"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";

export default function SettingsAdvancePage() {
  const { data: session, update } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRefreshJwt() {
    setRefreshing(true);
    setMessage(null);
    try {
      const updated = await update();
      if (updated) {
        setMessage("Session refreshed. Role, entitlements, and plan are up to date.");
      } else {
        setMessage("Refreshed (no session).");
      }
    } catch {
      setMessage("Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={AppRoutes.settings.path}
          className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Settings
        </Link>
        <span className="text-stone-300 dark:text-stone-600">&rsaquo;</span>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Advance
        </h1>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Session
        </h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Refresh your session to reload role, entitlements, and plan from the server. Use this if billing or plan changed and the app still shows old data.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshJwt}
            disabled={refreshing}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {refreshing ? "Refreshing…" : "Refresh JWT"}
          </button>
          {message && (
            <span className="text-sm text-stone-500 dark:text-stone-400">
              {message}
            </span>
          )}
        </div>
        {session?.user && (
          <div className="mt-4 rounded-lg bg-stone-50 p-3 font-mono text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            <div>subType: {session.user.subType ?? "—"}</div>
            <div>role: {session.user.role ?? "—"}</div>
            <div>entitlements: [{session.user.entitlements?.join(", ") ?? ""}]</div>
          </div>
        )}
      </div>
    </div>
  );
}

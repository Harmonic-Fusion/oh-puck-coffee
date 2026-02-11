"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppRoutes } from "@/app/routes";
import { QRCode } from "@/components/common/QRCode";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [appUrl, setAppUrl] = useState<string>("");

  useEffect(() => {
    // Get the current app URL
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Settings
        </h1>
      </div>

      <div className="space-y-4">
        {/* Profile section */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-800 dark:text-stone-200">
            Profile
          </h2>
          <div className="flex items-center gap-4">
            {session?.user?.image && (
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="h-14 w-14 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-stone-800 dark:text-stone-200">
                {session?.user?.name || "User"}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {session?.user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Integrations link */}
        <Link
          href={AppRoutes.settingsIntegrations.path}
          className="block rounded-xl border border-stone-200 bg-white p-6 transition-colors hover:border-amber-300 hover:bg-amber-50/50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-amber-800 dark:hover:bg-amber-950/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                Integrations
              </h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Link your Google Sheet to sync shot data
              </p>
            </div>
            <span className="text-stone-400">→</span>
          </div>
        </Link>

        {/* QR Code for espresso station access */}
        {appUrl && (
          <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-lg font-semibold text-stone-800 dark:text-stone-200">
              Espresso Station Access
            </h2>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
              Scan this QR code at your espresso station to quickly access the app
            </p>
            <div className="flex flex-col items-center gap-4">
              <QRCode value={appUrl} size={200} title="Espresso Station Access" />
              <div className="text-center">
                <p className="text-xs font-mono text-stone-400 dark:text-stone-500 break-all">
                  {appUrl}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

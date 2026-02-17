"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppRoutes, ApiRoutes } from "@/app/routes";
import { QRCode } from "@/components/common/QRCode";

interface LinkedAccount {
  provider: string;
  type: string;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  isCustomName: boolean;
  linkedAccounts: LinkedAccount[];
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "google":
      return "Google";
    case "github":
      return "GitHub";
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}

function ProfileDetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="w-32 shrink-0 text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
        {label}
      </dt>
      <dd className="text-sm text-stone-800 dark:text-stone-200">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const [appUrl, setAppUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  // Fetch full profile (includes isCustomName + linkedAccounts)
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const res = await fetch(ApiRoutes.users.me.path);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Sync input when profile loads
  useEffect(() => {
    if (profile) {
      setNameInput(profile.name ?? "");
    }
  }, [profile]);

  const saveName = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(ApiRoutes.users.me.path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update name");
      }
      return res.json() as Promise<UserProfile>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      await updateSession();
      setIsEditing(false);
    },
  });

  const resetName = useMutation({
    mutationFn: async () => {
      const res = await fetch(ApiRoutes.users.me.path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to reset name");
      }
      return res.json() as Promise<UserProfile>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      await updateSession();
      setIsEditing(false);
    },
  });

  function handleStartEdit() {
    setNameInput(profile?.name ?? session?.user?.name ?? "");
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setNameInput(profile?.name ?? "");
  }

  function handleSave() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    saveName.mutate(trimmed);
  }

  const displayName = profile?.name ?? session?.user?.name ?? "User";
  const email = profile?.email ?? session?.user?.email;
  const image = profile?.image ?? session?.user?.image;
  const providers = profile?.linkedAccounts ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Profile
        </h1>
      </div>

      <div className="space-y-4">
        {/* Profile section */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
          {/* Avatar + name header */}
          <div className="mb-6 flex items-center gap-5">
            {image ? (
              <img
                src={image}
                alt={displayName}
                className="h-20 w-20 rounded-full border-2 border-stone-200 dark:border-stone-700"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                {displayName[0]?.toUpperCase() ?? "?"}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="display-name"
                      className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400"
                    >
                      Display name
                    </label>
                    <input
                      id="display-name"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                        if (e.key === "Escape") handleCancel();
                      }}
                      maxLength={100}
                      autoFocus
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-base font-semibold text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saveName.isPending || !nameInput.trim()}
                      className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
                    >
                      {saveName.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saveName.isPending}
                      className="rounded-lg px-3 py-1 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                    >
                      Cancel
                    </button>
                    {profile?.isCustomName && (
                      <button
                        onClick={() => resetName.mutate()}
                        disabled={resetName.isPending}
                        className="ml-auto rounded-lg px-3 py-1 text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                        title="Reset to name from your Google account"
                      >
                        {resetName.isPending
                          ? "Resetting…"
                          : "Reset to Google name"}
                      </button>
                    )}
                  </div>
                  {saveName.isError && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {saveName.error.message}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-stone-800 dark:text-stone-200 truncate">
                      {displayName}
                    </p>
                    <button
                      onClick={handleStartEdit}
                      className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                      title="Edit display name"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    {profile?.isCustomName && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        Custom
                      </span>
                    )}
                  </div>
                  {email && (
                    <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400 truncate">
                      {email}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detail rows */}
          <dl className="space-y-3 border-t border-stone-100 pt-5 dark:border-stone-800">
            {email && (
              <ProfileDetailRow label="Email">
                {email}
              </ProfileDetailRow>
            )}

            {providers.length > 0 && (
              <ProfileDetailRow label="Sign-in">
                <span className="inline-flex flex-wrap items-center gap-2">
                  {providers.map((a) => (
                    <span
                      key={a.provider}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    >
                      {a.provider === "google" && (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                      {providerLabel(a.provider)}
                    </span>
                  ))}
                </span>
              </ProfileDetailRow>
            )}

            <ProfileDetailRow label="User ID">
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {profile?.id ?? session?.user?.id ?? "—"}
              </code>
            </ProfileDetailRow>
          </dl>
        </div>

        {/* Integrations link */}
        <Link
          href={AppRoutes.settings.integrations.path}
          className="block rounded-xl border border-stone-200 bg-white p-6 transition-colors hover:border-amber-300 hover:bg-amber-50/50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-amber-800 dark:hover:bg-amber-950/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                  Integrations
                </h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  Coming Soon
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Sync shot data with Google Sheets and more
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

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: AppRoutes.login.path })}
          className="w-full rounded-xl bg-amber-600 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

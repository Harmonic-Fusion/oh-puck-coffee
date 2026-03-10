"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { Button } from "@/components/common/Button";
import { Entitlements, FreeEntitlementDefaults } from "@/shared/entitlements";

const CATALOG_URL = "/api/admin/billing/catalog";
const SYNC_URL = "/api/admin/billing/sync";

const LOCAL_ENTITLEMENT_KEYS = new Set<string>(Object.values(Entitlements));

interface StripePrice {
  id: string;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
  intervalCount: number | null;
  lookupKey: string | null;
}

interface StripeFeature {
  id: string;
  name: string;
  lookupKey: string | null;
  active: boolean;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  defaultPrice: string | object | null;
  features: StripeFeature[];
  prices: StripePrice[];
}

interface CatalogData {
  products: StripeProduct[];
  features: StripeFeature[];
}

interface SyncResult {
  userId: string;
  email: string | null;
  stripeCustomerId: string;
  subscription: "upserted" | "none" | "error";
  entitlements: number | "error";
  error?: string;
}

interface SyncResponse {
  synced: number;
  errors: number;
  total: number;
  results: SyncResult[];
}

function formatPrice(price: StripePrice): string {
  const amount = price.unitAmount != null ? (price.unitAmount / 100).toFixed(2) : "?";
  const currency = price.currency.toUpperCase();
  const interval = price.interval
    ? `/${price.intervalCount && price.intervalCount > 1 ? price.intervalCount + " " : ""}${price.interval}`
    : "";
  return `${currency} ${amount}${interval}`;
}

export default function AdminBillingPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [syncError, setSyncError] = useState("");

  const { data, isLoading, error } = useQuery<CatalogData>({
    queryKey: ["admin", "billing", "catalog"],
    queryFn: async () => {
      const res = await fetch(CATALOG_URL);
      if (!res.ok) throw new Error("Failed to load catalog");
      return res.json();
    },
  });

  async function handleSync() {
    setSyncing(true);
    setSyncError("");
    setSyncResult(null);
    try {
      const res = await fetch(SYNC_URL, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSyncError(body.error ?? "Sync failed");
        return;
      }
      setSyncResult(await res.json());
    } catch {
      setSyncError("Network error");
    } finally {
      setSyncing(false);
    }
  }

  // Compare local Entitlements with Stripe features
  const mismatch = useMemo(() => {
    if (!data) return null;

    const stripeKeys = new Set(
      data.features
        .filter((f) => f.lookupKey && f.active)
        .map((f) => f.lookupKey!),
    );

    const missingInStripe = [...LOCAL_ENTITLEMENT_KEYS].filter(
      (k) => !stripeKeys.has(k),
    );
    const missingInCode = [...stripeKeys].filter(
      (k) => !LOCAL_ENTITLEMENT_KEYS.has(k),
    );

    if (missingInStripe.length === 0 && missingInCode.length === 0)
      return null;

    return { missingInStripe, missingInCode };
  }, [data]);

  return (
    <>
      <AdminBreadcrumb segments={[{ label: "Billing & Sync" }]} />

      <div className="space-y-8">
        {/* Entitlement mismatch warning */}
        {mismatch && (
          <div className="rounded-lg border-2 border-red-300 bg-red-50 px-5 py-4 dark:border-red-700 dark:bg-red-900/20">
            <h2 className="text-sm font-bold text-red-700 dark:text-red-400">
              Entitlement Mismatch
            </h2>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              The entitlement keys in{" "}
              <code className="rounded bg-red-100 px-1 py-0.5 font-mono dark:bg-red-900/40">
                shared/entitlements.ts
              </code>{" "}
              do not match the active features in Stripe.
            </p>
            <div className="mt-3 space-y-2">
              {mismatch.missingInStripe.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                    In code but missing in Stripe:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {mismatch.missingInStripe.map((k) => (
                      <span
                        key={k}
                        className="rounded bg-red-100 px-2 py-0.5 font-mono text-xs text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {mismatch.missingInCode.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                    In Stripe but missing in code:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {mismatch.missingInCode.map((k) => (
                      <span
                        key={k}
                        className="rounded bg-red-100 px-2 py-0.5 font-mono text-xs text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              Billing & Sync
            </h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Stripe catalog and manual sync for all users with a Stripe customer ID.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            loading={syncing}
            onClick={handleSync}
          >
            Sync All from Stripe
          </Button>
        </div>

        {/* Sync result */}
        {syncError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {syncError}
          </div>
        )}

        {syncResult && (
          <div className="rounded-md border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
            <div className="flex items-center gap-6 border-b border-stone-200 px-4 py-3 dark:border-stone-700">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                Sync complete
              </span>
              <span className="text-sm text-stone-500 dark:text-stone-400">
                {syncResult.synced} subscription{syncResult.synced !== 1 ? "s" : ""} upserted
                &nbsp;·&nbsp;
                {syncResult.errors} error{syncResult.errors !== 1 ? "s" : ""}
                &nbsp;·&nbsp;
                {syncResult.total} user{syncResult.total !== 1 ? "s" : ""} with Stripe ID
              </span>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-stone-700/50">
              {syncResult.results.map((r) => (
                <div
                  key={r.userId}
                  className="flex items-center gap-3 px-4 py-2 text-xs"
                >
                  <span className="w-48 truncate font-mono text-stone-500 dark:text-stone-400">
                    {r.email ?? r.userId}
                  </span>
                  <span
                    className={
                      r.subscription === "upserted"
                        ? "text-green-600 dark:text-green-400"
                        : r.subscription === "error"
                        ? "text-red-500 dark:text-red-400"
                        : "text-stone-400"
                    }
                  >
                    sub: {r.subscription}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">
                    ent:{" "}
                    {r.entitlements === "error" ? (
                      <span className="text-red-500 dark:text-red-400">error</span>
                    ) : (
                      r.entitlements
                    )}
                  </span>
                  {r.error && (
                    <span className="truncate text-red-500 dark:text-red-400" title={r.error}>
                      {r.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Catalog */}
        <section>
          <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Stripe Catalog
          </h2>

          {isLoading && (
            <p className="text-sm text-stone-400">Loading catalog…</p>
          )}

          {error && (
            <p className="text-sm text-red-500">Failed to load Stripe catalog.</p>
          )}

          {data && (
            <div className="space-y-4">
              {data.products.length === 0 && (
                <p className="text-sm text-stone-400">No active products found in Stripe.</p>
              )}
              {data.products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800/60"
                >
                  {/* Product header */}
                  <div className="flex items-start justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-700">
                    <div>
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                          {product.description}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-xs text-stone-400 dark:text-stone-500">
                        {product.id}
                      </p>
                    </div>
                    <span
                      className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
                        product.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400"
                      }`}
                    >
                      {product.active ? "active" : "inactive"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-0 divide-x divide-stone-100 dark:divide-stone-700">
                    {/* Features */}
                    <div className="px-4 py-3">
                      <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                        Entitlement Features
                      </p>
                      {product.features.length === 0 ? (
                        <p className="text-xs text-stone-400">None</p>
                      ) : (
                        <ul className="space-y-1">
                          {product.features.map((f) => (
                            <li key={f.id} className="flex items-center gap-2">
                              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                {f.lookupKey ?? f.name}
                              </span>
                              <span className="text-xs text-stone-500 dark:text-stone-400">
                                {f.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Prices */}
                    <div className="px-4 py-3">
                      <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                        Prices
                      </p>
                      {product.prices.length === 0 ? (
                        <p className="text-xs text-stone-400">None</p>
                      ) : (
                        <ul className="space-y-1">
                          {product.prices.map((p) => (
                            <li key={p.id} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                                {formatPrice(p)}
                              </span>
                              {p.lookupKey && (
                                <span className="font-mono text-xs text-stone-400 dark:text-stone-500">
                                  {p.lookupKey}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Local entitlements */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Local Entitlements (shared/entitlements.ts)
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(Entitlements).map(([key, value]) => {
              const isFree = FreeEntitlementDefaults.includes(value);
              return (
                <div
                  key={key}
                  className="rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-800/60"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs font-medium text-stone-800 dark:text-stone-200">
                      {value}
                    </p>
                    {isFree && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        free
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-stone-400 dark:text-stone-500">
                    {key}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* All Stripe features */}
        {data && data.features.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
              All Stripe Entitlement Features
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.features.map((f) => (
                <div
                  key={f.id}
                  className="rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-800/60"
                >
                  <p className="text-xs font-medium text-stone-800 dark:text-stone-200">
                    {f.name}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-stone-400 dark:text-stone-500">
                    {f.lookupKey ?? f.id}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

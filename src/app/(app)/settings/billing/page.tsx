"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { AppRoutes, ApiRoutes } from "@/app/routes";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";

// ── Types ─────────────────────────────────────────────────────────────

interface Subscription {
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
  stripeProductId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface StripePrice {
  id: string;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
}

interface StripeFeature {
  id: string;
  name: string;
  lookupKey: string;
  active: boolean;
}

interface StripePlan {
  id: string;
  name: string;
  description: string | null;
  prices: StripePrice[];
  entitlements: string[];
}

interface PlansResponse {
  plans: StripePlan[];
  features: StripeFeature[];
}

// ── Helpers ───────────────────────────────────────────────────────────

const KNOWN_ENTITLEMENT_KEYS = new Set(Object.values(Entitlements));

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  [Entitlements.NO_SHOT_VIEW_LIMIT]:
    "Access your complete shot history with no cap on older entries",
  [Entitlements.STATS_VIEW]:
    "Detailed analytics, trends, and insights across all your shots",
};

function statusLabel(status: Subscription["status"]): string {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Past Due";
    case "canceled":
      return "Canceled";
    case "incomplete":
      return "Incomplete";
  }
}

function statusColor(status: Subscription["status"]): string {
  switch (status) {
    case "active":
    case "trialing":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
    case "past_due":
    case "incomplete":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
    case "canceled":
      return "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400";
  }
}

function formatPrice(price: StripePrice): string {
  if (price.unitAmount == null) return "Contact us";
  const amount = price.unitAmount / 100;
  const formatted = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
  const interval = price.interval ? `/${price.interval}` : "";
  return `$${formatted}${interval}`;
}

// ── Component ─────────────────────────────────────────────────────────

export default function Billing2Page() {
  const { data: session } = useSession();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: subscription, isLoading: subLoading } =
    useQuery<Subscription | null>({
      queryKey: ["billing", "subscription"],
      queryFn: async () => {
        const res = await fetch("/api/billing/subscription");
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to fetch subscription");
        return res.json();
      },
    });

  const { data: plansData, isLoading: plansLoading } =
    useQuery<PlansResponse>({
      queryKey: ["billing", "plans"],
      queryFn: async () => {
        const res = await fetch(ApiRoutes.billing.plans.path);
        if (!res.ok) throw new Error("Failed to fetch plans");
        return res.json();
      },
    });

  const isLoading = subLoading || plansLoading;

  const isProUser = hasEntitlement(
    session?.user.entitlements,
    Entitlements.NO_SHOT_VIEW_LIMIT,
  );

  // Build features list filtered to known entitlements
  const knownFeatures = useMemo(
    () =>
      (plansData?.features ?? []).filter((f) =>
        KNOWN_ENTITLEMENT_KEYS.has(
          f.lookupKey as (typeof Entitlements)[keyof typeof Entitlements],
        ),
      ),
    [plansData],
  );

  // Determine current plan info
  const currentPlan = useMemo(() => {
    if (!subscription || subscription.status === "canceled") return null;
    return (plansData?.plans ?? []).find(
      (p) => p.id === subscription.stripeProductId,
    );
  }, [subscription, plansData]);

  const currentPlanName = currentPlan?.name ?? "Free";

  async function handleCheckout(priceId: string) {
    setActionLoading(priceId);
    setActionError(null);
    try {
      const res = await fetch(ApiRoutes.billing.checkout.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to start checkout");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong");
      setActionLoading(null);
    }
  }

  async function handleManageSubscription() {
    setActionLoading("manage");
    setActionError(null);
    try {
      const res = await fetch(ApiRoutes.billing.portal.path, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to open billing portal");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong");
      setActionLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={AppRoutes.settings.path}
          className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Settings
        </Link>
        <span className="text-stone-300 dark:text-stone-600">&rsaquo;</span>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Billing
        </h1>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
          <div className="h-64 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Current Plan Card ─────────────────────────────── */}
          <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
            <div className="border-b border-stone-100 px-6 py-4 dark:border-stone-800">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Current Plan
              </h2>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-stone-800 dark:text-stone-200">
                      {currentPlanName}
                    </span>
                    {subscription &&
                      subscription.status !== "canceled" && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(subscription.status)}`}
                        >
                          {statusLabel(subscription.status)}
                        </span>
                      )}
                    {!currentPlan && (
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                        Free
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  {currentPlan && currentPlan.prices[0] && (
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                      {formatPrice(currentPlan.prices[0])}
                    </p>
                  )}
                  {!currentPlan && (
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                      $0 — no subscription
                    </p>
                  )}

                  {/* Renewal / cancellation info */}
                  {subscription &&
                    subscription.status !== "canceled" &&
                    subscription.currentPeriodEnd && (
                      <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
                        {subscription.cancelAtPeriodEnd ? "Access until" : "Renews"}{" "}
                        {new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  {subscription?.cancelAtPeriodEnd && (
                    <p className="mt-1 text-xs font-medium text-red-500 dark:text-red-400">
                      Cancels at period end
                    </p>
                  )}
                </div>

                {/* Manage button — only for paid subscribers */}
                {currentPlan && subscription?.status !== "canceled" && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={actionLoading !== null}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    {actionLoading === "manage"
                      ? "Loading…"
                      : "Manage Billing"}
                  </button>
                )}
              </div>

              {/* Entitlement features for current plan */}
              {currentPlan && knownFeatures.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
                  {knownFeatures.map((f) => {
                    const included = currentPlan.entitlements.includes(
                      f.lookupKey,
                    );
                    return (
                      <span
                        key={f.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          included
                            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-stone-50 text-stone-400 line-through dark:bg-stone-800 dark:text-stone-500"
                        }`}
                      >
                        {included ? "✓" : "—"} {f.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Plan Comparison Table ─────────────────────────── */}
          <section className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
                  {/* Label column */}
                  <th className="w-40 px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Compare Plans
                  </th>

                  {/* Free column */}
                  <th className="min-w-[160px] border-l border-stone-200 px-5 py-4 text-center dark:border-stone-700">
                    <PlanColumnHeader
                      name="Free"
                      description="Get started tracking your espresso"
                      isCurrent={!currentPlan}
                    />
                  </th>

                  {/* Stripe plan columns */}
                  {(plansData?.plans ?? []).map((plan) => {
                    const isPlanCurrent =
                      isProUser &&
                      subscription?.stripeProductId === plan.id &&
                      subscription?.status !== "canceled";

                    return (
                      <th
                        key={plan.id}
                        className="min-w-[160px] border-l border-stone-200 px-5 py-4 text-center dark:border-stone-700"
                      >
                        <PlanColumnHeader
                          name={plan.name}
                          description={plan.description}
                          isCurrent={isPlanCurrent}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {/* Price row */}
                <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                  <td className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">
                    Price
                  </td>
                  <td className="border-l border-stone-200 px-5 py-3 text-center font-mono text-sm text-stone-700 dark:border-stone-700 dark:text-stone-300">
                    Free
                  </td>
                  {(plansData?.plans ?? []).map((plan) => {
                    const primaryPrice = plan.prices[0] ?? null;
                    return (
                      <td
                        key={plan.id}
                        className="border-l border-stone-200 px-5 py-3 text-center font-mono text-sm text-stone-700 dark:border-stone-700 dark:text-stone-300"
                      >
                        {primaryPrice ? formatPrice(primaryPrice) : "—"}
                      </td>
                    );
                  })}
                </tr>

                {/* Feature rows */}
                {knownFeatures.map((feature) => (
                  <tr
                    key={feature.id}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/30"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                          {feature.name}
                        </span>
                        {FEATURE_DESCRIPTIONS[feature.lookupKey] && (
                          <span className="group/tip relative inline-flex">
                            <svg
                              className="h-3 w-3 shrink-0 text-stone-300 dark:text-stone-600"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0-9a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 6zm0-1.5a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-44 -translate-x-1/2 rounded-md bg-stone-800 px-2.5 py-1.5 text-[10px] leading-snug text-stone-100 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 dark:bg-stone-700">
                              {FEATURE_DESCRIPTIONS[feature.lookupKey]}
                              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-800 dark:border-t-stone-700" />
                            </span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Free column — no entitlements */}
                    <td className="border-l border-stone-200 px-5 py-3 text-center text-stone-300 dark:border-stone-700 dark:text-stone-600">
                      —
                    </td>

                    {/* Stripe plan columns */}
                    {(plansData?.plans ?? []).map((plan) => {
                      const included = plan.entitlements.includes(
                        feature.lookupKey,
                      );
                      return (
                        <td
                          key={plan.id}
                          className={`border-l border-stone-200 px-5 py-3 text-center dark:border-stone-700 ${
                            included
                              ? "text-green-600 dark:text-green-400"
                              : "text-stone-300 dark:text-stone-600"
                          }`}
                        >
                          {included ? "✓" : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Action row */}
                <tr className="border-t border-stone-200 bg-stone-50/50 dark:border-stone-700 dark:bg-stone-800/30">
                  <td className="px-5 py-4" />

                  {/* Free action */}
                  <td className="border-l border-stone-200 px-5 py-4 text-center dark:border-stone-700">
                    {!currentPlan ? (
                      <span className="inline-block rounded-lg bg-stone-100 px-4 py-2 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                        Current Plan
                      </span>
                    ) : subscription?.status !== "canceled" ? (
                      <button
                        onClick={handleManageSubscription}
                        disabled={actionLoading !== null}
                        className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-700 disabled:opacity-50 dark:border-stone-600 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-300"
                      >
                        {actionLoading === "manage" ? "Loading…" : "Cancel Plan"}
                      </button>
                    ) : null}
                  </td>

                  {/* Stripe plan actions */}
                  {(plansData?.plans ?? []).map((plan) => {
                    const primaryPrice = plan.prices[0] ?? null;
                    const isPlanCurrent =
                      isProUser &&
                      subscription?.stripeProductId === plan.id &&
                      subscription?.status !== "canceled";

                    return (
                      <td
                        key={plan.id}
                        className="border-l border-stone-200 px-5 py-4 text-center dark:border-stone-700"
                      >
                        {isPlanCurrent ? (
                          <span className="inline-block rounded-lg bg-stone-100 px-4 py-2 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                            Current Plan
                          </span>
                        ) : primaryPrice ? (
                          <button
                            onClick={() => handleCheckout(primaryPrice.id)}
                            disabled={actionLoading !== null}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
                          >
                            {actionLoading === primaryPrice.id
                              ? "Loading…"
                              : currentPlan
                                ? "Switch Plan"
                                : "Upgrade"}
                          </button>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </section>

          <p className="text-center text-xs text-stone-400 dark:text-stone-500">
            Subscription management is handled securely by Stripe.
          </p>
        </div>
      )}
    </div>
  );
}

// ── PlanColumnHeader ──────────────────────────────────────────────────

function PlanColumnHeader({
  name,
  description,
  isCurrent,
}: {
  name: string;
  description: string | null;
  isCurrent: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-1">
      {/* Plan name */}
      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold text-stone-800 dark:text-stone-200">
          {name}
        </span>

        {/* Description tooltip */}
        {description && (
          <span className="group/tip relative inline-flex">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-stone-300 dark:text-stone-600"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0-9a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 6zm0-1.5a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75z"
                clipRule="evenodd"
              />
            </svg>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-44 -translate-x-1/2 rounded-md bg-stone-800 px-2.5 py-1.5 text-[10px] leading-snug text-stone-100 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 dark:bg-stone-700">
              {description}
              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-800 dark:border-t-stone-700" />
            </span>
          </span>
        )}
      </div>

      {/* Active badge */}
      {isCurrent && (
        <span className="rounded-full bg-amber-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white dark:bg-amber-700">
          Active
        </span>
      )}
    </div>
  );
}

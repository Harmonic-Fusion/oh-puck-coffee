"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { AppRoutes, ApiRoutes } from "@/app/routes";
import {
  ALL_ENTITLEMENT_KEYS,
  Entitlements,
  FreeEntitlementDefaults,
  getEntitlementDef,
} from "@/shared/entitlements";
import type { EntitlementKey } from "@/shared/entitlements";
import { Card } from "@/components/common/Card";

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

function isPlanCurrent(
  plan: StripePlan,
  subscription: Subscription | null,
  isProUser: boolean,
): boolean {
  return (
    isProUser === true &&
    subscription != null &&
    subscription.stripeProductId === plan.id &&
    subscription.status !== "canceled"
  );
}

// Repeated table cell class names (DRY)
const TABLE = {
  thPlan: "min-w-[160px] border-l border-stone-200 px-5 py-4 text-center dark:border-stone-700",
  tdPlanCenter:
    "border-l border-stone-200 px-5 py-3 text-center font-mono text-sm text-stone-700 dark:border-stone-700 dark:text-stone-300",
  tdPlanMuted:
    "border-l border-stone-200 px-5 py-3 text-center text-stone-300 dark:border-stone-700 dark:text-stone-600",
  tdPlanFeature: (included: boolean) =>
    `border-l border-stone-200 px-5 py-3 text-center dark:border-stone-700 ${
      included ? "text-green-600 dark:text-green-400" : "text-stone-300 dark:text-stone-600"
    }`,
  tdAction: "border-l border-stone-200 px-5 py-4 text-center dark:border-stone-700",
} as const;

const TABLE_MIN_WIDTH = "min-w-[40rem]";

async function runBillingAction(
  key: string,
  setLoading: (k: string | null) => void,
  setError: (e: string | null) => void,
  fetchFn: () => Promise<Response>,
): Promise<void> {
  setLoading(key);
  setError(null);
  try {
    const res = await fetchFn();
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Request failed");
    }
    const { url } = await res.json();
    window.location.href = url;
  } catch (e) {
    setError(e instanceof Error ? e.message : "Something went wrong");
    setLoading(null);
  }
}

function CurrentPlanPill() {
  return (
    <span className="inline-block rounded-lg bg-stone-100 px-4 py-2 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
      Current Plan
    </span>
  );
}

// ── Private helper components ─────────────────────────────────────────

function BillingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
      <div className="h-64 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
    </div>
  );
}

function InfoTooltip({
  description,
  iconClassName = "h-3 w-3 shrink-0 text-stone-300 dark:text-stone-600",
}: {
  description: string;
  iconClassName?: string;
}) {
  return (
    <span className="group/tip relative inline-flex">
      <svg
        className={iconClassName}
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
  );
}

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
      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold text-stone-800 dark:text-stone-200">
          {name}
        </span>
        {description && (
          <InfoTooltip
            description={description}
            iconClassName="h-3.5 w-3.5 shrink-0 text-stone-300 dark:text-stone-600"
          />
        )}
      </div>
      {isCurrent && (
        <span className="rounded-full bg-amber-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white dark:bg-amber-700">
          Active
        </span>
      )}
    </div>
  );
}

function CurrentPlanCard({
  subscription,
  currentPlan,
  currentPlanName,
  knownFeatures,
  actionLoading,
  onManageSubscription,
}: {
  subscription: Subscription | null;
  currentPlan: StripePlan | null;
  currentPlanName: string;
  knownFeatures: StripeFeature[];
  actionLoading: string | null;
  onManageSubscription: () => void;
}) {
  return (
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
              {subscription && subscription.status !== "canceled" && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(subscription.status)}`}
                >
                  {statusLabel(subscription.status)}
                </span>
              )}
              {!currentPlan && currentPlanName === "Free" && (
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                  Free
                </span>
              )}
            </div>
            {currentPlan?.prices[0] && (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {formatPrice(currentPlan.prices[0])}
              </p>
            )}
            {!currentPlan && (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                $0 — no subscription
              </p>
            )}
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
          {currentPlan && subscription?.status !== "canceled" && (
            <button
              onClick={onManageSubscription}
              disabled={actionLoading !== null}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {actionLoading === "manage" ? "Loading…" : "Manage Billing"}
            </button>
          )}
        </div>
        {currentPlan && knownFeatures.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
            {knownFeatures.map((f) => {
              const included = currentPlan.entitlements.includes(f.lookupKey);
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
  );
}

function PlanComparisonTable({
  plans,
  entitlementKeys,
  currentPlan,
  subscription,
  isProUser,
  actionLoading,
  onCheckout,
  onManageSubscription,
}: {
  plans: StripePlan[];
  entitlementKeys: EntitlementKey[];
  currentPlan: StripePlan | null;
  subscription: Subscription | null;
  isProUser: boolean;
  actionLoading: string | null;
  onCheckout: (priceId: string) => void;
  onManageSubscription: () => void;
}) {
  return (
    <Card className="overflow-x-auto">
      <table
        className={`w-full table-fixed text-sm ${TABLE_MIN_WIDTH} border-collapse`}
      >
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
            <th className="w-40 px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Compare Plans
            </th>
            <th className={TABLE.thPlan}>
              <PlanColumnHeader
                name="Free"
                description="Get started tracking your espresso"
                isCurrent={!currentPlan}
              />
            </th>
            {plans.map((plan) => (
              <th key={plan.id} className={TABLE.thPlan}>
                <PlanColumnHeader
                  name={plan.name}
                  description={plan.description}
                  isCurrent={isPlanCurrent(plan, subscription, isProUser)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
            <td className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">
              Price
            </td>
            <td className={TABLE.tdPlanCenter}>
              Free
            </td>
            {plans.map((plan) => {
              const primaryPrice = plan.prices[0] ?? null;
              return (
                <td key={plan.id} className={TABLE.tdPlanCenter}>
                  {primaryPrice ? formatPrice(primaryPrice) : "—"}
                </td>
              );
            })}
          </tr>
          {entitlementKeys.map((key) => {
            const freeIncluded = FreeEntitlementDefaults.includes(key);
            const { label, description } = getEntitlementDef(key);
            return (
              <tr
                key={key}
                className="hover:bg-stone-50 dark:hover:bg-stone-800/30"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                      {label}
                    </span>
                    {description && (
                      <InfoTooltip description={description} />
                    )}
                  </div>
                </td>
                <td className={TABLE.tdPlanFeature(freeIncluded)}>
                  {freeIncluded ? "✓" : "—"}
                </td>
                {plans.map((plan) => {
                  const included = plan.entitlements.includes(key);
                  return (
                    <td key={plan.id} className={TABLE.tdPlanFeature(included)}>
                      {included ? "✓" : "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="border-t border-stone-200 bg-stone-50/50 dark:border-stone-700 dark:bg-stone-800/30">
            <td className="px-5 py-4" />
            <td className={TABLE.tdAction}>
              {!currentPlan ? (
                <CurrentPlanPill />
              ) : subscription?.status !== "canceled" ? (
                <button
                  onClick={onManageSubscription}
                  disabled={actionLoading !== null}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-700 disabled:opacity-50 dark:border-stone-600 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-300"
                >
                  {actionLoading === "manage" ? "Loading…" : "Cancel Plan"}
                </button>
              ) : null}
            </td>
            {plans.map((plan) => {
              const primaryPrice = plan.prices[0] ?? null;
              const planIsCurrent = isPlanCurrent(plan, subscription, isProUser);
              return (
                <td key={plan.id} className={TABLE.tdAction}>
                  {planIsCurrent ? (
                    <CurrentPlanPill />
                  ) : primaryPrice ? (
                    <button
                      onClick={() => onCheckout(primaryPrice.id)}
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
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

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

  const isProUser = session?.user?.subType === "pro";

  // Build features list filtered to known entitlements
  const knownFeatures = useMemo(() => {
    const features = plansData?.features ?? [];
    const allowed = FreeEntitlementDefaults;
    return allowed
      .map((key) => features.find((f) => f.lookupKey === key))
      .filter((f): f is StripeFeature => f != null);
  }, [plansData]);

  // Determine current plan info
  const currentPlan = useMemo(() => {
    if (!subscription || subscription.status === "canceled") return null;
    return (plansData?.plans ?? []).find(
      (p) => p.id === subscription.stripeProductId,
    );
  }, [subscription, plansData]);

  const currentPlanName =
    session?.user?.subType === "pro"
      ? (currentPlan?.name ?? "Pro")
      : "Free";

  function handleCheckout(priceId: string) {
    runBillingAction(
      priceId,
      setActionLoading,
      setActionError,
      () =>
        fetch(ApiRoutes.billing.checkout.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId }),
        }),
    );
  }

  function handleManageSubscription() {
    runBillingAction("manage", setActionLoading, setActionError, () =>
      fetch(ApiRoutes.billing.portal.path, { method: "POST" }),
    );
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
        <BillingSkeleton />
      ) : (
        <div className="space-y-6">
          <CurrentPlanCard
            subscription={subscription ?? null}
            currentPlan={currentPlan ?? null}
            currentPlanName={currentPlanName}
            knownFeatures={knownFeatures}
            actionLoading={actionLoading}
            onManageSubscription={handleManageSubscription}
          />
          <PlanComparisonTable
            plans={plansData?.plans ?? []}
            entitlementKeys={ALL_ENTITLEMENT_KEYS}
            currentPlan={currentPlan ?? null}
            subscription={subscription ?? null}
            isProUser={isProUser}
            actionLoading={actionLoading}
            onCheckout={handleCheckout}
            onManageSubscription={handleManageSubscription}
          />
          <p className="text-center text-xs text-stone-400 dark:text-stone-500">
            Subscription management is handled securely by Stripe.
          </p>
        </div>
      )}
    </div>
  );
}

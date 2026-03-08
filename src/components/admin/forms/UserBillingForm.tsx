"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/common/Toast";
import { Entitlements } from "@/shared/entitlements";

const SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "incomplete", "canceled"] as const;
type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

const KNOWN_ENTITLEMENTS = Object.values(Entitlements);

interface Subscription {
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface UserBillingFormProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  subscription: Subscription | null;
  entitlements: string[];
  queryKey: unknown[];
}

export function UserBillingForm({
  open,
  onClose,
  userId,
  subscription,
  entitlements,
  queryKey,
}: UserBillingFormProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Subscription form state
  const [status, setStatus] = useState<SubscriptionStatus>(
    (subscription?.status as SubscriptionStatus) ?? "active"
  );
  const [periodEnd, setPeriodEnd] = useState(
    subscription?.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd).toISOString().slice(0, 10)
      : ""
  );
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(
    subscription?.cancelAtPeriodEnd ?? false
  );
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Entitlements state
  const [entitlementLoading, setEntitlementLoading] = useState<string | null>(null);
  const [addKey, setAddKey] = useState<string>(KNOWN_ENTITLEMENTS[0] ?? "");
  const [entError, setEntError] = useState("");

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey });
  }

  async function handleSaveSubscription(e: React.FormEvent) {
    e.preventDefault();
    setSubLoading(true);
    setSubError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          currentPeriodEnd: periodEnd || null,
          cancelAtPeriodEnd,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubError(data.error || "Request failed");
        return;
      }
      await invalidate();
    } catch {
      setSubError("Network error");
    } finally {
      setSubLoading(false);
    }
  }

  async function handleDeleteSubscription() {
    setDeleteLoading(true);
    setSubError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubError(data.error || "Request failed");
        return;
      }
      await invalidate();
      showToast("success", "Subscription record deleted.");
      onClose();
    } catch {
      setSubError("Network error");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleRevokeEntitlement(key: string) {
    setEntitlementLoading(key);
    setEntError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/entitlements`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookupKey: key }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEntError(data.error || "Request failed");
        return;
      }
      await invalidate();
    } catch {
      setEntError("Network error");
    } finally {
      setEntitlementLoading(null);
    }
  }

  async function handleAddEntitlement(e: React.FormEvent) {
    e.preventDefault();
    if (!addKey) return;
    setEntitlementLoading("add");
    setEntError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/entitlements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookupKey: addKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEntError(data.error || "Request failed");
        return;
      }
      await invalidate();
    } catch {
      setEntError("Network error");
    } finally {
      setEntitlementLoading(null);
    }
  }

  return (
    <>
    <Modal open={open} onClose={onClose} title="Manage Billing">
      <div className="space-y-6">

        {/* Subscription */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Subscription
          </h3>
          <form onSubmit={handleSaveSubscription} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                {SUBSCRIPTION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Current Period End
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={cancelAtPeriodEnd}
                onChange={(e) => setCancelAtPeriodEnd(e.target.checked)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-stone-700 dark:text-stone-300">Cancel at period end</span>
            </label>

            {subError && (
              <p className="text-xs text-red-600 dark:text-red-400">{subError}</p>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" size="sm" loading={subLoading}>
                {subscription ? "Update" : "Create"} Subscription
              </Button>
              {subscription && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={deleteLoading}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                >
                  {deleteLoading ? "Deleting…" : "Delete record"}
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Divider */}
        <div className="border-t border-stone-100 dark:border-stone-800" />

        {/* Entitlements */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Entitlements
          </h3>

          {entitlements.length === 0 ? (
            <p className="mb-3 text-xs text-stone-400">No entitlements granted.</p>
          ) : (
            <div className="mb-3 flex flex-wrap gap-2">
              {entitlements.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                >
                  {key}
                  <button
                    type="button"
                    onClick={() => handleRevokeEntitlement(key)}
                    disabled={entitlementLoading === key}
                    className="ml-0.5 text-purple-400 hover:text-purple-600 disabled:opacity-40 dark:hover:text-purple-300"
                    aria-label={`Revoke ${key}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleAddEntitlement} className="flex items-center gap-2">
            <select
              value={addKey}
              onChange={(e) => setAddKey(e.target.value)}
              className="flex-1 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              {KNOWN_ENTITLEMENTS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              loading={entitlementLoading === "add"}
            >
              Grant
            </Button>
          </form>

          {entError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{entError}</p>
          )}
        </section>

      </div>
    </Modal>
    <ConfirmDialog
      open={confirmDeleteOpen}
      onOpenChange={setConfirmDeleteOpen}
      title="Delete subscription record?"
      description="This only removes the DB record, not the Stripe subscription."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
      loading={deleteLoading}
      onConfirm={handleDeleteSubscription}
    />
    </>
  );
}

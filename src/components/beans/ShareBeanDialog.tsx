"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/common/Modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import {
  useBeanShares,
  useBeanShotsWithShared,
  useCreateBeanShare,
  useUpdateBeanShare,
  useUpdateGeneralAccess,
  useUserSearch,
  type BeanShareItem,
  type BeanShotWithUser,
  type UserSearchResult,
} from "@/components/beans/hooks";
import { Entitlements, hasEntitlement } from "@/shared/entitlements";
import { AppRoutes, resolvePath } from "@/app/routes";
import {
  LinkIcon,
  UserPlusIcon,
  XMarkIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const GENERAL_ACCESS_OPTIONS: {
  value: "restricted" | "anyone_with_link";
  label: string;
}[] = [
  { value: "restricted", label: "Only people added" },
  { value: "anyone_with_link", label: "Anyone with the link" },
];

interface ShareCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

function ShareCheckbox({
  checked,
  onChange,
  disabled = false,
  label,
}: ShareCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded border-stone-300 text-amber-600 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {label}
    </label>
  );
}

// ─── Shot History Preview ─────────────────────────────────────────────────────

function fmtNum(v: string | number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "—" : n.toFixed(decimals);
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ShotRowProps {
  shot: BeanShotWithUser;
}

function ShotRow({ shot }: ShotRowProps) {
  const metrics = [
    shot.doseGrams ? `${fmtNum(shot.doseGrams)}g` : null,
    shot.yieldGrams ? `→ ${fmtNum(shot.yieldGrams)}g` : null,
    shot.brewTimeSecs ? `${fmtNum(shot.brewTimeSecs)}s` : null,
    shot.grindLevel ? `grind ${fmtNum(shot.grindLevel, 2)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="text-stone-500 dark:text-stone-400 shrink-0">
        {fmtDate(shot.createdAt)}
      </span>
      <span className="truncate text-stone-600 dark:text-stone-400 font-mono">
        {metrics || "—"}
      </span>
      {shot.rating && (
        <span className="shrink-0 font-medium text-amber-600 dark:text-amber-400">
          ★ {parseFloat(shot.rating).toFixed(1)}
        </span>
      )}
    </li>
  );
}

interface ShotHistoryPreviewProps {
  beanId: string;
}

function ShotHistoryPreview({ beanId }: ShotHistoryPreviewProps) {
  const { data: shotsData, isLoading } = useBeanShotsWithShared(beanId);

  const visibleShots = (shotsData?.shots ?? []).filter((s) => !s.isHidden);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-6 animate-pulse rounded bg-stone-100 dark:bg-stone-800"
          />
        ))}
      </div>
    );
  }

  if (visibleShots.length === 0) {
    return (
      <p className="text-xs text-stone-400 dark:text-stone-500 py-1">
        No shots logged yet.
      </p>
    );
  }

  return (
    <ul className="max-h-48 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
      {visibleShots.map((shot) => (
        <ShotRow key={shot.id} shot={shot} />
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface ShareBeanDialogProps {
  open: boolean;
  onClose: () => void;
  beanId: string;
  beanName: string;
}

export function ShareBeanDialog({
  open,
  onClose,
  beanId,
  beanName,
}: ShareBeanDialogProps) {
  const { data: session } = useSession();
  const hasBeanShareEntitlement = hasEntitlement(
    session?.user?.entitlements,
    Entitlements.BEANS_SHARE,
  );

  const { data: sharesData, isLoading } = useBeanShares(beanId);
  const isOwner = sharesData?.isOwner ?? false;
  const createShare = useCreateBeanShare(beanId);
  const updateShare = useUpdateBeanShare(beanId);
  const updateGeneralAccess = useUpdateGeneralAccess(beanId);

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [reshareAllowed, setReshareAllowed] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [increaseToLinkConfirmOpen, setIncreaseToLinkConfirmOpen] = useState(false);

  const { data: searchResults = [], isFetching: searchLoading } =
    useUserSearch(userSearchQuery);

  // Find current user's own membership row
  const myMembership = sharesData?.members.find(
    (m) => m.userId === session?.user?.id,
  );

  const handleAddPerson = useCallback(async () => {
    if (!selectedUser) return;
    setErrorMessage(null);
    try {
      await createShare.mutateAsync({
        userId: selectedUser.id,
        reshareAllowed: isOwner ? reshareAllowed : false,
      });
      setSelectedUser(null);
      setUserSearchQuery("");
      setReshareAllowed(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
    }
  }, [selectedUser, reshareAllowed, createShare, isOwner]);

  const handleReshareToggle = useCallback(
    async (member: BeanShareItem) => {
      if (member.userId === session?.user?.id) return;
      setErrorMessage(null);
      try {
        await updateShare.mutateAsync({
          shareId: member.id,
          reshareAllowed: !member.reshareAllowed,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMessage(message);
      }
    },
    [updateShare, session?.user?.id],
  );

  const handleMyShotHistoryAccessChange = useCallback(
    async (value: "none" | "restricted" | "anyone_with_link") => {
      if (!myMembership) return;
      setErrorMessage(null);
      try {
        await updateShare.mutateAsync({
          shareId: myMembership.id,
          shotHistoryAccess: value,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMessage(message);
      }
    },
    [updateShare, myMembership],
  );

  const handleGeneralAccessChange = useCallback(
    async (value: "restricted" | "anyone_with_link") => {
      setErrorMessage(null);
      const current = sharesData?.generalAccess ?? "restricted";
      if (current === "restricted" && value === "anyone_with_link") {
        setIncreaseToLinkConfirmOpen(true);
        return;
      }
      try {
        await updateGeneralAccess.mutateAsync({
          generalAccess: value,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMessage(message);
      }
    },
    [updateGeneralAccess, sharesData?.generalAccess],
  );

  const handleCopyLink = useCallback(() => {
    if (!sharesData?.shareSlug) return;
    const slugRoute = (
      AppRoutes.share.beans as unknown as {
        slug: { path: string };
      }
    ).slug;
    const path = resolvePath(slugRoute, {
      slug: sharesData.shareSlug,
    });
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : "";
    void navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [sharesData]);

  const canCopyLink =
    sharesData &&
    sharesData.generalAccess !== "restricted" &&
    sharesData.shareSlug;

  const isLimitReached =
    errorMessage?.toLowerCase().includes("maximum") ||
    errorMessage?.toLowerCase().includes("limit");

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={`Share "${beanName}"`}
      fullHeight={false}
    >
      <div className="space-y-6">
        {errorMessage && (
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              isLimitReached
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200",
            )}
          >
            {errorMessage}
            {isLimitReached && (
              <p className="mt-1 text-xs opacity-90">
                Upgrade your plan for more shares.
              </p>
            )}
          </div>
        )}

        {/* Add people — owner always; non-owner when reshareAllowed or anyone_with_link */}
        {(isOwner ||
          myMembership?.reshareAllowed ||
          sharesData?.generalAccess === "anyone_with_link") && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              Add people
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div
                className={cn(
                  "min-w-0",
                  userSearchQuery.trim().length >= 2 && "min-h-[13rem]",
                )}
              >
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder:text-stone-500"
                />
                {userSearchQuery.trim().length >= 2 && (
                  <div className="relative">
                    <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                      {searchLoading ? (
                        <li className="px-3 py-2 text-sm text-stone-400">
                          Searching…
                        </li>
                      ) : searchResults.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-stone-400">
                          No users found
                        </li>
                      ) : (
                        searchResults.map((user) => (
                          <li key={user.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setUserSearchQuery(user.name ?? user.id);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
                            >
                              {user.image ? (
                                <Image
                                  src={user.image}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              ) : (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-400">
                                  {(user.name ?? user.id)
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </span>
                              )}
                              <span className="truncate">
                                {user.name ?? "Unnamed user"}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
              {selectedUser && (
                <div className="grid grid-cols-1 gap-3 border-t border-stone-200 pt-3 dark:border-stone-700">
                    {isOwner && (
                    <div>
                    <ShareCheckbox
                      checked={reshareAllowed}
                      onChange={setReshareAllowed}
                      disabled={!hasBeanShareEntitlement}
                      label="Allow reshare"
                    />
                    {!hasBeanShareEntitlement && (
                      <Link
                        href={AppRoutes.billing.path}
                        className="mt-0.5 block text-xs text-amber-600 hover:underline dark:text-amber-400"
                      >
                        Upgrade to enable
                      </Link>
                    )}
                  </div>
                    )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddPerson}
                      disabled={
                        createShare.isPending || !hasBeanShareEntitlement
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
                    >
                      <UserPlusIcon className="h-4 w-4" />
                      {createShare.isPending ? "Adding…" : "Add"}
                    </button>
                    {!hasBeanShareEntitlement && (
                      <Link
                        href={AppRoutes.billing.path}
                        className="text-xs text-amber-600 hover:underline dark:text-amber-400"
                      >
                        Upgrade to share with others
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setUserSearchQuery("");
                      }}
                      className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Current members — unified list including owner */}
        {!isLoading && sharesData && sharesData.members.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              People with access
            </h3>
            <ul className="space-y-1.5 rounded-lg border border-stone-200 bg-stone-50/50 p-2 dark:border-stone-700 dark:bg-stone-800/30">
              {sharesData.members.map((member) => {
                const isOwnerRow = member.userId === sharesData.createdBy;
                const isSelf = member.userId === session?.user?.id;
                const showReshareToggle =
                  isOwner && !isSelf && !isOwnerRow;

                return (
                  <li
                    key={member.id}
                    className="flex flex-col gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {member.userImage ? (
                          <Image
                            src={member.userImage}
                            alt=""
                            width={24}
                            height={24}
                            className="shrink-0 rounded-full"
                          />
                        ) : (
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                              isOwnerRow
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                : "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400",
                            )}
                          >
                            {(member.userName ?? "?").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span
                          className={cn(
                            "truncate",
                            isOwnerRow || isSelf
                              ? "font-medium text-stone-800 dark:text-stone-200"
                              : "text-stone-700 dark:text-stone-300",
                          )}
                        >
                          {member.userName ?? "Unnamed user"}
                          {isSelf && !isOwnerRow && (
                            <span className="ml-1 text-stone-400 dark:text-stone-500">
                              (you)
                            </span>
                          )}
                        </span>
                        {isOwnerRow && (
                          <span className="flex shrink-0 items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                            <StarIcon className="h-3 w-3" />
                            Owner
                          </span>
                        )}
                        {!isOwnerRow && (
                          <span
                            className={
                              member.status === "pending"
                                ? "shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                : "shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-400"
                            }
                          >
                            {member.status === "pending"
                              ? "Pending"
                              : member.status === "self"
                                ? "Follower"
                                : "Accepted"}
                          </span>
                        )}
                        {(member.shotHistoryAccess === "anyone_with_link" ||
                            member.reshareAllowed) && (
                            <span className="shrink-0 text-xs text-stone-400">
                              {member.shotHistoryAccess === "anyone_with_link" &&
                                "Shares shots"}
                              {member.shotHistoryAccess === "anyone_with_link" &&
                                member.reshareAllowed &&
                                " · "}
                              {!isOwnerRow &&
                                member.reshareAllowed &&
                                "Can reshare"}
                            </span>
                          )}
                      </div>
                      {showReshareToggle && (
                        <div className="flex shrink-0 items-center gap-2">
                          <Switch
                            checked={member.reshareAllowed}
                            onCheckedChange={() => handleReshareToggle(member)}
                            disabled={
                              !hasBeanShareEntitlement ||
                              updateShare.isPending
                            }
                            aria-label="Allow Reshare"
                          />
                          <span className="text-sm text-stone-600 dark:text-stone-400">
                            Allow Reshare
                          </span>
                          {!hasBeanShareEntitlement && (
                            <Link
                              href={AppRoutes.billing.path}
                              className="text-xs text-amber-600 hover:underline dark:text-amber-400"
                            >
                              Upgrade
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* My Shot History — visible for all share levels; copy reflects who can see */}
        {myMembership && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              My Shot History
            </h3>
            <div className="rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2 dark:border-stone-700 dark:bg-stone-800/30">
              <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">
                {myMembership.shotHistoryAccess === "none"
                  ? "Your shots are never shared. Only you can see them."
                  : myMembership.shotHistoryAccess === "restricted"
                    ? "Only other members of this bean can see your shots."
                    : "Visible to other members and any authenticated user with the link."}
              </p>
              <ShotHistoryPreview beanId={beanId} />
              <div className="mt-3 border-t border-stone-200 pt-3 dark:border-stone-700">
                <label
                  htmlFor="share-my-shot-history"
                  className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-400"
                >
                  Share my shot history
                </label>
                <select
                  id="share-my-shot-history"
                  value={myMembership.shotHistoryAccess}
                  onChange={(e) =>
                    handleMyShotHistoryAccessChange(
                      e.target.value as
                        | "none"
                        | "restricted"
                        | "anyone_with_link",
                    )
                  }
                  disabled={updateShare.isPending}
                  className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800 focus:border-amber-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                >
                  <option value="none">No</option>
                  <option value="restricted">Restricted</option>
                  <option value="anyone_with_link">Anyone with the link</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* General access */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            General access
          </h3>
          <div className="space-y-3">
            <select
              value={sharesData?.generalAccess ?? "restricted"}
              onChange={(e) =>
                handleGeneralAccessChange(
                  e.target.value as "restricted" | "anyone_with_link",
                )
              }
              disabled={!isOwner || updateGeneralAccess.isPending}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            >
              {GENERAL_ACCESS_OPTIONS.filter(
                (opt) =>
                  (sharesData?.generalAccess ?? "restricted") !== "anyone_with_link" ||
                  opt.value === "anyone_with_link",
              ).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Copy link */}
        {canCopyLink && (
          <section>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={
                  sharesData?.shareSlug && typeof window !== "undefined"
                    ? `${window.location.origin}${resolvePath(
                        (
                          AppRoutes.share.beans as unknown as {
                            slug: { path: string };
                          }
                        ).slug,
                        { slug: sharesData.shareSlug },
                      )}`
                    : ""
                }
                className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                <LinkIcon className="h-4 w-4" />
                {copySuccess ? "Copied!" : "Copy link"}
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
    <ConfirmDialog
      open={increaseToLinkConfirmOpen}
      onOpenChange={setIncreaseToLinkConfirmOpen}
      title="Allow anyone with the link?"
      description="People with the link will be able to add themselves to this bean and log shots. This cannot be undone — you cannot change back to &quot;Only people added&quot; later. Continue?"
      confirmLabel="Continue"
      variant="danger"
      loading={updateGeneralAccess.isPending}
      onConfirm={async () => {
        try {
          await updateGeneralAccess.mutateAsync({
            generalAccess: "anyone_with_link",
          });
          setIncreaseToLinkConfirmOpen(false);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          setErrorMessage(message);
        }
      }}
    />
    </>
  );
}

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  useParams,
  useSearchParams,
  useRouter,
  usePathname,
} from "next/navigation";
import {
  useBean,
  useBeanShotsWithShared,
  useUpdateBean,
  useBeans,
  useDuplicateBean,
} from "@/components/beans/hooks";
import { BeanFormModal } from "@/components/beans/BeanSelector";
import { ShareBeanDialog } from "@/components/beans/ShareBeanDialog";
import { AppRoutes, resolvePath } from "@/app/routes";
import { ROAST_LEVELS } from "@/shared/beans/constants";
import type { RoastLevel, ProcessingMethod } from "@/shared/beans/constants";
import {
  ChevronRightIcon,
  PencilSquareIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

// ── Sub-components ────────────────────────────────────────────────────
import { SharedWith } from "./__components__/SharedWith";
import { BeanInfoGrid } from "./__components__/BeanInfoGrid";
import {
  ComparisonMatrix,
  serializeSlot,
  deserializeSlot,
} from "./__components__/ComparisonMatrix";
import type { SlotConfig } from "./__components__/ComparisonMatrix";
import { BeanShotsSection } from "./__components__/BeanShotsSection";
import { DuplicateBeanModal } from "./__components__/DuplicateBeanModal";
import { AiShotSuggestion } from "@/components/ai-suggestions/AiShotSuggestion";

// ── Page ──────────────────────────────────────────────────────────────

export default function BeanDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.id as string;

  const { data: bean, isLoading, refetch } = useBean(id);
  const { data: shotsData, isLoading: shotsLoading } = useBeanShotsWithShared(id);
  const { data: allBeans } = useBeans();
  const updateBean = useUpdateBean();
  const duplicateBean = useDuplicateBean();

  const shots = shotsData?.shots ?? [];
  const contributors = shotsData?.contributors ?? [];

  // Derive the current user — the contributor marked isCurrentUser
  const currentContributor = contributors.find((c) => c.isCurrentUser);
  const currentUserId = currentContributor?.userId ?? "";

  // ── Edit modal state ─────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editOrigin, setEditOrigin] = useState("");
  const [editRoaster, setEditRoaster] = useState("");
  const [editOriginDetails, setEditOriginDetails] = useState("");
  const [editProcessing, setEditProcessing] = useState("");
  const [editRoast, setEditRoast] = useState<string>(ROAST_LEVELS[2]);
  const [editRoastDate, setEditRoastDate] = useState("");
  const [editOpenBagDate, setEditOpenBagDate] = useState("");
  const [editIsRoastDateBestGuess, setEditIsRoastDateBestGuess] =
    useState(false);

  const handleEditOpen = useCallback(() => {
    if (!bean) return;
    setEditName(bean.name);
    setEditOrigin(bean.origin ?? "");
    setEditRoaster(bean.roaster ?? "");
    setEditOriginDetails(bean.originDetails ?? "");
    setEditProcessing(bean.processingMethod ?? "");
    setEditRoast(bean.roastLevel);
    setEditRoastDate(
      bean.roastDate
        ? new Date(bean.roastDate).toISOString().split("T")[0]
        : "",
    );
    setEditOpenBagDate(
      bean.userBean?.openBagDate
        ? new Date(bean.userBean.openBagDate).toISOString().split("T")[0]
        : "",
    );
    setEditIsRoastDateBestGuess(bean.isRoastDateBestGuess ?? false);
    setShowEdit(true);
  }, [
    bean,
    setEditName,
    setEditOrigin,
    setEditRoaster,
    setEditOriginDetails,
    setEditProcessing,
    setEditRoast,
    setEditRoastDate,
    setEditOpenBagDate,
    setEditIsRoastDateBestGuess,
    setShowEdit,
  ]);

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    await updateBean.mutateAsync({
      id,
      data: {
        name: editName.trim(),
        origin: editOrigin.trim() || undefined,
        roaster: editRoaster.trim() || undefined,
        originDetails: editOriginDetails.trim() || undefined,
        processingMethod: editProcessing ? (editProcessing as ProcessingMethod) : undefined,
        roastLevel: editRoast as RoastLevel,
        roastDate: editRoastDate ? new Date(editRoastDate) : undefined,
        openBagDate: editOpenBagDate ? new Date(editOpenBagDate) : undefined,
        isRoastDateBestGuess: editIsRoastDateBestGuess,
      },
    });
    setShowEdit(false);
    refetch();
  };

  // ── Unshared / duplicate state ─────────────────────────────────────
  const isOwner = bean?.userBean?.status === "owner";
  const isUnshared = bean?.userBean?.status === "unfollowed";

  const [duplicateShotOption, setDuplicateShotOption] = useState<
    "duplicate" | "migrate" | "none"
  >("duplicate");
  const handleDuplicate = useCallback(async () => {
    const newBean = await duplicateBean.mutateAsync({
      beanId: id,
      shotOption: duplicateShotOption,
    });
    router.push(resolvePath(AppRoutes.beans.beanId, { id: newBean.id }));
  }, [id, duplicateShotOption, duplicateBean, router]);

  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  // ── Share ──────────────────────────────────────────────────────────
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const handleShare = () => {
    setShareDialogOpen(true);
  };

  // Open share dialog when ?sharing=true is in the URL
  useEffect(() => {
    if (searchParams.get("sharing") === "true") {
      queueMicrotask(() => setShareDialogOpen(true));
      const url = new URL(pathname ?? "/beans", window.location.origin);
      url.searchParams.delete("sharing");
      router.replace(url.pathname + (url.search ? url.search : ""), {
        scroll: false,
      });
    }
  }, [searchParams, router, pathname]);

  // Open edit modal when ?edit=true (e.g. from beans list card action)
  useEffect(() => {
    if (searchParams.get("edit") !== "true" || !bean) return;
    if (isOwner) {
      queueMicrotask(() => handleEditOpen());
    }
    const url = new URL(pathname ?? "/beans", window.location.origin);
    url.searchParams.delete("edit");
    router.replace(url.pathname + (url.search ? url.search : ""), {
      scroll: false,
    });
  }, [searchParams, bean, pathname, router, handleEditOpen, isOwner]);

  // ── Comparison slots (synced to ?compareShot= URL params) ─────────
  const [slots, setSlots] = useState<SlotConfig[]>(() => {
    const raw = searchParams.getAll("compareShot");
    if (raw.length === 0) {
      return [
        {
          id: "default-1",
          userId: undefined,
          type: "best-rating",
          shotNumber: 1,
          dateFrom: "",
          dateTo: "",
        },
      ];
    }
    return raw.slice(0, 3).map((v, i) => deserializeSlot(v, i));
  });

  const handleSlotsChange = useCallback(
    (next: SlotConfig[]) => {
      setSlots(next);
      const url = new URL(window.location.href);
      url.searchParams.delete("compareShot");
      for (const slot of next) {
        url.searchParams.append(
          "compareShot",
          serializeSlot(slot, currentUserId),
        );
      }
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [currentUserId, router],
  );

  const originSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          (allBeans ?? []).map((b) => b.origin).filter(Boolean) as string[],
        ),
      ).sort(),
    [allBeans],
  );
  const roasterSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          (allBeans ?? []).map((b) => b.roaster).filter(Boolean) as string[],
        ),
      ).sort(),
    [allBeans],
  );

  const nonHiddenShots = shots.filter(
    (s) => !s.isHidden && s.userId === currentUserId,
  );

  const mostRecentShot = nonHiddenShots.reduce<typeof nonHiddenShots[0] | null>(
    (latest, shot) =>
      !latest || new Date(shot.createdAt) > new Date(latest.createdAt) ? shot : latest,
    null,
  );

  const logShotUrl = resolvePath(
    AppRoutes.log,
    {},
    mostRecentShot ? { previousShotId: mostRecentShot.id } : { beanId: id }
  )

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="h-4 w-32 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-28 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
      </div>
    );
  }

  if (!bean) {
    return (
      <div className="py-16 text-center text-stone-500">Bean not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 pt-4 text-sm text-stone-500 dark:text-stone-400 sm:pt-0">
        <Link
          href={AppRoutes.beans.path}
          className="hover:text-stone-700 dark:hover:text-stone-300"
        >
          Beans
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="truncate text-stone-800 dark:text-stone-200">
          {bean.name}
        </span>
      </nav>

      {/* Header — row 1: title + sharing */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-stone-800 dark:text-stone-200">
            {bean.name}
          </h1>
          {bean.roaster && (
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {bean.roaster}
            </p>
          )}
        </div>
      </div>

      {/* Header — row 3: actions */}
      <div className="flex items-center gap-2">
      {!isUnshared && (
          <div className="flex shrink-0 items-center gap-2">
            <SharedWith beanId={id} />
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <ShareIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {isUnshared ? (
          <>
            <select
              value={duplicateShotOption}
              onChange={(e) =>
                setDuplicateShotOption(
                  e.target.value as "duplicate" | "migrate" | "none",
                )
              }
              className="rounded border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
            >
              <option value="duplicate">Copy my shots</option>
              <option value="migrate">Move my shots</option>
              <option value="none">No shots</option>
            </select>
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={duplicateBean.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              {duplicateBean.isPending ? "Duplicating…" : "Duplicate"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setDuplicateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={handleEditOpen}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
            )}
            <Link
              href={logShotUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700 bg-amber-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 dark:focus:ring-offset-stone-900"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Brew
            </Link>
          </>
        )}
      </div>

      {/* Unshared notice */}
      {isUnshared && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Your access to this bean has been removed. You can still view your own
          shots (read-only). Duplicate the bean below to create your own editable
          copy.
        </div>
      )}

      {/* Bean info */}
      <h2 className="mb-3 text-lg font-semibold text-stone-800 dark:text-stone-200">
        Details
      </h2>
      <BeanInfoGrid
        bean={bean}
        shotsLoading={shotsLoading}
        nonHiddenShotsLength={nonHiddenShots.length}
      />

      <AiShotSuggestion beanId={id} />

      {/* Shot selectors, tasting & rating charts, history table (selection applies to charts + table) */}
      <h2 className="mb-3 text-lg font-semibold text-stone-800 dark:text-stone-200">
        History
      </h2>
      <BeanShotsSection
        bean={bean}
        shots={shots}
        contributors={contributors}
        currentUserId={currentUserId}
        isLoading={shotsLoading}
        isUnshared={isUnshared}
      />

      {/* Shot comparison — all shots; independent of user/hidden filters above */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Shot Comparison
        </h2>
        {shotsLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
        ) : (
          <ComparisonMatrix
            shots={shots}
            slots={slots}
            onSlotsChange={handleSlotsChange}
            contributors={contributors}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* Share dialog */}
      {!isUnshared && (
        <ShareBeanDialog
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          beanId={id}
          beanName={bean.name}
        />
      )}

      {/* Duplicate bean modal (any member including owner) */}
      <DuplicateBeanModal
        open={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        beanName={bean.name}
        shotOption={duplicateShotOption}
        onShotOptionChange={setDuplicateShotOption}
        onDuplicate={handleDuplicate}
        isPending={duplicateBean.isPending}
      />

      {/* Edit modal */}
      <BeanFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Bean"
        submitLabel={updateBean.isPending ? "Saving…" : "Save"}
        onSubmit={handleEditSave}
        isSubmitting={updateBean.isPending}
        name={editName}
        onNameChange={setEditName}
        origin={editOrigin}
        onOriginChange={setEditOrigin}
        originSuggestions={originSuggestions}
        originDetails={editOriginDetails}
        onOriginDetailsChange={setEditOriginDetails}
        roaster={editRoaster}
        onRoasterChange={setEditRoaster}
        roasterSuggestions={roasterSuggestions}
        processing={editProcessing}
        onProcessingChange={setEditProcessing}
        roast={editRoast}
        onRoastChange={setEditRoast}
        roastDate={editRoastDate}
        onRoastDateChange={setEditRoastDate}
        openBagDate={editOpenBagDate}
        onOpenBagDateChange={setEditOpenBagDate}
        isRoastDateBestGuess={editIsRoastDateBestGuess}
        onIsRoastDateBestGuessChange={setEditIsRoastDateBestGuess}
      />
    </div>
  );
}

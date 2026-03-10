"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useBeans, useCreateBean, useUpdateBean } from "@/components/beans/hooks";

/** Inline icons to avoid Turbopack ESM "module factory not available" when passing refs to ActionButtonBar. */
function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}
function PencilSquareIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
import { ROAST_LEVELS, PROCESSING_METHODS } from "@/shared/beans/constants";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { BeanWithUserData } from "@/shared/beans/schema";
import type { CreateShot } from "@/shared/shots/schema";
import { Modal } from "@/components/common/Modal";
import { ActionButtonBar } from "@/components/shots/ActionButtonBar";
import { BeanFormModal } from "@/components/beans/BeanSelector";

interface BeanSectionProps {
  error?: string;
  id?: string;
}

export function BeanSection({ error }: BeanSectionProps) {
  const {
    setValue,
    watch,
  } = useFormContext<CreateShot>();

  const beanId = watch("beanId");
  const [showSearch, setShowSearch] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newRoaster, setNewRoaster] = useState("");
  const [newProcessing, setNewProcessing] = useState("");
  const [newRoast, setNewRoast] = useState<string>(ROAST_LEVELS[2]);
  const [newRoastDate, setNewRoastDate] = useState("");
  const [newOpenBagDate, setNewOpenBagDate] = useState("");
  const [newOriginDetails, setNewOriginDetails] = useState("");
  const [newIsRoastDateBestGuess, setNewIsRoastDateBestGuess] = useState(false);

  const { data: beans, isLoading } = useBeans();
  const createBean = useCreateBean();
  const updateBean = useUpdateBean();

  // Derive unique suggestions from existing beans
  const originSuggestions = Array.from(
    new Set((beans ?? []).map((b) => b.origin).filter(Boolean) as string[])
  ).sort();
  const roasterSuggestions = Array.from(
    new Set((beans ?? []).map((b) => b.roaster).filter(Boolean) as string[])
  ).sort();

  // Derive selectedBean from beans when beanId is in the list
  const selectedBeanFromList = useMemo(() => {
    if (!beanId || !beans) return null;
    return beans.find((b) => b.id === beanId) ?? null;
  }, [beanId, beans]);

  // State for bean fetched individually (not in list)
  const [fetchedBean, setFetchedBean] = useState<BeanWithUserData | null>(null);

  const selectedBean = selectedBeanFromList ?? (fetchedBean?.id === beanId ? fetchedBean : null);

  // Fetch individual bean when beanId is not in the beans list
  useEffect(() => {
    if (!beanId || !beans) return;
    if (beans.find((b) => b.id === beanId)) return;
    let cancelled = false;
    fetch(resolvePath(ApiRoutes.beans.beanId, { id: beanId }))
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const payload = {
            status: res.status,
            beanId,
            error: (data as { error?: string }).error,
          };
          console.error(
            "[BeanSection] GET /api/beans/:id failed",
            JSON.stringify(payload),
          );
          if (!cancelled) setFetchedBean(null);
          return;
        }
        if (!cancelled) setFetchedBean(data as BeanWithUserData);
      })
      .catch((err) => {
        console.error(
          "[BeanSection] GET /api/beans/:id fetch error",
          JSON.stringify({ beanId, err: err instanceof Error ? err.message : String(err) }),
        );
        if (!cancelled) setFetchedBean(null);
      });
    return () => { cancelled = true; };
  }, [beanId, beans]);

  const resetFormFields = useCallback(() => {
    setNewName("");
    setNewOrigin("");
    setNewRoaster("");
    setNewProcessing("");
    setNewRoastDate("");
    setNewOpenBagDate("");
    setNewOriginDetails("");
    setNewIsRoastDateBestGuess(false);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const bean = await createBean.mutateAsync({
        name: newName.trim(),
        origin: newOrigin.trim() || undefined,
        roaster: newRoaster.trim() || undefined,
        originDetails: newOriginDetails.trim() || undefined,
        processingMethod: newProcessing
          ? (newProcessing as (typeof PROCESSING_METHODS)[number])
          : undefined,
        roastLevel: newRoast as (typeof ROAST_LEVELS)[number],
        roastDate: newRoastDate ? new Date(newRoastDate) : undefined,
        openBagDate: newOpenBagDate ? new Date(newOpenBagDate) : undefined,
        isRoastDateBestGuess: newIsRoastDateBestGuess,
      });
      setValue("beanId", bean.id, { shouldValidate: true });
      setShowCreate(false);
      resetFormFields();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancelCreate = useCallback(() => {
    setShowCreate(false);
    resetFormFields();
  }, [resetFormFields]);

  const handleEdit = () => {
    if (!selectedBean) return;
    setNewName(selectedBean.name);
    setNewOrigin(selectedBean.origin || "");
    setNewRoaster(selectedBean.roaster || "");
    setNewOriginDetails(selectedBean.originDetails || "");
    setNewProcessing(selectedBean.processingMethod || "");
    setNewRoast(selectedBean.roastLevel);
    setNewRoastDate(
      selectedBean.roastDate
        ? new Date(selectedBean.roastDate).toISOString().split("T")[0]
        : ""
    );
    setNewOpenBagDate(
      selectedBean.userBean?.openBagDate
        ? new Date(selectedBean.userBean.openBagDate).toISOString().split("T")[0]
        : ""
    );
    setNewIsRoastDateBestGuess(selectedBean.isRoastDateBestGuess || false);
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!beanId || !newName.trim()) return;
    try {
      await updateBean.mutateAsync({
        id: beanId,
        data: {
          name: newName.trim(),
          origin: newOrigin.trim() || undefined,
          roaster: newRoaster.trim() || undefined,
          originDetails: newOriginDetails.trim() || undefined,
          processingMethod: newProcessing
            ? (newProcessing as (typeof PROCESSING_METHODS)[number])
            : undefined,
          roastLevel: newRoast as (typeof ROAST_LEVELS)[number],
          roastDate: newRoastDate ? new Date(newRoastDate) : undefined,
          openBagDate: newOpenBagDate ? new Date(newOpenBagDate) : undefined,
          isRoastDateBestGuess: newIsRoastDateBestGuess,
        },
      });
      setShowEdit(false);
      resetFormFields();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancelEdit = () => {
    setShowEdit(false);
    resetFormFields();
  };

  const handleSearchSelect = (beanId: string) => {
    setValue("beanId", beanId, { shouldValidate: true });
    setShowSearch(false);
    setSearchQuery("");
  };

  const handleSearchClear = () => {
    setValue("beanId", "", { shouldValidate: true });
    setSearchQuery("");
  };

  const handleSearchAddNew = () => {
    setNewName(searchQuery.trim() || "");
    setShowSearch(false);
    setSearchQuery("");
    setShowCreate(true);
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const daysSince = (date: string | Date | null | undefined): number | null => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatRoastDate = (bean: BeanWithUserData): string => {
    if (!bean.roastDate) return "";
    const date = new Date(bean.roastDate);
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const estimate = bean.isRoastDateBestGuess ? " ~" : "";
    return ` · ${formatted}${estimate}`;
  };

  // Filter beans based on search query
  const filteredBeans = beans?.filter((bean) =>
    bean.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const beanDetailsSection = selectedBean ? (
    <div className="rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-0.5 text-sm text-stone-600 dark:text-stone-400">
          {/* Bean name */}
          <div className="font-medium text-stone-800 dark:text-stone-200">
            {selectedBean.name}
          </div>
          {/* Line 1: origin · origin details · roaster · processing · roast level */}
          <div className="flex flex-wrap gap-x-1.5">
            {selectedBean.origin && <span>{selectedBean.origin}</span>}
            {selectedBean.originDetails && <span>· {selectedBean.originDetails}</span>}
            {selectedBean.roaster && <span>· {selectedBean.roaster}</span>}
            {selectedBean.processingMethod && <span>· {selectedBean.processingMethod}</span>}
            <span>· {selectedBean.roastLevel}</span>
          </div>
          {/* Line 2: Roasted date (N days since) */}
          {selectedBean.roastDate && (
            <div>
              Roasted {formatDate(selectedBean.roastDate)}
              {selectedBean.isRoastDateBestGuess ? " ~" : ""}
              {daysSince(selectedBean.roastDate) !== null && (
                <span className="text-stone-400 dark:text-stone-500">
                  {" "}({daysSince(selectedBean.roastDate)} days ago)
                </span>
              )}
            </div>
          )}
          {/* Line 3: Opened date (N days since) */}
          {selectedBean.userBean?.openBagDate && (
            <div>
              Opened {formatDate(selectedBean.userBean.openBagDate)}
              {daysSince(selectedBean.userBean.openBagDate) !== null && (
                <span className="text-stone-400 dark:text-stone-500">
                  {" "}({daysSince(selectedBean.userBean.openBagDate)} days ago)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-700">
        <ActionButtonBar
          actions={[
            {
              key: "search",
              icon: MagnifyingGlassIcon,
              onClick: () => setShowSearch(true),
              title: "Search beans",
              variant: "default",
            },
            {
              key: "edit",
              icon: PencilSquareIcon,
              onClick: selectedBean ? handleEdit : () => {},
              title: "Edit bean",
              variant: "default",
              className: !selectedBean ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
            },
            {
              key: "new",
              icon: PlusCircleIcon,
              onClick: () => setShowCreate(true),
              title: "New bean",
              variant: "default",
            },
          ]}
          className="w-full"
        />
      </div>
    </div>
  ) : (
    <div className="rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
      <div className="px-4 py-3 text-sm text-stone-500 dark:text-stone-400">
        No bean selected
      </div>
      <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-700">
        <ActionButtonBar
          actions={[
            {
              key: "search",
              icon: MagnifyingGlassIcon,
              onClick: () => setShowSearch(true),
              title: "Search beans",
              variant: "default",
            },
            {
              key: "edit",
              icon: PencilSquareIcon,
              onClick: () => {},
              title: "Edit bean",
              variant: "default",
              className: "opacity-50 cursor-not-allowed pointer-events-none",
            },
            {
              key: "new",
              icon: PlusCircleIcon,
              onClick: () => setShowCreate(true),
              title: "New bean",
              variant: "default",
            },
          ]}
          className="w-full"
        />
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <label className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200" tabIndex={-1}>
        Beans
      </label>
      {beanDetailsSection}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Search Modal */}
      <Modal
        open={showSearch}
        onClose={() => {
          setShowSearch(false);
          setSearchQuery("");
        }}
        title="Search Beans"
      >
        <div className="space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search beans..."
              className="h-12 w-full rounded-xl border-2 border-stone-300 bg-white pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            {beanId && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="flex-1 rounded-lg border-2 border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                Clear selection
              </button>
            )}
            <button
              type="button"
              onClick={handleSearchAddNew}
              className="flex-1 rounded-lg border-2 border-amber-700 bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800 dark:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
            >
              Add New
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-stone-500">Loading...</div>
            ) : filteredBeans.length === 0 ? (
              <div className="px-4 py-3 text-sm text-stone-500">
                {searchQuery ? "No beans found" : "No beans yet"}
              </div>
            ) : (
              filteredBeans.map((bean) => (
                <button
                  key={bean.id}
                  type="button"
                  onClick={() => handleSearchSelect(bean.id)}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-stone-100 dark:hover:bg-stone-700 ${
                    bean.id === beanId
                      ? "bg-amber-50 font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "text-stone-800 dark:text-stone-200"
                  }`}
                >
                  <div className="font-medium">{bean.name}</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    {bean.roastLevel}{formatRoastDate(bean)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Create Bean Modal */}
      <BeanFormModal
        open={showCreate}
        onClose={handleCancelCreate}
        title="New Bean"
        submitLabel={createBean.isPending ? "Creating..." : "Create"}
        onSubmit={handleCreate}
        isSubmitting={createBean.isPending}
        name={newName}
        onNameChange={setNewName}
        origin={newOrigin}
        onOriginChange={setNewOrigin}
        originSuggestions={originSuggestions}
        originDetails={newOriginDetails}
        onOriginDetailsChange={setNewOriginDetails}
        roaster={newRoaster}
        onRoasterChange={setNewRoaster}
        roasterSuggestions={roasterSuggestions}
        processing={newProcessing}
        onProcessingChange={setNewProcessing}
        roast={newRoast}
        onRoastChange={setNewRoast}
        roastDate={newRoastDate}
        onRoastDateChange={setNewRoastDate}
        openBagDate={newOpenBagDate}
        onOpenBagDateChange={setNewOpenBagDate}
        isRoastDateBestGuess={newIsRoastDateBestGuess}
        onIsRoastDateBestGuessChange={setNewIsRoastDateBestGuess}
      />

      {/* Edit Bean Modal */}
      <BeanFormModal
        open={showEdit}
        onClose={handleCancelEdit}
        title="Edit Bean"
        submitLabel={updateBean.isPending ? "Updating..." : "Update"}
        onSubmit={handleUpdate}
        isSubmitting={updateBean.isPending}
        name={newName}
        onNameChange={setNewName}
        origin={newOrigin}
        onOriginChange={setNewOrigin}
        originSuggestions={originSuggestions}
        originDetails={newOriginDetails}
        onOriginDetailsChange={setNewOriginDetails}
        roaster={newRoaster}
        onRoasterChange={setNewRoaster}
        roasterSuggestions={roasterSuggestions}
        processing={newProcessing}
        onProcessingChange={setNewProcessing}
        roast={newRoast}
        onRoastChange={setNewRoast}
        roastDate={newRoastDate}
        onRoastDateChange={setNewRoastDate}
        openBagDate={newOpenBagDate}
        onOpenBagDateChange={setNewOpenBagDate}
        isRoastDateBestGuess={newIsRoastDateBestGuess}
        onIsRoastDateBestGuessChange={setNewIsRoastDateBestGuess}
      />
    </div>
  );
}

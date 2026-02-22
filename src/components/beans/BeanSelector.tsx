"use client";

import { useState, useEffect, useCallback } from "react";
import { useBeans, useCreateBean, useUpdateBean } from "./hooks";
import { ROAST_LEVELS, PROCESSING_METHODS } from "@/shared/beans/constants";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Bean } from "@/shared/beans/schema";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Modal } from "@/components/common/Modal";
import { ComboboxInput } from "@/components/common/ComboboxInput";

interface BeanSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
}

export function BeanSelector({ value, onChange, error, id }: BeanSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newRoaster, setNewRoaster] = useState("");
  const [newProcessing, setNewProcessing] = useState("");
  const [newRoast, setNewRoast] = useState<string>(ROAST_LEVELS[2]);
  const [newRoastDate, setNewRoastDate] = useState("");
  const [newOpenBagDate, setNewOpenBagDate] = useState("");
  const [newOriginDetails, setNewOriginDetails] = useState("");
  const [newIsRoastDateBestGuess, setNewIsRoastDateBestGuess] = useState(false);
  const [selectedBean, setSelectedBean] = useState<Bean | null>(null);

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

  // Fetch selected bean details
  useEffect(() => {
    if (value && beans) {
      const bean = beans.find((b) => b.id === value);
      if (bean) {
        setSelectedBean(bean);
      } else {
        // Fetch individual bean if not in list
        fetch(resolvePath(ApiRoutes.beans.beanId, { id: value }))
          .then((res) => res.json())
          .then((data) => setSelectedBean(data))
          .catch(() => setSelectedBean(null));
      }
    } else {
      setSelectedBean(null);
    }
  }, [value, beans]);

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
      onChange(bean.id);
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
      selectedBean.openBagDate
        ? new Date(selectedBean.openBagDate).toISOString().split("T")[0]
        : ""
    );
    setNewIsRoastDateBestGuess(selectedBean.isRoastDateBestGuess || false);
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!value || !newName.trim()) return;
    try {
      const bean = await updateBean.mutateAsync({
        id: value,
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

  const beanDetailsSection = selectedBean && (
    <div className="mt-2 flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-800/50">
      <div className="min-w-0 flex-1 space-y-0.5 text-sm text-stone-600 dark:text-stone-400">
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
        {selectedBean.openBagDate && (
          <div>
            Opened {formatDate(selectedBean.openBagDate)}
            {daysSince(selectedBean.openBagDate) !== null && (
              <span className="text-stone-400 dark:text-stone-500">
                {" "}({daysSince(selectedBean.openBagDate)} days ago)
              </span>
            )}
          </div>
        )}
          </div>
            <button
              type="button"
              onClick={handleEdit}
              tabIndex={-1}
        className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
            >
              Edit
            </button>
    </div>
  );

  const formatRoastDate = (bean: Bean): string => {
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

  return (
    <div className="w-full">
      <label className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200" tabIndex={-1}>
        Bean
      </label>
          <SearchableSelect
            value={value}
            onChange={onChange}
            options={
              beans?.map((bean) => ({
                value: bean.id,
                label: `${bean.name} (${bean.roastLevel}${formatRoastDate(bean)})`,
              })) || []
            }
            placeholder="Select a bean..."
            isLoading={isLoading}
            error={error}
            onAddNew={(text) => { setNewName(text); setShowCreate(true); }}
            emptyMessage={
              !isLoading && beans && beans.length === 0
                ? "No beans yet — create one below"
                : "No beans found"
            }
            id={id}
          />
          {beanDetailsSection}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

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

/* ── Shared Bean Form Modal ─────────────────────────────────────────── */

interface BeanFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  onSubmit: () => void;
  isSubmitting: boolean;
  name: string;
  onNameChange: (v: string) => void;
  origin: string;
  onOriginChange: (v: string) => void;
  originSuggestions: string[];
  originDetails: string;
  onOriginDetailsChange: (v: string) => void;
  roaster: string;
  onRoasterChange: (v: string) => void;
  roasterSuggestions: string[];
  processing: string;
  onProcessingChange: (v: string) => void;
  roast: string;
  onRoastChange: (v: string) => void;
  roastDate: string;
  onRoastDateChange: (v: string) => void;
  openBagDate: string;
  onOpenBagDateChange: (v: string) => void;
  isRoastDateBestGuess: boolean;
  onIsRoastDateBestGuessChange: (v: boolean) => void;
}

function BeanFormModal({
  open,
  onClose,
  title,
  submitLabel,
  onSubmit,
  isSubmitting,
  name,
  onNameChange,
  origin,
  onOriginChange,
  originSuggestions,
  originDetails,
  onOriginDetailsChange,
  roaster,
  onRoasterChange,
  roasterSuggestions,
  processing,
  onProcessingChange,
  roast,
  onRoastChange,
  roastDate,
  onRoastDateChange,
  openBagDate,
  onOpenBagDateChange,
  isRoastDateBestGuess,
  onIsRoastDateBestGuessChange,
}: BeanFormModalProps) {
  const switchId = `beanModal_${title.replace(/\s/g, "")}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl border-2 border-stone-300 px-6 text-base font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !name.trim()}
            className="h-12 rounded-xl border-2 border-amber-700 bg-amber-700 px-6 text-base font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Name *</label>
          <input
            type="text"
            placeholder="Bean name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Origin</label>
          <ComboboxInput
            value={origin}
            onChange={onOriginChange}
            suggestions={originSuggestions}
            placeholder="e.g. Ethiopia, Colombia"
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Origin Details</label>
          <input
            type="text"
            placeholder="e.g. region, farm, altitude"
            value={originDetails}
            onChange={(e) => onOriginDetailsChange(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Roaster</label>
          <ComboboxInput
            value={roaster}
            onChange={onRoasterChange}
            suggestions={roasterSuggestions}
            placeholder="e.g. Onyx, George Howell"
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Processing</label>
          <select
            value={processing}
            onChange={(e) => onProcessingChange(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          >
            <option value="">Select processing...</option>
            {PROCESSING_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Roast Level</label>
          <select
            value={roast}
            onChange={(e) => onRoastChange(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          >
            {ROAST_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Roast Date</label>
          <input
            type="date"
            value={roastDate}
            onChange={(e) => onRoastDateChange(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Open Bag Date</label>
          <input
            type="date"
            value={openBagDate}
            onChange={(e) => onOpenBagDateChange(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
        </div>
          <div className="flex items-center justify-between">
            <label
            htmlFor={switchId}
              className="text-base font-medium text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              Best Guess Roast Date
            </label>
            <button
              type="button"
            id={switchId}
              role="switch"
            aria-checked={isRoastDateBestGuess}
            onClick={() => onIsRoastDateBestGuessChange(!isRoastDateBestGuess)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              isRoastDateBestGuess
                  ? "bg-amber-600"
                  : "bg-stone-300 dark:bg-stone-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isRoastDateBestGuess ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          </div>
    </Modal>
  );
}

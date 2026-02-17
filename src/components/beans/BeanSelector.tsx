"use client";

import { useState, useEffect } from "react";
import { useBeans, useCreateBean, useUpdateBean } from "./hooks";
import { ROAST_LEVELS, PROCESSING_METHODS } from "@/shared/beans/constants";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Bean } from "@/shared/beans/schema";
import { SearchableSelect } from "@/components/common/SearchableSelect";

interface BeanSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function BeanSelector({ value, onChange, error }: BeanSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newRoaster, setNewRoaster] = useState("");
  const [newProcessing, setNewProcessing] = useState("");
  const [newRoast, setNewRoast] = useState<string>(ROAST_LEVELS[2]);
  const [newRoastDate, setNewRoastDate] = useState("");
  const [newIsRoastDateBestGuess, setNewIsRoastDateBestGuess] = useState(false);
  const [selectedBean, setSelectedBean] = useState<Bean | null>(null);

  const { data: beans, isLoading } = useBeans();
  const createBean = useCreateBean();
  const updateBean = useUpdateBean();

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

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const bean = await createBean.mutateAsync({
        name: newName.trim(),
        origin: newOrigin.trim() || undefined,
        roaster: newRoaster.trim() || undefined,
        processingMethod: newProcessing
          ? (newProcessing as (typeof PROCESSING_METHODS)[number])
          : undefined,
        roastLevel: newRoast as (typeof ROAST_LEVELS)[number],
        roastDate: newRoastDate ? new Date(newRoastDate) : undefined,
        isRoastDateBestGuess: newIsRoastDateBestGuess,
      });
      onChange(bean.id);
      setShowCreate(false);
      setNewName("");
      setNewOrigin("");
      setNewRoaster("");
      setNewProcessing("");
      setNewRoastDate("");
      setNewIsRoastDateBestGuess(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleEdit = () => {
    if (!selectedBean) return;
    setNewName(selectedBean.name);
    setNewOrigin(selectedBean.origin || "");
    setNewRoaster(selectedBean.roaster || "");
    setNewProcessing(selectedBean.processingMethod || "");
    setNewRoast(selectedBean.roastLevel);
    setNewRoastDate(
      selectedBean.roastDate
        ? new Date(selectedBean.roastDate).toISOString().split("T")[0]
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
          processingMethod: newProcessing
            ? (newProcessing as (typeof PROCESSING_METHODS)[number])
            : undefined,
          roastLevel: newRoast as (typeof ROAST_LEVELS)[number],
          roastDate: newRoastDate ? new Date(newRoastDate) : undefined,
          isRoastDateBestGuess: newIsRoastDateBestGuess,
        },
      });
      setShowEdit(false);
      setNewName("");
      setNewOrigin("");
      setNewRoaster("");
      setNewProcessing("");
      setNewRoastDate("");
      setNewIsRoastDateBestGuess(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancelEdit = () => {
    setShowEdit(false);
    setNewName("");
    setNewOrigin("");
    setNewRoaster("");
    setNewProcessing("");
    setNewRoastDate("");
    setNewIsRoastDateBestGuess(false);
  };

  const beanDetailsSection = selectedBean && (
    <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
      <h3 className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-4">
        Details
      </h3>

      {showEdit ? (
        // Edit mode - editable fields
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Bean name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            autoFocus
          />
          <input
            type="text"
            placeholder="Origin"
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
          <input
            type="text"
            placeholder="Roaster"
            value={newRoaster}
            onChange={(e) => setNewRoaster(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
          <select
            value={newProcessing}
            onChange={(e) => setNewProcessing(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          >
            <option value="">Processing...</option>
            {PROCESSING_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <select
            value={newRoast}
            onChange={(e) => setNewRoast(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          >
            {ROAST_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newRoastDate}
            onChange={(e) => setNewRoastDate(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            placeholder="Roast date"
          />
          <div className="flex items-center justify-between">
            <label
              htmlFor="isRoastDateBestGuess"
              className="text-base font-medium text-stone-700 dark:text-stone-300 cursor-pointer"
              tabIndex={-1}
            >
              Best Guess Roast Date
            </label>
            <button
              type="button"
              id="isRoastDateBestGuess"
              role="switch"
              aria-checked={newIsRoastDateBestGuess}
              onClick={() => setNewIsRoastDateBestGuess(!newIsRoastDateBestGuess)}
              tabIndex={-1}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                newIsRoastDateBestGuess
                  ? "bg-amber-600"
                  : "bg-stone-300 dark:bg-stone-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  newIsRoastDateBestGuess ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex w-full justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              tabIndex={-1}
              className="h-12 rounded-xl border-2 border-stone-300 px-6 text-base font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={updateBean.isPending || !newName.trim()}
              tabIndex={-1}
              className="h-12 rounded-xl border-2 border-amber-700 bg-amber-700 px-6 text-base font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
            >
              {updateBean.isPending ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
      ) : (
        // View mode - read-only fields stacked single column
        <div className="space-y-3">
          <input
            type="text"
            value={selectedBean.name}
            readOnly
            disabled
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base bg-stone-100 text-stone-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 cursor-not-allowed"
          />
          <input
            type="text"
            value={selectedBean.origin || "-"}
            readOnly
            disabled
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base bg-stone-100 text-stone-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400 cursor-not-allowed"
          />
          <input
            type="text"
            value={selectedBean.roaster || "-"}
            readOnly
            disabled
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base bg-stone-100 text-stone-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400 cursor-not-allowed"
          />
          <select
            value={selectedBean.processingMethod || ""}
            disabled
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base bg-stone-100 text-stone-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400 cursor-not-allowed"
          >
            <option value="">{selectedBean.processingMethod || "Processing..."}</option>
          </select>
          <select
            value={selectedBean.roastLevel}
            disabled
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base bg-stone-100 text-stone-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400 cursor-not-allowed"
          >
            <option value={selectedBean.roastLevel}>{selectedBean.roastLevel}</option>
          </select>
          <input
            type="date"
            value={
              selectedBean.roastDate
                ? new Date(selectedBean.roastDate).toISOString().split("T")[0]
                : ""
            }
            readOnly
            disabled
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base bg-stone-100 text-stone-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400 cursor-not-allowed"
          />
          <div className="flex items-center justify-between">
            <label
              htmlFor="isRoastDateBestGuessView"
              className="text-base font-medium text-stone-700 dark:text-stone-300"
            >
              Best Guess Roast Date
            </label>
            <button
              type="button"
              id="isRoastDateBestGuessView"
              role="switch"
              aria-checked={selectedBean.isRoastDateBestGuess}
              disabled
              tabIndex={-1}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-not-allowed ${
                selectedBean.isRoastDateBestGuess
                  ? "bg-amber-600 opacity-50"
                  : "bg-stone-300 dark:bg-stone-600 opacity-50"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  selectedBean.isRoastDateBestGuess ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex w-full justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleEdit}
              tabIndex={-1}
              className="h-12 rounded-xl border-2 border-amber-700 bg-amber-700 px-6 text-base font-medium text-white transition-colors hover:bg-amber-800"
            >
              Edit
            </button>
          </div>
        </div>
      )}
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
      {!showCreate ? (
        <>
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
            onAddNew={() => setShowCreate(true)}
            emptyMessage={
              !isLoading && beans && beans.length === 0
                ? "No beans yet — create one below"
                : "No beans found"
            }
            disabled={showEdit}
          />
          {beanDetailsSection}
        </>
      ) : (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <input
            type="text"
            placeholder="Bean name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            autoFocus
          />
          <input
            type="text"
            placeholder="Origin"
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
          <input
            type="text"
            placeholder="Roaster"
            value={newRoaster}
            onChange={(e) => setNewRoaster(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
          <select
            value={newProcessing}
            onChange={(e) => setNewProcessing(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          >
            <option value="">Processing...</option>
            {PROCESSING_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <select
            value={newRoast}
            onChange={(e) => setNewRoast(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          >
            {ROAST_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newRoastDate}
            onChange={(e) => setNewRoastDate(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-stone-300 px-4 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            placeholder="Roast date"
          />
          <div className="flex items-center justify-between">
            <label
              htmlFor="isRoastDateBestGuess"
              className="text-base font-medium text-stone-700 dark:text-stone-300 cursor-pointer"
              tabIndex={-1}
            >
              Best Guess Roast Date
            </label>
            <button
              type="button"
              id="isRoastDateBestGuess"
              role="switch"
              aria-checked={newIsRoastDateBestGuess}
              onClick={() => setNewIsRoastDateBestGuess(!newIsRoastDateBestGuess)}
              tabIndex={-1}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                newIsRoastDateBestGuess
                  ? "bg-amber-600"
                  : "bg-stone-300 dark:bg-stone-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  newIsRoastDateBestGuess ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex w-full justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              tabIndex={-1}
              className="h-12 rounded-xl border-2 border-stone-300 px-6 text-base font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createBean.isPending || !newName.trim()}
              tabIndex={-1}
              className="h-12 rounded-xl border-2 border-amber-700 bg-amber-700 px-6 text-base font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
            >
              {createBean.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

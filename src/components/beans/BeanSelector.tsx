"use client";

import { useState, useEffect } from "react";
import { useBeans, useCreateBean, useUpdateBean } from "./hooks";
import { ROAST_LEVELS, PROCESSING_METHODS } from "@/shared/beans/constants";
import { ApiRoutes, resolvePath } from "@/app/routes";
import type { Bean } from "@/shared/beans/schema";

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
        fetch(resolvePath(ApiRoutes.bean.path, { id: value }))
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

  const selectedBeanDisplay = selectedBean && (
    <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
      <div className="flex-1">
        <p className="font-medium text-stone-800 dark:text-stone-200">
          {selectedBean.name}
        </p>
        {selectedBean.origin && (
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {selectedBean.origin}
            {selectedBean.roaster && ` · ${selectedBean.roaster}`}
          </p>
        )}
        {selectedBean.roastDate && (
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Roast date:{" "}
            {new Date(selectedBean.roastDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {selectedBean.isRoastDateBestGuess && (
              <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                (estimate)
              </span>
            )}
          </p>
        )}
      </div>
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
      <label className="mb-2.5 block text-base font-semibold text-stone-800 dark:text-stone-200">
        Bean
      </label>
      {!showCreate && !showEdit ? (
        <>
          <div className="flex gap-2">
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`h-14 flex-1 rounded-xl border-2 px-4 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
                error
                  ? "border-red-400"
                  : "border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
              }`}
            >
              <option value="">
                {isLoading ? "Loading..." : "Select a bean..."}
              </option>
              {!isLoading && beans && beans.length === 0 ? (
                <option value="" disabled>
                  No beans yet — create one below
                </option>
              ) : (
                beans?.map((bean) => (
                  <option key={bean.id} value={bean.id}>
                    {bean.name} ({bean.roastLevel}
                    {formatRoastDate(bean)})
                  </option>
                ))
              )}
            </select>
            {value && (
              <button
                type="button"
                onClick={handleEdit}
                className="h-14 rounded-xl border-2 border-stone-300 px-4 text-base font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="h-14 rounded-xl border-2 border-stone-300 px-4 text-base font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              + New
            </button>
          </div>
          {selectedBeanDisplay}
        </>
      ) : (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <input
            type="text"
            placeholder="Bean name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Origin"
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            />
            <input
              type="text"
              placeholder="Roaster"
              value={newRoaster}
              onChange={(e) => setNewRoaster(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={newProcessing}
              onChange={(e) => setNewProcessing(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
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
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
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
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
              placeholder="Roast date"
            />
          </div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="isRoastDateBestGuess"
              className="text-sm font-medium text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              Best Guess Roast Date
            </label>
            <button
              type="button"
              id="isRoastDateBestGuess"
              role="switch"
              aria-checked={newIsRoastDateBestGuess}
              onClick={() => setNewIsRoastDateBestGuess(!newIsRoastDateBestGuess)}
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={showEdit ? handleUpdate : handleCreate}
              disabled={
                (showEdit
                  ? updateBean.isPending
                  : createBean.isPending) || !newName.trim()
              }
              className="rounded-md bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {showEdit
                ? updateBean.isPending
                  ? "Updating..."
                  : "Update"
                : createBean.isPending
                  ? "Creating..."
                  : "Create"}
            </button>
            <button
              type="button"
              onClick={showEdit ? handleCancelEdit : () => setShowCreate(false)}
              className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

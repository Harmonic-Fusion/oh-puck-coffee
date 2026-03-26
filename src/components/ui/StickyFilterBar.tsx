"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DateRange } from "@/components/ui/date-range-picker";
import type { BeanWithUserData } from "@/shared/beans/schema";
import type { FilterParams } from "@/lib/use-filter-params";

interface StickyFilterBarProps {
  filterParams: FilterParams;
  beans: BeanWithUserData[];
}

// ── Filter pill ───────────────────────────────────────────────────────

interface FilterPillProps {
  label: string;
  displayValue: string;
  isActive: boolean;
  onClick: () => void;
  onClear?: () => void;
}

function FilterPill({ label, displayValue, isActive, onClick, onClear }: FilterPillProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          className={`max-w-[140px] truncate rounded border px-2 py-1 text-xs transition-colors ${
            isActive
              ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800"
          }`}
        >
          {displayValue}
        </button>
        {isActive && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded p-0.5 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
            aria-label={`Clear ${label} filter`}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Date picker modal ─────────────────────────────────────────────────

function DatePickerModal({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Select date range</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center pt-2">
          <Calendar
            mode="range"
            selected={value}
            onSelect={(range) => onChange(range)}
            numberOfMonths={1}
            initialFocus
          />
        </div>
        {value?.from && (
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                onClose();
              }}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
            >
              Apply
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Bean picker modal ─────────────────────────────────────────────────

function BeanPickerModal({
  open,
  onClose,
  beans,
  selectedIds,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  beans: BeanWithUserData[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredBeans = useMemo(
    () =>
      beans.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [beans, search],
  );

  function toggleBean(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Select beans</DialogTitle>
        </DialogHeader>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search beans…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-500"
        />

        <div className="max-h-64 overflow-y-auto">
          {filteredBeans.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-400">
              No beans found
            </p>
          ) : (
            <div className="space-y-1 py-1">
              {filteredBeans.map((bean) => {
                const checked = selectedIds.includes(bean.id);
                return (
                  <label
                    key={bean.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      checked
                        ? "bg-amber-50 dark:bg-amber-900/20"
                        : "hover:bg-stone-50 dark:hover:bg-stone-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBean(bean.id)}
                      className="h-4 w-4 rounded border-stone-300 accent-amber-600"
                    />
                    <span className="text-stone-700 dark:text-stone-300">
                      {bean.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            Done ({selectedIds.length} selected)
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── StickyFilterBar ───────────────────────────────────────────────────

export function StickyFilterBar({ filterParams, beans }: StickyFilterBarProps): ReactNode {
  const { dateRange, beanIds, setDateRange, setBeanIds, resetFilters, hasActiveFilters } =
    filterParams;

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [beanModalOpen, setBeanModalOpen] = useState(false);

  // Scroll-reveal state for mobile
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY.current;
    if (delta > 4) {
      setVisible(false);
    } else if (delta < -4) {
      setVisible(true);
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Derived display values
  const dateDisplay = useMemo(() => {
    if (!dateRange?.from) return "All time";
    if (dateRange.to) {
      return `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`;
    }
    return `From ${format(dateRange.from, "MMM d")}`;
  }, [dateRange]);

  const beanDisplay = useMemo(() => {
    if (beanIds.length === 0) return "All beans";
    if (beanIds.length === 1) {
      const bean = beans.find((b) => b.id === beanIds[0]);
      return bean?.name ?? "1 bean";
    }
    return `${beanIds.length} beans`;
  }, [beanIds, beans]);

  return (
    <>
      <div
        className={`sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 py-2.5 backdrop-blur-sm transition-transform duration-200 dark:border-stone-700 dark:bg-stone-950/95 md:translate-y-0 ${
          visible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-end gap-4">
          <FilterPill
            label="Dates"
            displayValue={dateDisplay}
            isActive={!!dateRange?.from}
            onClick={() => setDateModalOpen(true)}
            onClear={() => setDateRange(undefined)}
          />
          <FilterPill
            label="Beans"
            displayValue={beanDisplay}
            isActive={beanIds.length > 0}
            onClick={() => setBeanModalOpen(true)}
            onClear={() => setBeanIds([])}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mb-0.5 self-end text-xs text-stone-400 underline-offset-2 hover:text-stone-600 hover:underline dark:text-stone-500 dark:hover:text-stone-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <DatePickerModal
        open={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        value={dateRange}
        onChange={setDateRange}
      />

      <BeanPickerModal
        open={beanModalOpen}
        onClose={() => setBeanModalOpen(false)}
        beans={beans}
        selectedIds={beanIds}
        onChange={setBeanIds}
      />
    </>
  );
}

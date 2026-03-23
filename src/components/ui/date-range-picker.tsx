"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { Calendar } from "./calendar";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { cn } from "@/lib/utils";

export type { DateRange };

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  numberOfMonths?: number;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  numberOfMonths = 1,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const label = React.useMemo(() => {
    if (value?.from && value?.to) {
      return `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`;
    }
    if (value?.from) {
      return format(value.from, "MMM d, yyyy");
    }
    return null;
  }, [value]);

  return (
    <div className={cn("relative inline-block", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
            "border-stone-200 bg-white text-stone-800 hover:bg-stone-50",
            "dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800",
            "focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400",
            "dark:focus:ring-amber-500 dark:focus:border-amber-500",
            !label && "text-stone-400 dark:text-stone-500"
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">{label ?? placeholder}</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={numberOfMonths}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

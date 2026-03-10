"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-stone-800 dark:text-stone-200",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-1 h-7 w-7 flex items-center justify-center rounded-md border border-stone-200 bg-transparent p-0 opacity-50 transition-opacity hover:opacity-100 dark:border-stone-700"
        ),
        button_next: cn(
          "absolute right-1 h-7 w-7 flex items-center justify-center rounded-md border border-stone-200 bg-transparent p-0 opacity-50 transition-opacity hover:opacity-100 dark:border-stone-700"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-stone-400 rounded-md w-8 font-normal text-[0.8rem] text-center dark:text-stone-500",
        weeks: "flex flex-col gap-1 mt-2",
        week: "flex w-full",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-amber-50 dark:[&:has([aria-selected])]:bg-amber-900/20 [&:has([aria-selected].rdp-range_end)]:rounded-r-md [&:has([aria-selected].rdp-range_start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        day_button: cn(
          "h-8 w-8 p-0 font-normal rounded-md text-stone-800 dark:text-stone-200",
          "hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors",
          "aria-selected:opacity-100"
        ),
        range_start: "rdp-range_start day-range-start",
        range_end: "rdp-range_end day-range-end",
        selected: "[&>button]:bg-amber-600 [&>button]:text-white [&>button]:hover:bg-amber-600 [&>button]:hover:text-white",
        today: "[&>button]:font-semibold [&>button]:text-amber-600 dark:[&>button]:text-amber-400",
        outside: "text-stone-400 opacity-50 dark:text-stone-600 aria-selected:bg-stone-100/50 aria-selected:text-stone-400 dark:aria-selected:bg-stone-800/50",
        disabled: "text-stone-400 opacity-50 dark:text-stone-600 cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

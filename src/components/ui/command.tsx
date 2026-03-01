"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {}

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-stone-950 dark:bg-stone-950 dark:text-stone-50",
        className
      )}
      {...props}
    />
  )
);
Command.displayName = "Command";

export interface CommandInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, ...props }, ref) => (
    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-stone-400",
          className
        )}
        {...props}
      />
    </div>
  )
);
CommandInput.displayName = "CommandInput";

export interface CommandListProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
      {...props}
    />
  )
);
CommandList.displayName = "CommandList";

export interface CommandEmptyProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CommandEmpty = React.forwardRef<HTMLDivElement, CommandEmptyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
);
CommandEmpty.displayName = "CommandEmpty";

export interface CommandGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden p-1 text-stone-950 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-stone-500 dark:text-stone-50 [&_[cmdk-group-heading]]:dark:text-stone-400",
        className
      )}
      {...props}
    />
  )
);
CommandGroup.displayName = "CommandGroup";

export interface CommandItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onSelect?: () => void;
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, onSelect, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-stone-100 aria-selected:text-stone-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:aria-selected:bg-stone-800 dark:aria-selected:text-stone-50",
        className
      )}
      onSelect={onSelect}
      {...props}
    />
  )
);
CommandItem.displayName = "CommandItem";

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
};

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownMenuContext = React.createContext<
  DropdownMenuContextValue | undefined
>(undefined);

export interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function DropdownMenu({
  children,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement>(null);
  const open = controlledOpen ?? internalOpen;
  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [controlledOpen, onOpenChange],
  );

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("DropdownMenu components must be used within DropdownMenu");
  }
  return context;
}

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ className, children, asChild, ...props }, ref) => {
  const { setOpen, open, triggerRef } = useDropdownMenuContext();

  const combinedRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      // Update both the forwarded ref and the context ref
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    [ref, triggerRef],
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref: combinedRef,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(e);
        setOpen(!open);
      },
    } as any);
  }

  return (
    <button
      ref={combinedRef}
      type="button"
      onClick={() => setOpen(!open)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(
  (
    { className, align = "start", side = "bottom", sideOffset = 4, ...props },
    ref,
  ) => {
    const { open, setOpen, triggerRef } = useDropdownMenuContext();
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (!open) return;

      function handleClickOutside(event: MouseEvent) {
        if (
          contentRef.current &&
          !contentRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [open, setOpen, triggerRef]);

    if (!open) return null;

    // Calculate position based on side and sideOffset
    const getPositionStyles = (): React.CSSProperties => {
      const baseStyles: React.CSSProperties = {
        position: "absolute",
      };

      if (side === "top") {
        baseStyles.bottom = `calc(100% + ${sideOffset}px)`;
        if (align === "center") {
          baseStyles.left = "50%";
          baseStyles.transform = "translateX(-50%)";
        } else if (align === "end") {
          baseStyles.right = "0";
        } else {
          baseStyles.left = "0";
        }
      } else if (side === "bottom") {
        baseStyles.top = `calc(100% + ${sideOffset}px)`;
        if (align === "center") {
          baseStyles.left = "50%";
          baseStyles.transform = "translateX(-50%)";
        } else if (align === "end") {
          baseStyles.right = "0";
        } else {
          baseStyles.left = "0";
        }
      } else if (side === "left") {
        baseStyles.right = `calc(100% + ${sideOffset}px)`;
        if (align === "center") {
          baseStyles.top = "50%";
          baseStyles.transform = "translateY(-50%)";
        } else if (align === "end") {
          baseStyles.bottom = "0";
        } else {
          baseStyles.top = "0";
        }
      } else if (side === "right") {
        baseStyles.left = `calc(100% + ${sideOffset}px)`;
        if (align === "center") {
          baseStyles.top = "50%";
          baseStyles.transform = "translateY(-50%)";
        } else if (align === "end") {
          baseStyles.bottom = "0";
        } else {
          baseStyles.top = "0";
        }
      }

      return baseStyles;
    };

    return (
      <div
        ref={ref}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border border-stone-200 bg-white p-1 text-stone-950 shadow-md dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50",
          className,
        )}
        style={{
          ...getPositionStyles(),
          ...props.style,
        }}
        {...props}
      >
        <div ref={contentRef}>{props.children}</div>
      </div>
    );
  },
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = useDropdownMenuContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setOpen(false);
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-stone-100 focus:text-stone-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-stone-800 dark:focus:text-stone-50",
        className,
      )}
      {...props}
    />
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

export interface DropdownMenuCheckboxItemProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuCheckboxItemProps
>(
  (
    {
      className,
      checked = false,
      onCheckedChange,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const newChecked = !checked;
      onCheckedChange?.(newChecked);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        onClick={handleClick}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-stone-100 focus:text-stone-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-stone-800 dark:focus:text-stone-50",
          className,
        )}
        {...props}
      >
        <span className="mr-2 flex h-4 w-4 items-center justify-center">
          {checked ? (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <span className="h-4 w-4" />
          )}
        </span>
        {children}
      </button>
    );
  },
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  DropdownMenuLabelProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export interface DropdownMenuSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-stone-100 dark:bg-stone-800", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  setTriggerNode: (node: HTMLElement | null) => void;
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
  const setTriggerNode = React.useCallback((node: HTMLElement | null) => {
    (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
  }, []);
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
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, setTriggerNode }}>
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
  const { setOpen, open, setTriggerNode } = useDropdownMenuContext();

  const combinedRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      setTriggerNode(node);
    },
    [ref, setTriggerNode],
  );

  if (asChild && React.isValidElement(children)) {
    /* eslint-disable react-hooks/refs -- cloneElement forwards ref to child element; it is not read during render */
    return React.cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      {
        ...props,
        ref: combinedRef,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          props.onClick?.(e);
          setOpen(!open);
        },
      },
    );
    /* eslint-enable react-hooks/refs */
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
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Combine refs for forwarded ref
    const combinedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const [position, setPosition] = React.useState<{
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    }>({});

    React.useEffect(() => {
      if (!open) return;

      function handleClickOutside(event: MouseEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
        }
      }

      function updatePosition() {
        if (!triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const newPosition: {
          top?: number;
          bottom?: number;
          left?: number;
          right?: number;
        } = {};

        if (side === "top") {
          newPosition.bottom = window.innerHeight - triggerRect.top + sideOffset;
        } else if (side === "bottom") {
          newPosition.top = triggerRect.bottom + sideOffset;
        } else if (side === "left") {
          newPosition.right = window.innerWidth - triggerRect.left + sideOffset;
        } else if (side === "right") {
          newPosition.left = triggerRect.right + sideOffset;
        }

        if (side === "top" || side === "bottom") {
          if (align === "end") {
            newPosition.right = window.innerWidth - triggerRect.right;
          } else if (align === "center") {
            newPosition.left = triggerRect.left + triggerRect.width / 2;
          } else {
            newPosition.left = triggerRect.left;
          }
        } else {
          if (align === "center") {
            newPosition.top = triggerRect.top + triggerRect.height / 2;
          } else if (align === "end") {
            newPosition.bottom = window.innerHeight - triggerRect.bottom;
          } else {
            newPosition.top = triggerRect.top;
          }
        }

        setPosition(newPosition);
      }

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [open, setOpen, triggerRef, side, align, sideOffset]);

    if (!open) return null;

    // Build styles for positioning
    const positionStyles: React.CSSProperties = {
      position: "fixed",
      ...position,
    };

    // For centered alignment, we need to adjust with transform
    if ((side === "top" || side === "bottom") && align === "center") {
      positionStyles.transform = "translateX(-50%)";
    } else if ((side === "left" || side === "right") && align === "center") {
      positionStyles.transform = "translateY(-50%)";
    }

    return (
      <div
        ref={combinedRef}
        className={cn(
          "z-50 min-w-[8rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-stone-200 bg-white p-1 text-stone-950 shadow-md dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50",
          className,
        )}
        style={{
          ...positionStyles,
          ...props.style,
        }}
        {...props}
      >
        {props.children}
      </div>
    );
  },
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export type DropdownMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

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

export type DropdownMenuLabelProps = React.HTMLAttributes<HTMLDivElement>;

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

export type DropdownMenuSeparatorProps = React.HTMLAttributes<HTMLDivElement>;

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

"use client";

import type { ShotShareData } from "@/lib/share-text";
import type { TempUnit } from "@/lib/format-numbers";
import { LongPressShareButton } from "./LongPressShareButton";
import { ShareIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export type ActionButtonConfig = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  title: string;
  variant?: "default" | "active";
  className?: string;
};

export type ShareButtonConfig = {
  key: "share";
  shotData: ShotShareData;
  tempUnit: TempUnit;
  getShareUrl: () => Promise<string>;
  onShare: (text: string, shareUrl: string) => Promise<void>;
  title?: string;
  buttonVariant?: "primary" | "secondary" | "ghost" | "danger";
};

export type ActionConfig = ActionButtonConfig | ShareButtonConfig;

export interface ActionButtonBarProps {
  actions: ActionConfig[];
  className?: string;
  showLabels?: boolean;
}

function isShareConfig(config: ActionConfig): config is ShareButtonConfig {
  return config.key === "share" && "shotData" in config;
}

function getVariantClasses(variant?: "default" | "active"): string {
  switch (variant) {
    case "active":
      return "hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 fill-amber-500";
    case "default":
    default:
      return "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-500";
  }
}

export function ActionButtonBar({ actions, className, showLabels = false }: ActionButtonBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {actions.map((action) => {
        if (isShareConfig(action)) {
          return (
            <div key={action.key} className="flex h-10 flex-1">
              <LongPressShareButton
                shotData={action.shotData}
                tempUnit={action.tempUnit}
                getShareUrl={action.getShareUrl}
                onShare={action.onShare}
                className="h-10 w-full"
                variant={action.buttonVariant ?? "ghost"}
                size="sm"
              >
                <div className="flex items-center gap-2">
                  <ShareIcon
                    className={cn(
                      "h-5 w-5",
                      action.buttonVariant === "primary"
                        ? "text-white"
                        : "text-stone-400 dark:text-stone-500",
                    )}
                  />
                  {showLabels && (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        action.buttonVariant === "primary"
                          ? "text-white"
                          : "text-stone-500 dark:text-stone-400",
                      )}
                    >
                      {action.title ?? "Share"}
                    </span>
                  )}
                </div>
              </LongPressShareButton>
            </div>
          );
        }

        const Icon = action.icon;
        return (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-lg transition-colors",
              getVariantClasses(action.variant),
              action.className,
            )}
            title={action.title}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {showLabels && <span className="text-sm font-medium">{action.title}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

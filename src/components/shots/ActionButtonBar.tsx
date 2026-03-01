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
};

export type ActionConfig = ActionButtonConfig | ShareButtonConfig;

export interface ActionButtonBarProps {
  actions: ActionConfig[];
  className?: string;
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

export function ActionButtonBar({ actions, className }: ActionButtonBarProps) {
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
                variant="ghost"
                size="sm"
              >
                <ShareIcon className="h-5 w-5 text-stone-400 dark:text-stone-500" />
              </LongPressShareButton>
            </div>
          );
        }

        const Icon = action.icon;
        return (
          <button
            key={action.key}
            onClick={action.onClick}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-lg transition-colors",
              getVariantClasses(action.variant),
              action.className,
            )}
            title={action.title}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}

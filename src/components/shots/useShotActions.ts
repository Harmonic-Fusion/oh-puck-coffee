import type { ShotWithJoins } from "@/components/shots/hooks";
import type { ActionConfig } from "./ActionButtonBar";
import type { ShotShareData } from "@/lib/share-text";
import type { TempUnit } from "@/lib/format-numbers";
import {
  PencilSquareIcon,
  PlusCircleIcon,
  EyeSlashIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";
import {
  BookmarkIcon as BookmarkIconSolid,
  EyeIcon as EyeIconSolid,
} from "@heroicons/react/24/solid";

interface UseShotActionsOptions {
  shot: ShotWithJoins;
  tempUnit: TempUnit;
  shotShareData: ShotShareData | null;
  getShareUrl: () => Promise<string>;
  onShare: (text: string, shareUrl: string) => Promise<void>;
  onEdit?: () => void;
  onToggleReference?: () => void;
  onToggleHidden?: () => void;
  onDuplicate?: () => void;
  showEdit?: boolean;
}

export function useShotActions({
  shot,
  tempUnit,
  shotShareData,
  getShareUrl,
  onShare,
  onEdit,
  onToggleReference,
  onToggleHidden,
  onDuplicate,
  showEdit = true,
}: UseShotActionsOptions): ActionConfig[] {
  const actions: ActionConfig[] = [];

  // Edit button
  if (showEdit && onEdit) {
    actions.push({
      key: "edit",
      icon: PencilSquareIcon,
      onClick: onEdit,
      title: "Edit shot",
      variant: "default" as const,
    });
  }

  // Reference button
  if (onToggleReference) {
    actions.push({
      key: "reference",
      icon: shot.isReferenceShot ? BookmarkIconSolid : BookmarkIcon,
      onClick: onToggleReference,
      title: shot.isReferenceShot
        ? "Remove reference shot"
        : "Mark as reference shot",
      variant: shot.isReferenceShot ? ("active" as const) : ("default" as const),
    });
  }

  // Hide button
  if (onToggleHidden) {
    actions.push({
      key: "hidden",
      icon: shot.isHidden ? EyeSlashIcon : EyeIconSolid,
      onClick: onToggleHidden,
      title: shot.isHidden ? "Show shot" : "Hide shot",
      variant: shot.isHidden ? ("active" as const) : ("default" as const),
    });
  }

  // Duplicate button
  if (onDuplicate) {
    actions.push({
      key: "duplicate",
      icon: PlusCircleIcon,
      onClick: onDuplicate,
      title: "Duplicate shot",
      variant: "default" as const,
    });
  }

  // Share button
  if (shotShareData) {
    actions.push({
      key: "share" as const,
      shotData: shotShareData,
      tempUnit,
      getShareUrl,
      onShare,
    });
  }

  return actions;
}

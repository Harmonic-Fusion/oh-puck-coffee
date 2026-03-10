import type { ShotWithJoins } from "@/components/shots/hooks";
import type { ActionConfig } from "./ActionButtonBar";
import type { ShotShareData } from "@/lib/share-text";
import type { TempUnit } from "@/lib/format-numbers";

/** Inline icons to avoid Turbopack ESM "module factory not available" when passing refs to ActionButtonBar. */
function PencilSquareIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function BookmarkIconOutline({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  );
}
function BookmarkIconSolid({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
    </svg>
  );
}
function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}
function EyeIconSolid({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
    </svg>
  );
}

interface UseShotActionsOptions {
  shot: ShotWithJoins | null;
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
  if (!shot) return [];
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
      icon: shot.isReferenceShot ? BookmarkIconSolid : BookmarkIconOutline,
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

"use client";

import {
  useShareInvites,
  useAcceptBeanShare,
  useDeclineBeanShare,
  type ShareInvite,
} from "@/components/beans/hooks";
import { Button } from "@/components/ui/button";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

function InviteRow({
  invite,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: {
  invite: ShareInvite;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting: boolean;
  isDeclining: boolean;
}) {
  const beanLabel = invite.beanName;
  const sharerLabel = invite.sharerName ?? "Someone";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-700 dark:bg-stone-800">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-200">
          {sharerLabel} shared a bean with you
        </p>
        <p className="truncate text-xs text-stone-500 dark:text-stone-400">
          {beanLabel}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onDecline}
          disabled={isAccepting || isDeclining}
          className="text-stone-600 dark:text-stone-400"
        >
          <XMarkIcon className="h-4 w-4" />
          <span className="sr-only">Decline</span>
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isAccepting || isDeclining}
        >
          <CheckIcon className="h-4 w-4" />
          Accept
        </Button>
      </div>
    </div>
  );
}

/**
 * Section on the Beans page when the user has pending bean shares.
 * Title: "Shared with you" — list of invites with Accept / Decline.
 */
export function BeanShareInvitesBanner() {
  const { data: invites, isLoading } = useShareInvites();
  const acceptShare = useAcceptBeanShare();
  const declineShare = useDeclineBeanShare();

  const pending = invites?.filter((i) => i.id) ?? [];
  if (isLoading || pending.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="shared-with-you-heading"
      className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-4 dark:border-stone-700 dark:bg-stone-900/30"
    >
      <h2
        id="shared-with-you-heading"
        className="text-base font-semibold text-stone-800 dark:text-stone-200"
      >
        Shared with you
      </h2>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Accept the share to add these beans to your collection.
      </p>
      <div className="space-y-2">
        {pending.map((invite) => (
          <InviteRow
            key={invite.id}
            invite={invite}
            onAccept={() =>
              acceptShare.mutate({ beanId: invite.beanId, shareId: invite.id })
            }
            onDecline={() =>
              declineShare.mutate({ beanId: invite.beanId, shareId: invite.id })
            }
            isAccepting={
              acceptShare.isPending &&
              acceptShare.variables?.shareId === invite.id
            }
            isDeclining={
              declineShare.isPending &&
              declineShare.variables?.shareId === invite.id
            }
          />
        ))}
      </div>
    </section>
  );
}

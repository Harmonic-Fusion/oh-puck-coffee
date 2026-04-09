"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useAiSuggestionHistory,
  useAiSuggestionUsage,
  useRequestAiSuggestion,
} from "./hooks";
import type { AiChatHistoryItem } from "@/shared/ai-suggestions/schema";

interface AiShotSuggestionProps {
  beanId: string;
  /** When false, the panel is hidden (e.g. no access to bean). */
  enabled?: boolean;
}

function AiSuggestionMarkdown({ markdown }: { markdown: string }) {
  return (
    <div
      className="prose prose-sm max-w-none prose-stone dark:prose-invert prose-headings:font-semibold prose-headings:text-stone-800 prose-p:text-stone-700 prose-li:text-stone-700 prose-strong:text-stone-900 dark:prose-headings:text-stone-100 dark:prose-p:text-stone-300 dark:prose-li:text-stone-300 dark:prose-strong:text-stone-100"
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}

function formatSuggestionDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function PastSuggestionItem({ item }: { item: AiChatHistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = item.suggestion.length > 200;
  const displayText =
    !expanded && isLong ? item.suggestion.slice(0, 200) + "…" : item.suggestion;

  return (
    <li className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-700 dark:bg-stone-950">
      <div className="flex items-center justify-between gap-2">
        <time className="shrink-0 text-xs font-medium text-stone-500 dark:text-stone-400">
          {formatSuggestionDate(item.createdAt)}
        </time>
        {isLong ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-amber-700 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>
      <div className="mt-1 text-sm leading-relaxed">
        <AiSuggestionMarkdown markdown={displayText} />
      </div>
    </li>
  );
}

export function AiShotSuggestion({
  beanId,
  enabled = true,
}: AiShotSuggestionProps) {
  const usageQuery = useAiSuggestionUsage();
  const suggestion = useRequestAiSuggestion(beanId);
  const historyQuery = useAiSuggestionHistory(beanId);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pastItems = useMemo(
    () => historyQuery.data?.items ?? [],
    [historyQuery.data?.items],
  );
  /** Avoid showing the same text twice when the latest suggestion is also in the success panel. */
  const listItems = useMemo(() => {
    const latestId =
      suggestion.isSuccess && suggestion.data?.chatId
        ? suggestion.data.chatId
        : null;
    if (!latestId) return pastItems;
    return pastItems.filter((item) => item.chatId !== latestId);
  }, [pastItems, suggestion.isSuccess, suggestion.data]);

  if (!enabled) {
    return null;
  }

  const used = usageQuery.data?.usedThisWeek;
  const limit = usageQuery.data?.weeklyLimit;
  const atLimit =
    used != null && limit != null && used >= limit;

  const errorMessage =
    suggestion.error instanceof Error ? suggestion.error.message : null;
  const errorCode =
    suggestion.error &&
    typeof suggestion.error === "object" &&
    "code" in suggestion.error &&
    typeof (suggestion.error as { code?: string }).code === "string"
      ? (suggestion.error as { code: string }).code
      : undefined;

  const hasPastSuggestions = pastItems.length > 0;

  return (
    <section
      className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-900/40"
      aria-labelledby="ai-shot-suggestion-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="ai-shot-suggestion-heading"
            className="flex items-center gap-2 text-lg font-semibold text-stone-800 dark:text-stone-100"
          >
            <SparklesIcon className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            Dial-in suggestion
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Intelligent suggestions based on your shot history and bean profile.
          </p>
          {usageQuery.isLoading ? (
            <p className="mt-2 text-sm text-stone-500">Loading usage…</p>
          ) : usageQuery.isError ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Could not load usage.
            </p>
          ) : used != null && limit != null ? (
            <p className="mt-2 text-sm font-medium text-stone-700 dark:text-stone-300">
              {used} of {limit} suggestions used this week
            </p>
          ) : null}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          {atLimit ? (
            <>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400"
              >
                Weekly limit reached
              </button>
              <Link
                href={AppRoutes.settings.billing.path}
                className="inline-flex items-center justify-center rounded-lg border border-amber-700 bg-amber-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 dark:focus:ring-offset-stone-900"
              >
                Upgrade
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={
                suggestion.isPending ||
                usageQuery.isLoading ||
                usageQuery.isError
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-700 bg-amber-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 dark:focus:ring-offset-stone-900"
            >
              {suggestion.isPending ? (
                <>Thinking…</>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Get suggestion
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {errorCode === "openai_not_configured"
            ? "AI suggestions are not configured on this server."
            : errorMessage}
        </div>
      ) : null}

      {suggestion.isSuccess && suggestion.data?.suggestion ? (
        <div className="mt-4 rounded-lg border border-stone-200 bg-white px-3 py-3 dark:border-stone-600 dark:bg-stone-950">
          <AiSuggestionMarkdown markdown={suggestion.data.suggestion} />
        </div>
      ) : null}

      <div className="mt-4 border-t border-stone-200 pt-3 dark:border-stone-700">
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-expanded={historyOpen}
          className="flex w-full items-center justify-between text-sm font-medium text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
        >
          <span>
            Past suggestions
            {hasPastSuggestions ? ` (${pastItems.length})` : ""}
          </span>
          {historyOpen ? (
            <ChevronUpIcon className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDownIcon className="h-4 w-4" aria-hidden />
          )}
        </button>

        {historyOpen ? (
          historyQuery.isLoading ? (
            <p className="mt-2 text-sm text-stone-500">Loading history…</p>
          ) : historyQuery.isError ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Could not load past suggestions.
            </p>
          ) : !hasPastSuggestions ? (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              No past suggestions yet. Use Get suggestion above — each one
              appears here with its date.
            </p>
          ) : listItems.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Your latest suggestion is shown above. Older ones appear in this
              list.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {listItems.map((item) => (
                <PastSuggestionItem key={item.chatId} item={item} />
              ))}
            </ul>
          )
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Use one AI suggestion?"
        description={
          <>
            <p>
              This counts toward your weekly limit
              {used != null && limit != null
                ? ` (${used} of ${limit} used this week).`
                : "."}{" "}
              The result appears above and in Past suggestions.
            </p>
          </>
        }
        confirmLabel="Yes, use one"
        cancelLabel="Cancel"
        loading={suggestion.isPending}
        onConfirm={async () => {
          try {
            await suggestion.mutateAsync();
            setHistoryOpen(true);
          } catch {
            /* Error is shown via mutation state and the alert below */
          }
        }}
      />
    </section>
  );
}

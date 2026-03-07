"use client";

import {
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@/components/common/Card";
import { AppRoutes } from "@/app/routes";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  /** Anchor fragment appended to the shot log resource page URL (e.g. "Recipe") */
  guideAnchor: string;
  summaryText?: string;
  isExpanded: boolean;
  onToggle: (expanded: boolean) => void;
  /** When true, always show expanded without collapse controls */
  showAllInputs?: boolean;
  children: React.ReactNode;
  /** Extra content rendered after the children (e.g. EditInputsButton, EditOrderModal) */
  footer?: React.ReactNode;
}

function SectionHeader({
  title,
  guideAnchor,
  onLinkClick,
}: {
  title: string;
  guideAnchor: string;
  onLinkClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
        {title}
      </h2>
      <a
        href={`${AppRoutes.resources.shotLog.path}#${guideAnchor}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`${title} guide`}
        onClick={onLinkClick}
        className="text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
      >
        <InformationCircleIcon className="h-5 w-5" />
      </a>
    </div>
  );
}

export function CollapsibleSection({
  id,
  title,
  guideAnchor,
  summaryText,
  isExpanded,
  onToggle,
  showAllInputs = false,
  children,
  footer,
}: CollapsibleSectionProps) {
  return (
    <Card>
      <section id={id} className="space-y-6">
        {!showAllInputs && !isExpanded ? (
          <button
            type="button"
            onClick={() => onToggle(true)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-label={`Expand ${title.toLowerCase()}`}
          >
            <SectionHeader
              title={title}
              guideAnchor={guideAnchor}
              onLinkClick={(e) => e.stopPropagation()}
            />
            <div className="flex items-center gap-2">
              <span className="text-base text-stone-700 dark:text-stone-300">
                {summaryText || "Expand to Edit"}
              </span>
              <ChevronDownIcon className="h-5 w-5 text-stone-400" />
            </div>
          </button>
        ) : (
          <>
            {!showAllInputs ? (
              <button
                type="button"
                onClick={() => onToggle(false)}
                className="flex w-full items-center justify-between gap-2 text-left rounded-lg p-1 -m-1 hover:bg-stone-100 dark:hover:bg-stone-800/50"
                aria-label={`Collapse ${title.toLowerCase()}`}
              >
                <SectionHeader
                  title={title}
                  guideAnchor={guideAnchor}
                  onLinkClick={(e) => e.stopPropagation()}
                />
                <ChevronUpIcon className="h-5 w-5 text-stone-400 shrink-0" />
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <SectionHeader title={title} guideAnchor={guideAnchor} />
              </div>
            )}
            <div className="space-y-7">{children}</div>
            {footer}
          </>
        )}

      </section>
    </Card>
  );
}

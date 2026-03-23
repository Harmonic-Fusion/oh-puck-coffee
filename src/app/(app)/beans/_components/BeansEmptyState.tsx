"use client";

import type { ReactNode } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { BeanIcon } from "@/components/common/BeanIcon";
import type { PublicBeanSummary } from "@/components/beans/hooks";
import { PublicBeanRow } from "./PublicBeanRow";

export function BeansEmptyState({
  publicSearchQuery,
  onPublicSearchQueryChange,
  publicBeansLoading,
  publicBeans,
  addToCollection,
  onOpenCreate,
  modal,
}: {
  publicSearchQuery: string;
  onPublicSearchQueryChange: (value: string) => void;
  publicBeansLoading: boolean;
  publicBeans: PublicBeanSummary[];
  addToCollection: {
    mutate: (beanId: string) => void;
    isPending: boolean;
    variables: string | undefined;
  };
  onOpenCreate: () => void;
  modal: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BeanIcon className="h-10 w-10 text-stone-300 dark:text-stone-600" />
      <h3 className="mt-4 text-lg font-medium text-stone-700 dark:text-stone-300">
        No beans yet
      </h3>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Add a bean when logging your first shot, or add one here.
      </p>
      <button
        type="button"
        onClick={onOpenCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-amber-700 bg-amber-700 px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-amber-800 dark:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
      >
        Add beans
      </button>

      <div className="mt-12 w-full max-w-md">
        <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
          Or find a public or shared bean to add
        </p>
        <div className="relative mt-2">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, origin, roaster…"
            value={publicSearchQuery}
            onChange={(e) => onPublicSearchQueryChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder-stone-400 outline-none transition-colors focus:border-stone-400 focus:ring-1 focus:ring-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-500 dark:focus:border-stone-500 dark:focus:ring-stone-500"
          />
        </div>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/50 p-2 dark:border-stone-700 dark:bg-stone-900/50">
          {publicBeansLoading ? (
            <p className="py-4 text-center text-sm text-stone-500 dark:text-stone-400">
              Searching…
            </p>
          ) : publicBeans.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-500 dark:text-stone-400">
              {publicSearchQuery.trim()
                ? "No public or shared beans match your search."
                : "No public or shared beans to show yet. Add your first bean above and share it to make it public."}
            </p>
          ) : (
            publicBeans.map((bean) => (
              <PublicBeanRow
                key={bean.id}
                bean={bean}
                onAdd={() => addToCollection.mutate(bean.id)}
                isAdding={
                  addToCollection.isPending &&
                  addToCollection.variables === bean.id
                }
                inCollection={bean.inCollection}
              />
            ))
          )}
        </div>
      </div>

      {modal}
    </div>
  );
}

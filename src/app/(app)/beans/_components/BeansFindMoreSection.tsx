"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { PublicBeanSummary } from "@/components/beans/hooks";
import { PublicBeanRow } from "./PublicBeanRow";

export function BeansFindMoreSection({
  publicSearchQuery,
  onPublicSearchQueryChange,
  publicBeansLoading,
  publicBeans,
  addToCollection,
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
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-stone-700 dark:bg-stone-900/30">
      <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
        Find more beans
      </p>
      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
        Search public beans and beans shared with you. Add any to your collection.
      </p>
      <div className="relative mt-3">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Search by name, origin, roaster…"
          value={publicSearchQuery}
          onChange={(e) => onPublicSearchQueryChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder-stone-400 outline-none transition-colors focus:border-stone-400 focus:ring-1 focus:ring-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder-stone-500 dark:focus:border-stone-500 dark:focus:ring-stone-500"
        />
      </div>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
        {publicBeansLoading ? (
          <p className="py-4 text-center text-sm text-stone-500 dark:text-stone-400">
            Searching…
          </p>
        ) : publicBeans.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500 dark:text-stone-400">
            {publicSearchQuery.trim()
              ? "No beans match your search."
              : "No public or shared beans to show yet."}
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
  );
}

"use client";

import Link from "next/link";
import { useBean, useAddBeanToCollection, useUpdateShareMyShots } from "@/components/beans/hooks";
import { AppRoutes, resolvePath } from "@/app/routes";

interface ShareBeanVisitorActionsProps {
  beanId: string;
  slug: string;
}

export function ShareBeanVisitorActions({
  beanId,
}: ShareBeanVisitorActionsProps) {
  const { data: bean } = useBean(beanId);
  const addToCollection = useAddBeanToCollection();
  const updateShareMyShots = useUpdateShareMyShots(beanId);

  const handleFollow = () => {
    addToCollection.mutate(beanId);
  };

  const inCollection = bean?.userBean != null;
  const shareMyShotsPublicly =
    (bean?.userBean?.shotHistoryAccess ?? "restricted") === "anyone_with_link" ||
    (bean?.userBean?.shotHistoryAccess ?? "restricted") === "public";
  const isPending = addToCollection.isPending && addToCollection.variables === beanId;
  const isSuccess = addToCollection.isSuccess && addToCollection.variables === beanId;
  const showViewBeans = inCollection || isSuccess;

  const viewBeansHref = resolvePath(AppRoutes.beans.beanId, { id: beanId }, {
    sharing: "true",
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
        Add to your collection
      </p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        Follow this bean to track your own shots and add it to your beans list.
      </p>
      {showViewBeans ? (
        <Link
          href={viewBeansHref}
          className="mt-3 inline-block rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          View Beans
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleFollow}
          disabled={isPending}
          className="mt-3 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          {isPending ? "Adding…" : "Follow"}
        </button>
      )}

      {inCollection && (
        <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-700">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
            <input
              type="checkbox"
              checked={shareMyShotsPublicly}
              onChange={(e) =>
                updateShareMyShots.mutate(
                  e.target.checked ? "public" : "restricted",
                )
              }
              disabled={updateShareMyShots.isPending}
              className="h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500 dark:border-stone-600 dark:bg-stone-800"
            />
            Share my shot history on this page
          </label>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            When on, your shots for this bean appear in the public shot log and stats.
          </p>
        </div>
      )}
    </div>
  );
}

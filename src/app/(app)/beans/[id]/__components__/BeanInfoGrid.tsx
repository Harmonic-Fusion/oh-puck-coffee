"use client";

import type { BeanWithUserData } from "@/shared/beans/schema";
import { InfoField } from "./InfoField";

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BeanInfoGrid({
  bean,
  shotsLoading,
  nonHiddenShotsLength,
}: {
  bean: BeanWithUserData;
  shotsLoading: boolean;
  nonHiddenShotsLength: number;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        <InfoField label="Roast Level" value={bean.roastLevel} />
        <InfoField label="Origin" value={bean.origin} />
        <InfoField label="Origin Details" value={bean.originDetails} />
        <InfoField label="Roaster" value={bean.roaster} />
        <InfoField label="Processing" value={bean.processingMethod} />
        <InfoField
          label={bean.isRoastDateBestGuess ? "Roast Date (est.)" : "Roast Date"}
          value={bean.roastDate ? fmtDate(bean.roastDate) : null}
        />
        <InfoField
          label="Open Bag Date"
          value={
            bean.userBean?.openBagDate
              ? fmtDate(bean.userBean.openBagDate)
              : null
          }
        />
        <InfoField
          label="Shots Logged"
          value={shotsLoading ? "…" : String(nonHiddenShotsLength)}
        />
      </div>
    </div>
  );
}

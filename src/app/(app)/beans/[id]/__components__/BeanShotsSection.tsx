"use client";

import { useMemo, useCallback } from "react";
import type { ShotWithJoins } from "@/components/shots/hooks";
import {
  beanShotToShotsWithJoin,
  useShotsHistoryController,
} from "@/components/shots/ShotsHistory";
import type { BeanShotWithUser, BeanShotContributor } from "@/components/beans/hooks";
import type { BeanWithUserData } from "@/shared/beans/schema";
import { FlavorRatingsChart } from "@/components/stats/FlavorRatingsChart";
import { ParameterRatingChart } from "@/components/shots/ParameterRatingChart";
import { BeanShotsSelectors } from "./BeanShotsSelectors";
import { BeanShotsTablePanel } from "./BeanShotsTablePanel";

interface BeanShotsSectionProps {
  bean: Pick<BeanWithUserData, "id" | "name" | "roastDate" | "roastLevel">;
  shots: BeanShotWithUser[];
  contributors: BeanShotContributor[];
  currentUserId: string;
  isLoading: boolean;
  isUnshared: boolean;
}

export function BeanShotsSection({
  bean,
  shots,
  contributors,
  currentUserId,
  isLoading,
  isUnshared,
}: BeanShotsSectionProps) {
  const editable = !isUnshared;

  const mappedShots = useMemo(
    () => shots.map((s) => beanShotToShotsWithJoin(bean, s)),
    [shots, bean],
  );

  const canMutateShot = useCallback(
    (shot: ShotWithJoins) => editable && shot.userId === currentUserId,
    [editable, currentUserId],
  );

  const ctrl = useShotsHistoryController({
    data: mappedShots,
    canMutateShot,
    includeBeanColumn: false,
    includeEquipmentColumns: false,
    includeHiddenColumn: true,
    csvFilenamePrefix: `coffee-shots-${bean.name.replace(/[^\w\-]+/g, "_")}`,
    currentUserId,
  });

  if (!isLoading && mappedShots.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
        No shots to display.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <BeanShotsSelectors
        ctrl={ctrl}
        contributorCount={contributors.length}
        filteredRowCount={ctrl.filteredRowCount}
        onExportCsv={ctrl.handleExport}
        onCopyForAi={ctrl.handleCopyForAi}
      />

      <FlavorRatingsChart shots={ctrl.filteredShots} isLoading={isLoading} />
      <ParameterRatingChart shots={ctrl.filteredShots} isLoading={isLoading} />

      <div>
        <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
          Shot History
        </h3>
        <BeanShotsTablePanel
          ctrl={ctrl}
          editable={editable}
          canMutateShot={canMutateShot}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

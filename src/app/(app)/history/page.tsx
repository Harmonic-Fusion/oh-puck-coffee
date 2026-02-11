"use client";

import { useState } from "react";
import {
  useShots,
  useDeleteShot,
  useToggleReference,
  useToggleHidden,
  type ShotWithJoins,
} from "@/components/shots/hooks";
import { ShotTable } from "@/components/shots/log/ShotTable";
import { ShotFilters } from "@/components/shots/log/ShotFilters";
import { ShotDetail } from "@/components/shots/log/ShotDetail";
import { exportShotsToCSV, downloadCSV } from "@/lib/csv-export";
import { useToast } from "@/components/common/Toast";
import { TableSkeleton } from "@/components/common/Skeleton";

export default function HistoryPage() {
  const [userId, setUserId] = useState("");
  const [beanId, setBeanId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: shots, isLoading } = useShots({
    userId: userId || undefined,
    beanId: beanId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const deleteShot = useDeleteShot();
  const toggleReference = useToggleReference();
  const toggleHidden = useToggleHidden();
  const { showToast } = useToast();

  const [selectedShot, setSelectedShot] = useState<ShotWithJoins | null>(null);

  const handleDelete = async (id: string) => {
    deleteShot.mutate(id);
    if (selectedShot?.id === id) {
      setSelectedShot(null);
    }
  };

  const handleToggleReference = (id: string) => {
    toggleReference.mutate(id, {
      onSuccess: (updatedShot) => {
        if (selectedShot?.id === id) {
          setSelectedShot((prev) => 
            prev ? { ...prev, isReferenceShot: updatedShot.isReferenceShot } : null
          );
        }
      },
    });
  };

  const handleToggleHidden = (id: string) => {
    toggleHidden.mutate(id, {
      onSuccess: (updatedShot) => {
        if (selectedShot?.id === id) {
          setSelectedShot((prev) => 
            prev ? { ...prev, isHidden: updatedShot.isHidden } : null
          );
        }
      },
    });
  };

  const handleBulkDelete = async (ids: string[]) => {
    for (const id of ids) {
      deleteShot.mutate(id);
    }
  };

  const handleBulkToggleReference = (ids: string[]) => {
    ids.forEach((id) => toggleReference.mutate(id));
  };

  const handleBulkToggleHidden = (ids: string[]) => {
    ids.forEach((id) => toggleHidden.mutate(id));
  };

  const handleExportCSV = () => {
    if (!shots || shots.length === 0) {
      showToast("warning", "No shots to export");
      return;
    }
    try {
      const csv = exportShotsToCSV(shots);
      const filename = `coffee-shots-${new Date().toISOString().split("T")[0]}.csv`;
      downloadCSV(csv, filename);
      showToast("success", `Exported ${shots.length} shot(s) to CSV`);
    } catch (error) {
      console.error("Export failed:", error);
      showToast("error", "Failed to export shots");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
            Shot History
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Browse and sort all your logged espresso shots
          </p>
        </div>
        {shots && shots.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          >
            Export CSV
          </button>
        )}
      </div>

      <div className="mb-4">
        <ShotFilters
          userId={userId}
          beanId={beanId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onUserChange={setUserId}
          onBeanChange={setBeanId}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
      </div>

      {isLoading ? (
        <div className="md:hidden">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
              />
            ))}
          </div>
          <div className="hidden md:block">
            <TableSkeleton rows={5} />
          </div>
        </div>
      ) : (
        <ShotTable
          data={shots || []}
          onToggleReference={(id) => toggleReference.mutate(id)}
          onToggleHidden={(id) => toggleHidden.mutate(id)}
          onClickShot={(shot) => setSelectedShot(shot)}
          onBulkDelete={handleBulkDelete}
          onBulkToggleReference={handleBulkToggleReference}
          onBulkToggleHidden={handleBulkToggleHidden}
        />
      )}

      <ShotDetail
        shot={selectedShot}
        open={!!selectedShot}
        onClose={() => setSelectedShot(null)}
        onDelete={handleDelete}
        onToggleReference={handleToggleReference}
        onToggleHidden={handleToggleHidden}
      />
    </div>
  );
}

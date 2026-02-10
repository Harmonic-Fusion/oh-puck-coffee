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

  const [selectedShot, setSelectedShot] = useState<ShotWithJoins | null>(null);

  const handleDelete = async (id: string) => {
    deleteShot.mutate(id);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Shot History
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Browse and sort all your logged espresso shots
        </p>
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
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-amber-600" />
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
      />
    </div>
  );
}

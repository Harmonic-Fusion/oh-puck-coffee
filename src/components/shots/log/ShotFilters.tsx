"use client";

import { useUsers } from "@/components/users/hooks";
import { useBeans } from "@/components/beans/hooks";
import { Select } from "@/components/common/Select";

interface ShotFiltersProps {
  userId: string;
  beanId: string;
  dateFrom: string;
  dateTo: string;
  onUserChange: (userId: string) => void;
  onBeanChange: (beanId: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
}

export function ShotFilters({
  userId,
  beanId,
  dateFrom,
  dateTo,
  onUserChange,
  onBeanChange,
  onDateFromChange,
  onDateToChange,
}: ShotFiltersProps) {
  const { data: users } = useUsers();
  const { data: beans } = useBeans();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <div className="min-w-[140px] flex-1">
        <Select
          label="User"
          value={userId}
          onChange={(e) => onUserChange(e.target.value)}
        >
          <option value="">All Users</option>
          {users?.map((u: { id: string; name: string | null }) => (
            <option key={u.id} value={u.id}>
              {u.name || u.id}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-[140px] flex-1">
        <Select
          label="Bean"
          value={beanId}
          onChange={(e) => onBeanChange(e.target.value)}
        >
          <option value="">All Beans</option>
          {beans?.map((b: { id: string; name: string }) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-[140px] flex-1">
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
          From
        </label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
        />
      </div>

      <div className="min-w-[140px] flex-1">
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
          To
        </label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
        />
      </div>
    </div>
  );
}

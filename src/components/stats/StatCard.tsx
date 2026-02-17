"use client";

interface StatCardProps {
  label: string;
  value: string | number | null;
  icon: string;
  subtext?: string;
}

export function StatCard({ label, value, icon, subtext }: StatCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3.5 dark:border-stone-700 dark:bg-stone-900">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-bold text-stone-800 dark:text-stone-100">
          {value ?? "—"}
        </p>
        {subtext && (
          <p className="mt-0.5 truncate text-xs text-stone-400 dark:text-stone-500">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

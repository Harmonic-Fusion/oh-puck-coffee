"use client";

export function BeansPageSkeleton() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
        Beans
      </h1>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
          />
        ))}
      </div>
    </>
  );
}

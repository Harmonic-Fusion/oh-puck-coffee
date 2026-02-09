export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Stats and analytics coming in Phase 3
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-16 dark:border-stone-700 dark:bg-stone-900">
        <span className="text-4xl">📊</span>
        <p className="mt-4 text-stone-500 dark:text-stone-400">
          Dashboard will show shot statistics, brew ratio trends, and flavor profiles
        </p>
      </div>
    </div>
  );
}

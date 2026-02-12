export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Connect external services to sync your espresso data
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                Google Sheets
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                Coming Soon
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Automatically sync your shot data to a Google Spreadsheet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useIntegration } from "@/components/integrations/hooks";
import { IntegrationStatus } from "@/components/integrations/IntegrationStatus";
import { LinkSheetForm } from "@/components/integrations/LinkSheetForm";

export default function IntegrationsPage() {
  const { data: integration, isLoading } = useIntegration();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Connect your Google Sheet to sync espresso data
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-amber-600" />
        </div>
      ) : integration ? (
        <IntegrationStatus integration={integration} />
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                Link a Google Sheet
              </h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Paste your Google Spreadsheet URL to sync shot data
                automatically.
              </p>
            </div>
            <LinkSheetForm />
          </div>

          <div className="rounded-lg bg-stone-100 p-4 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            <p className="font-medium">How it works:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>Create a new Google Sheet (or use an existing one)</li>
              <li>Share the sheet with your Google account</li>
              <li>Paste the URL above and click Validate</li>
              <li>Click Link Sheet — a header row will be added</li>
              <li>Every new shot you log will be appended automatically</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

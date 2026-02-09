"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useLinkSheet, useValidateSheet } from "./hooks";

export function LinkSheetForm() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [validatedTitle, setValidatedTitle] = useState<string | null>(null);
  const [extractedId, setExtractedId] = useState<string | null>(null);

  const validateSheet = useValidateSheet();
  const linkSheet = useLinkSheet();

  // Extract spreadsheet ID from URL or raw ID
  function extractSpreadsheetId(input: string): string | null {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    // If it looks like a raw ID (no slashes)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
    return null;
  }

  const handleValidate = async () => {
    const id = extractSpreadsheetId(spreadsheetUrl);
    if (!id) return;
    setExtractedId(id);

    try {
      const result = await validateSheet.mutateAsync(id);
      setValidatedTitle(result.title);
    } catch {
      setValidatedTitle(null);
    }
  };

  const handleLink = async () => {
    if (!extractedId) return;
    await linkSheet.mutateAsync(extractedId);
    setSpreadsheetUrl("");
    setValidatedTitle(null);
    setExtractedId(null);
  };

  const idValid = extractSpreadsheetId(spreadsheetUrl) !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="Google Spreadsheet URL"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={spreadsheetUrl}
            onChange={(e) => {
              setSpreadsheetUrl(e.target.value);
              setValidatedTitle(null);
              setExtractedId(null);
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleValidate}
          loading={validateSheet.isPending}
          disabled={!idValid || validateSheet.isPending}
        >
          Validate
        </Button>
      </div>

      {validateSheet.isError && (
        <p className="text-sm text-red-500">
          {validateSheet.error.message}
        </p>
      )}

      {validatedTitle && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                ✓ Spreadsheet accessible
              </p>
              <p className="mt-0.5 text-sm text-green-700 dark:text-green-400">
                {validatedTitle}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleLink}
              loading={linkSheet.isPending}
              disabled={linkSheet.isPending}
            >
              Link Sheet
            </Button>
          </div>
        </div>
      )}

      {linkSheet.isError && (
        <p className="text-sm text-red-500">{linkSheet.error.message}</p>
      )}
    </div>
  );
}

/**
 * Generic CSV export utility
 * Exports any data to CSV format with proper escaping
 */

export interface CSVColumn<TData> {
  id: string;
  header: string;
  accessorFn?: (row: TData) => string | number | null | undefined;
}

/**
 * Escape CSV values (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export data to CSV format
 */
export function exportToCsv<TData>(
  filename: string,
  rows: TData[],
  columns: CSVColumn<TData>[]
): void {
  // Build header row
  const headers = columns.map((col) => escapeCSV(col.header));
  const headerRow = headers.join(",");

  // Build data rows
  const dataRows = rows.map((row) => {
    return columns
      .map((col) => {
        const value = col.accessorFn
          ? col.accessorFn(row)
          : (row as Record<string, unknown>)[col.id];
        return escapeCSV(
          value as string | number | null | undefined
        );
      })
      .join(",");
  });

  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

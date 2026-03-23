import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- matches TanStack's ColumnMeta shape
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * Secondary copy beside the {@link TrueFilter} switch; the trigger and popover title use `header`.
     */
    description?: string;
  }
}

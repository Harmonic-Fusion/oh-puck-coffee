"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type Table,
} from "@tanstack/react-table";
import type { ShotWithJoins } from "@/components/shots/hooks";
import type { FilterDescriptor } from "@/components/ui/filter-bar";

/** Multi-select: row matches if its value is in the selected set. */
export function multiSelectFilterFn(
  rowValue: string | null | undefined,
  filterValues: string[],
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  if (rowValue == null) return false;
  return filterValues.includes(rowValue);
}

/** Numeric bucket: row matches if its rounded value is in the selected set. */
export function numericBucketFilterFn(
  rowValue: number | null | undefined,
  filterValues: string[],
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  if (rowValue == null) return false;
  return filterValues.some((v) => Math.round(rowValue) === Number(v));
}

/** Date range: row matches if its date is within [from, to]. */
export function dateRangeFilterFn(
  rowValue: string,
  filterValue: [string, string],
): boolean {
  if (!filterValue || (!filterValue[0] && !filterValue[1])) return true;
  const d = new Date(rowValue).getTime();
  if (filterValue[0] && d < new Date(filterValue[0]).getTime()) return false;
  if (filterValue[1]) {
    const toEnd = new Date(filterValue[1]);
    toEnd.setHours(23, 59, 59, 999);
    if (d > toEnd.getTime()) return false;
  }
  return true;
}

/** Boolean: row matches selected true/false values */
export function booleanFilterFn(
  rowValue: boolean,
  filterValues: string[],
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  return filterValues.includes(String(rowValue));
}

const columnHelper = createColumnHelper<ShotWithJoins>();

export interface ShotsTableOptions {
  includeBeanColumn?: boolean;
  includeEquipmentColumns?: boolean;
  /** Adds `isHidden` column + True filter descriptor (e.g. bean shot history). */
  includeHiddenColumn?: boolean;
  /** Marks the current user in the User filter option labels as `Name (you)`. */
  currentUserId?: string;
}

export function buildShotsTableColumns(options?: ShotsTableOptions) {
  const includeBean = options?.includeBeanColumn !== false;
  const includeEquipment = options?.includeEquipmentColumns !== false;
  const includeHidden = options?.includeHiddenColumn === true;

  const cols = [
    columnHelper.accessor("createdAt", {
      id: "date",
      header: "Date",
      cell: (info) =>
        new Date(info.getValue()).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      sortingFn: "datetime",
      filterFn: (row, _id, value) =>
        dateRangeFilterFn(row.original.createdAt, value as [string, string]),
    }),
    ...(includeBean
      ? [
          columnHelper.accessor("beanName", {
            id: "bean",
            header: "Bean",
            cell: (info) => info.getValue() ?? "—",
            filterFn: (row, _id, value) =>
              multiSelectFilterFn(row.original.beanName, value as string[]),
          }),
        ]
      : []),
    columnHelper.accessor("doseGrams", {
      id: "dose",
      header: "Dose",
      cell: (info) => (info.getValue() ? `${info.getValue()}g` : "—"),
      enableColumnFilter: false,
    }),
    columnHelper.accessor("yieldGrams", {
      id: "yield",
      header: "Yield",
      cell: (info) => (info.getValue() ? `${info.getValue()}g` : "—"),
      enableColumnFilter: false,
    }),
    columnHelper.accessor("brewRatio", {
      id: "ratio",
      header: "Ratio",
      cell: (info) => {
        const v = info.getValue();
        return v != null ? `1:${v}` : "—";
      },
      enableColumnFilter: false,
    }),
    columnHelper.accessor("brewTimeSecs", {
      id: "time",
      header: "Time",
      cell: (info) => {
        const v = info.getValue();
        return v != null ? `${v}s` : "—";
      },
      enableColumnFilter: false,
    }),
    columnHelper.accessor("grindLevel", {
      id: "grind",
      header: "Grind",
      cell: (info) => info.getValue() ?? "—",
      enableColumnFilter: false,
    }),
    ...(includeEquipment
      ? [
          columnHelper.accessor("grinderName", {
            id: "grinder",
            header: "Grinder",
            cell: (info) => info.getValue() ?? "—",
            filterFn: (row, _id, value) =>
              multiSelectFilterFn(row.original.grinderName, value as string[]),
          }),
          columnHelper.accessor("machineName", {
            id: "machine",
            header: "Machine",
            cell: (info) => info.getValue() ?? "—",
            filterFn: (row, _id, value) =>
              multiSelectFilterFn(
                row.original.machineName,
                value as string[],
              ),
          }),
        ]
      : []),
    columnHelper.accessor("userName", {
      id: "user",
      header: "User",
      cell: (info) => info.getValue() ?? "—",
      filterFn: (row, _id, value) =>
        multiSelectFilterFn(row.original.userName, value as string[]),
    }),
    columnHelper.accessor("rating", {
      id: "rating",
      header: "Rating",
      cell: (info) => {
        const v = info.getValue();
        return v != null ? `${v}/5` : "—";
      },
      filterFn: (row, _id, value) =>
        numericBucketFilterFn(row.original.rating, value as string[]),
    }),
    columnHelper.accessor("isReferenceShot", {
      id: "ref",
      header: "Ref",
      cell: (info) => (info.getValue() ? "🔖" : ""),
      enableSorting: false,
      filterFn: (row, _id, value) =>
        booleanFilterFn(row.original.isReferenceShot, value as string[]),
    }),
    columnHelper.accessor("shotQuality", {
      id: "quality",
      header: "Quality",
      cell: (info) => {
        const v = info.getValue();
        return v != null ? `${v}/5` : "—";
      },
      filterFn: (row, _id, value) =>
        numericBucketFilterFn(row.original.shotQuality, value as string[]),
    }),
    ...(includeHidden
      ? [
          columnHelper.accessor("isHidden", {
            id: "hidden",
            header: "Is Hidden",
            meta: {
              description: "Include hidden shots",
            },
            cell: (info) => (info.getValue() ? "Yes" : ""),
            enableSorting: false,
            filterFn: (row, _id, value) => {
              if (value === "true") return true;
              return !row.original.isHidden;
            },
          }),
        ]
      : []),
  ];

  return cols;
}

export function buildShotFilterDescriptors(
  data: ShotWithJoins[],
  options?: ShotsTableOptions,
): FilterDescriptor[] {
  const includeBean = options?.includeBeanColumn !== false;
  const includeEquipment = options?.includeEquipmentColumns !== false;
  const includeHidden = options?.includeHiddenColumn === true;

  function uniqueSorted(accessor: (s: ShotWithJoins) => string | null | undefined) {
    const unique = new Set<string>();
    data.forEach((s) => {
      const v = accessor(s);
      if (v) unique.add(v);
    });
    return Array.from(unique)
      .sort()
      .map((v) => ({ label: v, value: v }));
  }

  const ratingOptions = [1, 2, 3, 4, 5].map((n) => ({
    label: `${n}`,
    value: `${n}`,
  }));
  const refOptions = [
    { label: "Reference", value: "true" },
    { label: "Not reference", value: "false" },
  ];

  const descriptors: FilterDescriptor[] = [{ columnId: "date" }];
  if (includeBean) {
    descriptors.push({ columnId: "bean", options: uniqueSorted((s) => s.beanName) });
  }
  if (includeEquipment) {
    descriptors.push(
      { columnId: "grinder", options: uniqueSorted((s) => s.grinderName) },
      { columnId: "machine", options: uniqueSorted((s) => s.machineName) },
    );
  }
  descriptors.push(
    { columnId: "quality", options: ratingOptions },
    { columnId: "rating", options: ratingOptions },
    { columnId: "ref", options: refOptions },
  );
  if (includeHidden) {
    descriptors.push({ columnId: "hidden", trueFilter: true });
  }
  const userNameOptions = uniqueSorted((s) => s.userName);
  const currentUserId = options?.currentUserId;
  const userOptions =
    currentUserId != null && currentUserId !== ""
      ? userNameOptions.map((opt) => {
          const isYou = data.some(
            (s) =>
              s.userName === opt.value && s.userId === currentUserId,
          );
          return {
            label: isYou ? `${opt.label} (you)` : opt.label,
            value: opt.value,
          };
        })
      : userNameOptions;
  descriptors.push({ columnId: "user", options: userOptions });

  return descriptors;
}

/** When data has multiple user IDs, put the User filter first; otherwise omit it. */
export function withUserFilterDescriptorPlacement(
  descriptors: FilterDescriptor[],
  data: ShotWithJoins[],
): FilterDescriptor[] {
  const userIds = new Set(data.map((s) => s.userId));
  const hasMultipleUsers = userIds.size > 1;
  const userDesc = descriptors.find((f) => f.columnId === "user");
  const rest = descriptors.filter((f) => f.columnId !== "user");
  if (!hasMultipleUsers || !userDesc) return rest;
  return [userDesc, ...rest];
}

export function useShotsTable({
  data,
  sorting,
  setSorting,
  columnFilters,
  setColumnFilters,
  globalFilter,
  setGlobalFilter,
  includeBeanColumn = true,
  includeEquipmentColumns = true,
  includeHiddenColumn = false,
}: {
  data: ShotWithJoins[];
  sorting: SortingState;
  setSorting: Dispatch<SetStateAction<SortingState>>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
  globalFilter: string;
  setGlobalFilter: Dispatch<SetStateAction<string>>;
  includeBeanColumn?: boolean;
  includeEquipmentColumns?: boolean;
  includeHiddenColumn?: boolean;
}): Table<ShotWithJoins> {
  "use no memo";
  const columns = useMemo(
    () =>
      buildShotsTableColumns({
        includeBeanColumn,
        includeEquipmentColumns,
        includeHiddenColumn,
      }),
    [includeBeanColumn, includeEquipmentColumns, includeHiddenColumn],
  );
  // eslint-disable-next-line react-hooks/incompatible-library
  return useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    autoResetPageIndex: false,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase().trim();
      if (!q) return true;
      const s = row.original;
      return [
        s.beanName,
        s.grinderName,
        s.machineName,
        s.userName,
        s.notes,
      ].some((f) => f != null && f.toLowerCase().includes(q));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => row.id,
  });
}

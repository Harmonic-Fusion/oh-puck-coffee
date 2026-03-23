import { createColumnHelper } from "@tanstack/react-table";
import type { BeanWithCounts } from "@/components/beans/hooks";
import { dateRangeFilterFn, formatDate, multiSelectFilterFn } from "./bean-table-utils";

const columnHelper = createColumnHelper<BeanWithCounts>();

export const beansTableColumns = [
  columnHelper.accessor("name", {
    id: "name",
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("roaster", {
    id: "roaster",
    header: "Roaster",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.roaster, value as string[]),
  }),
  columnHelper.accessor("origin", {
    id: "origin",
    header: "Origin",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.origin, value as string[]),
  }),
  columnHelper.accessor("roastLevel", {
    id: "roastLevel",
    header: "Roast",
    cell: (info) => info.getValue(),
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.roastLevel, value as string[]),
  }),
  columnHelper.accessor("processingMethod", {
    id: "processingMethod",
    header: "Process",
    cell: (info) => info.getValue() ?? "—",
    filterFn: (row, _id, value) =>
      multiSelectFilterFn(row.original.processingMethod, value as string[]),
  }),
  columnHelper.accessor("roastDate", {
    id: "roastDate",
    header: "Roast Date",
    cell: (info) => formatDate(info.getValue()),
    sortingFn: (a, b) => {
      const aDate = a.original.roastDate ? new Date(a.original.roastDate).getTime() : 0;
      const bDate = b.original.roastDate ? new Date(b.original.roastDate).getTime() : 0;
      return aDate - bDate;
    },
  }),
  columnHelper.accessor("shotCount", {
    id: "shotCount",
    header: "Shots",
    cell: (info) => info.getValue(),
    enableColumnFilter: false,
  }),
  columnHelper.accessor("avgRating", {
    id: "avgRating",
    header: "Avg Rating",
    cell: (info) => {
      const val = info.getValue();
      return val != null ? `★ ${val.toFixed(1)}` : "—";
    },
    sortingFn: (a, b) => {
      const aVal = a.original.avgRating ?? 0;
      const bVal = b.original.avgRating ?? 0;
      return aVal - bVal;
    },
    enableColumnFilter: false,
  }),
  columnHelper.accessor("bestRating", {
    id: "bestRating",
    header: "Best Rating",
    cell: (info) => {
      const val = info.getValue();
      return val != null ? `★ ${val.toFixed(1)}` : "—";
    },
    sortingFn: (a, b) => {
      const aVal = a.original.bestRating ?? 0;
      const bVal = b.original.bestRating ?? 0;
      return aVal - bVal;
    },
    enableColumnFilter: false,
  }),
  columnHelper.accessor("lastShotAt", {
    id: "lastShotAt",
    header: "Last Shot",
    cell: (info) => formatDate(info.getValue()),
    sortingFn: (a, b) => {
      const aDate = a.original.lastShotAt ? new Date(a.original.lastShotAt).getTime() : 0;
      const bDate = b.original.lastShotAt ? new Date(b.original.lastShotAt).getTime() : 0;
      return aDate - bDate;
    },
    enableColumnFilter: false,
  }),
  columnHelper.accessor("createdAt", {
    id: "createdAt",
    header: "Added",
    cell: (info) => formatDate(info.getValue()),
    filterFn: (row, _id, value) =>
      dateRangeFilterFn(row.original.createdAt, value as [string, string]),
    sortingFn: (a, b) => {
      const aDate = a.original.createdAt ? new Date(a.original.createdAt).getTime() : 0;
      const bDate = b.original.createdAt ? new Date(b.original.createdAt).getTime() : 0;
      return aDate - bDate;
    },
  }),
];

export const beansTableColumnCount = beansTableColumns.length;

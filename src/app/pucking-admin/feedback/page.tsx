"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { useAdminData } from "@/components/admin/hooks";
import { FeedbackEditForm } from "@/components/admin/forms/FeedbackEditForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { ApiRoutes } from "@/app/routes";

export type FeedbackStatus =
  | "new"
  | "reviewed"
  | "in_progress"
  | "complete"
  | "wont_implement";

export interface AdminFeedback {
  id: string;
  userId: string;
  type: "bug" | "feature" | "other";
  subject: string;
  message: string;
  status: FeedbackStatus;
  priority: number | null;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
}

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  in_progress: "In Progress",
  complete: "Complete",
  wont_implement: "Won't Implement",
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reviewed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  complete: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  wont_implement: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  bug: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  feature: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  other: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

const PAGE_SIZE = 25;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adminFeedback = (ApiRoutes.admin as any).feedback as {
  path: string;
  feedbackId: { path: string };
  bulk: { path: string };
};
const ENDPOINT = adminFeedback.path;
const BULK_ENDPOINT = adminFeedback.bulk.path;

export default function AdminFeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [editTarget, setEditTarget] = useState<AdminFeedback | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminFeedback | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<FeedbackStatus | "">("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const typeFilter = searchParams.get("type") || "";
  const statusFilter = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const extraParams: Record<string, string> = {};
  if (typeFilter) extraParams.type = typeFilter;
  if (statusFilter) extraParams.status = statusFilter;
  if (dateFrom) extraParams.dateFrom = dateFrom;
  if (dateTo) extraParams.dateTo = dateTo;

  const { data, isLoading, isError } = useAdminData<AdminFeedback>(ENDPOINT, {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    extraParams,
  });

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setPage(0);
    setSelectedIds(new Set());
    router.push(`?${params.toString()}`);
  }

  function resetFilters() {
    setPage(0);
    setSelectedIds(new Set());
    router.push("?");
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const rows = data?.data ?? [];
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }

  const handleBulkApply = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!bulkStatus && bulkPriority === "") return;

    setBulkLoading(true);
    setBulkError("");
    try {
      const body: Record<string, unknown> = { ids: Array.from(selectedIds) };
      if (bulkStatus) body.status = bulkStatus;
      if (bulkPriority !== "") body.priority = parseInt(bulkPriority, 10);

      const res = await fetch(BULK_ENDPOINT, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setBulkError(d.error || "Request failed");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: [ENDPOINT] });
      setSelectedIds(new Set());
      setBulkStatus("");
      setBulkPriority("");
    } catch {
      setBulkError("Network error");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, bulkStatus, bulkPriority, queryClient]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteLoading(true);
    setBulkError("");
    try {
      const res = await fetch(BULK_ENDPOINT, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setBulkError(d.error || "Request failed");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: [ENDPOINT] });
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
    } catch {
      setBulkError("Network error");
    } finally {
      setBulkDeleteLoading(false);
    }
  }, [selectedIds, queryClient]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/admin/feedback/${deleteTarget.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: [ENDPOINT] });
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, queryClient]);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = page * PAGE_SIZE + 1;
  const endItem = Math.min((page + 1) * PAGE_SIZE, total);
  const allSelected = rows.length > 0 && selectedIds.size === rows.length;

  const hasFilters = !!(typeFilter || statusFilter || dateFrom || dateTo);

  return (
    <>
      <AdminBreadcrumb segments={[{ label: "Feedback" }]} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Feedback</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 ml-2">
          <select
            value={typeFilter}
            onChange={(e) => updateFilter("type", e.target.value)}
            className="h-8 rounded border border-stone-200 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            <option value="">All types</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="h-8 rounded border border-stone-200 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABELS) as FeedbackStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            className="h-8 rounded border border-stone-200 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            placeholder="From"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
            className="h-8 rounded border border-stone-200 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            placeholder="To"
            title="To date"
          />

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="h-8 rounded px-2 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/20">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-400">
            {selectedIds.size} selected
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as FeedbackStatus | "")}
            className="h-7 rounded border border-stone-200 bg-white px-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            <option value="">Set status…</option>
            {(Object.keys(STATUS_LABELS) as FeedbackStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={100}
            value={bulkPriority}
            onChange={(e) => setBulkPriority(e.target.value)}
            placeholder="Priority 0–100"
            className="h-7 w-32 rounded border border-stone-200 bg-white px-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          />
          <button
            onClick={handleBulkApply}
            disabled={bulkLoading || (!bulkStatus && bulkPriority === "")}
            className="h-7 rounded bg-amber-700 px-3 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {bulkLoading ? "Applying…" : `Apply to ${selectedIds.size}`}
          </button>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            disabled={bulkLoading}
            className="h-7 rounded border border-red-300 bg-white px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-stone-900 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Delete {selectedIds.size}
          </button>
          {bulkError && (
            <span className="text-xs text-red-600 dark:text-red-400">{bulkError}</span>
          )}
        </div>
      )}

      <div className="rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-stone-500">Loading…</div>
        )}
        {isError && (
          <div className="py-12 text-center text-red-600 dark:text-red-400">
            Failed to load feedback
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-stone-400">
                      No feedback found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[row.type] ?? TYPE_COLORS.other}`}
                        >
                          {TYPE_LABELS[row.type] ?? row.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-stone-600 dark:text-stone-400">
                          {row.userEmail ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          title={row.subject}
                          className="block max-w-[240px] truncate text-sm"
                        >
                          {row.subject}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status] ?? STATUS_COLORS.new}`}
                        >
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.priority !== null ? (
                          <span className="text-sm tabular-nums">{row.priority}</span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          {new Date(row.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditTarget(row)}
                            className="rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 dark:border-stone-700">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {total === 0 ? "No records" : `Showing ${startItem}–${endItem} of ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded border border-stone-200 text-stone-600 disabled:opacity-40 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded border border-stone-200 text-stone-600 disabled:opacity-40 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editTarget && (
        <FeedbackEditForm
          open
          onClose={() => setEditTarget(null)}
          feedback={editTarget}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete feedback"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.subject}" from ${deleteTarget.userEmail ?? "unknown"}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={(open) => { if (!open) setBulkDeleteConfirm(false); }}
        title={`Delete ${selectedIds.size} feedback item${selectedIds.size !== 1 ? "s" : ""}`}
        description={`Permanently delete ${selectedIds.size} selected item${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleBulkDelete}
        loading={bulkDeleteLoading}
      />
    </>
  );
}

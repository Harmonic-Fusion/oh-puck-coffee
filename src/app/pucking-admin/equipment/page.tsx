"use client";

import { useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GenericDataTable, type ColumnDef } from "@/components/admin/GenericDataTable";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { ApiRoutes, AppRoutes, resolvePath } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { AdminNewEquipmentModal } from "@/components/admin/equipment/AdminNewEquipmentModal";
import { AdminEquipmentAiSearchModal } from "@/components/admin/equipment/AdminEquipmentAiSearchModal";
import { ADMIN_EQUIPMENT_TYPE_OPTIONS, type EquipmentType } from "@/shared/equipment/schema";

interface AdminEquipmentRow {
  id: string;
  type: EquipmentType;
  name: string;
  brand: string | null;
  isGlobal: boolean;
  adminApproved: boolean;
  createdAt: string;
  linksCount: number;
  nonNullSpecCount: number;
}

const LIST_ENDPOINT = ApiRoutes.admin.equipment.path;

function typeBadge(type: EquipmentType) {
  const colors: Record<EquipmentType, string> = {
    grinder: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    machine: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
    tool: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
    kettle: "bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-200",
    scale: "bg-lime-100 text-lime-900 dark:bg-lime-900/40 dark:text-lime-200",
    pour_over: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
    french_press: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
    moka_pot: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200",
    cold_brew: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-200",
  };
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${colors[type]}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminEquipmentListPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<"all" | EquipmentType>("all");
  const [approvalFilter, setApprovalFilter] = useState<"all" | "approved" | "pending">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);

  const extraParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (typeFilter !== "all") p.type = typeFilter;
    if (approvalFilter !== "all") p.approval = approvalFilter;
    return p;
  }, [typeFilter, approvalFilter]);

  const rowHref = useMemo(
    () => (row: AdminEquipmentRow) =>
      `${AppRoutes.puckingAdmin.equipment.path}/${encodeURIComponent(row.id)}`,
    [],
  );

  async function patchEquipmentRequest(id: string, body: Record<string, unknown>) {
    const url = resolvePath(ApiRoutes.admin.equipment.equipmentId, { id });
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(typeof err.error === "string" ? err.error : "Update failed");
    }
  }

  async function patchRow(id: string, body: Record<string, unknown>) {
    await patchEquipmentRequest(id, body);
    await queryClient.invalidateQueries({ queryKey: [LIST_ENDPOINT] });
  }

  const runBulkPatch = useCallback(
    async (ids: string[], body: Record<string, unknown>, clearSelection: () => void) => {
      setBulkError(null);
      setBulkWorking(true);
      try {
        for (const id of ids) {
          await patchEquipmentRequest(id, body);
        }
        await queryClient.invalidateQueries({ queryKey: [LIST_ENDPOINT] });
        clearSelection();
      } catch (e) {
        setBulkError(e instanceof Error ? e.message : "Bulk update failed");
      } finally {
        setBulkWorking(false);
      }
    },
    [queryClient],
  );

  const columns: ColumnDef<AdminEquipmentRow>[] = [
    {
      key: "type",
      label: "Type",
      render: (_, row) => typeBadge(row.type),
    },
    { key: "brand", label: "Brand" },
    { key: "name", label: "Name" },
    { key: "isGlobal", label: "Global" },
    { key: "adminApproved", label: "Approved" },
    { key: "nonNullSpecCount", label: "Specs" },
    { key: "linksCount", label: "Links" },
    { key: "createdAt", label: "Created" },
    {
      key: "id",
      label: "ID",
      render: (v) => (
        <span className="font-mono text-xs text-stone-400">{String(v).slice(0, 8)}…</span>
      ),
    },
  ];

  const selectionResetKey = JSON.stringify(extraParams);

  return (
    <>
      <AdminBreadcrumb segments={[{ label: "Equipment" }]} />

      {bulkError && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {bulkError}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            <option value="all">All types</option>
            {ADMIN_EQUIPMENT_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Approval</label>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value as typeof approvalFilter)}
            className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <GenericDataTable<AdminEquipmentRow>
        endpoint={LIST_ENDPOINT}
        columns={columns}
        title="Equipment"
        searchable
        extraParams={extraParams}
        selectionResetKey={selectionResetKey}
        selectable
        bulkActions={(selectedIds, clearSelection) => (
          <>
            <span className="text-sm text-stone-700 dark:text-stone-300">
              {selectedIds.length} selected
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkWorking}
              onClick={() => void runBulkPatch(selectedIds, { adminApproved: true }, clearSelection)}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkWorking}
              onClick={() => void runBulkPatch(selectedIds, { adminApproved: false }, clearSelection)}
            >
              Unapprove
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkWorking}
              onClick={() => void runBulkPatch(selectedIds, { isGlobal: true }, clearSelection)}
            >
              Make global
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkWorking}
              onClick={() => void runBulkPatch(selectedIds, { isGlobal: false }, clearSelection)}
            >
              Make private
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={bulkWorking} onClick={clearSelection}>
              Clear selection
            </Button>
          </>
        )}
        rowHref={rowHref}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              + New Equipment
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAiOpen(true)}>
              Search (AI)
            </Button>
          </div>
        }
        rowActions={(row) => (
          <div className="flex flex-wrap justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void patchRow(row.id, { adminApproved: !row.adminApproved });
              }}
              className="rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            >
              {row.adminApproved ? "Unapprove" : "Approve"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void patchRow(row.id, { isGlobal: !row.isGlobal });
              }}
              className="rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            >
              {row.isGlobal ? "Make private" : "Make global"}
            </button>
          </div>
        )}
      />

      <AdminNewEquipmentModal open={createOpen} onClose={() => setCreateOpen(false)} listEndpoint={LIST_ENDPOINT} />

      <AdminEquipmentAiSearchModal open={aiOpen} onClose={() => setAiOpen(false)} listEndpoint={LIST_ENDPOINT} />
    </>
  );
}

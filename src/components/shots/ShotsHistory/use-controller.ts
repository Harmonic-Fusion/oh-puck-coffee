"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  useDeleteShot,
  useToggleReference,
  useToggleHidden,
  useCreateShareLink,
  type ShotWithJoins,
} from "@/components/shots/hooks";
import { useToast } from "@/components/common/Toast";
import { AppRoutes, resolvePath } from "@/app/routes";
import { buildShareText } from "@/lib/share-text";
import { exportToCsv, type CSVColumn } from "@/lib/export-csv";
import { buildAiExportPrompt } from "@/lib/export-ai-prompt";
import { useTempUnit } from "@/lib/use-temp-unit";
import {
  useShotsTable,
  buildShotFilterDescriptors,
  withUserFilterDescriptorPlacement,
} from "./table-state";

function buildShotCsvColumns(options?: {
  includeBean?: boolean;
}): CSVColumn<ShotWithJoins>[] {
  const cols: CSVColumn<ShotWithJoins>[] = [
    { id: "date", header: "Date", accessorFn: (r) => new Date(r.createdAt).toLocaleString() },
  ];
  if (options?.includeBean !== false) {
    cols.push({ id: "bean", header: "Bean", accessorFn: (r) => r.beanName ?? "" });
  }
  cols.push(
    { id: "dose", header: "Dose (g)", accessorFn: (r) => r.doseGrams ?? "" },
    { id: "yield", header: "Yield (g)", accessorFn: (r) => r.yieldGrams ?? "" },
    { id: "ratio", header: "Ratio", accessorFn: (r) => (r.brewRatio != null ? `1:${r.brewRatio}` : "") },
    { id: "time", header: "Time (s)", accessorFn: (r) => r.brewTimeSecs ?? "" },
    { id: "grind", header: "Grind", accessorFn: (r) => r.grindLevel ?? "" },
    { id: "grinder", header: "Grinder", accessorFn: (r) => r.grinderName ?? "" },
    { id: "machine", header: "Machine", accessorFn: (r) => r.machineName ?? "" },
    { id: "quality", header: "Quality", accessorFn: (r) => r.shotQuality ?? "" },
    { id: "rating", header: "Rating", accessorFn: (r) => r.rating ?? "" },
    { id: "ref", header: "Reference", accessorFn: (r) => (r.isReferenceShot ? "Yes" : "No") },
    { id: "user", header: "User", accessorFn: (r) => r.userName ?? "" },
  );
  return cols;
}

export interface ShotsHistoryControllerOptions {
  data: ShotWithJoins[];
  /** Per-shot authorization — defaults to `() => true` (all mutable). */
  canMutateShot?: (shot: ShotWithJoins) => boolean;
  includeBeanColumn?: boolean;
  includeEquipmentColumns?: boolean;
  /** Adds Hidden column + True filter in the filter bar (e.g. bean page). */
  includeHiddenColumn?: boolean;
  /** Initial table column filters (e.g. `[{ id: "hidden", value: "false" }]`). */
  initialColumnFilters?: ColumnFiltersState;
  csvFilenamePrefix?: string;
  /** Marks the current user in the User filter as `Name (you)`. */
  currentUserId?: string;
}

export function useShotsHistoryController({
  data,
  canMutateShot: canMutateShotProp,
  includeBeanColumn = true,
  includeEquipmentColumns = true,
  includeHiddenColumn = false,
  initialColumnFilters,
  csvFilenamePrefix = "coffee-shots",
  currentUserId,
}: ShotsHistoryControllerOptions) {
  const router = useRouter();
  const deleteShot = useDeleteShot();
  const toggleReference = useToggleReference();
  const toggleHidden = useToggleHidden();
  const createShareLink = useCreateShareLink();
  const { showToast } = useToast();
  const [tempUnit] = useTempUnit();

  const canMutate = canMutateShotProp ?? alwaysTrue;

  // ── Table state ──────────────────────────────────────────────────

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    () => initialColumnFilters ?? [],
  );
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useShotsTable({
    data,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    includeBeanColumn,
    includeEquipmentColumns,
    includeHiddenColumn,
  });

  const filteredRows = table.getFilteredRowModel().rows;

  const filteredShots = useMemo(
    () => filteredRows.map((row) => row.original),
    [filteredRows],
  );

  const shotFilterDescriptors = useMemo(
    () =>
      withUserFilterDescriptorPlacement(
        buildShotFilterDescriptors(data, {
          includeBeanColumn,
          includeEquipmentColumns,
          includeHiddenColumn,
          currentUserId,
        }),
        data,
      ),
    [
      data,
      includeBeanColumn,
      includeEquipmentColumns,
      includeHiddenColumn,
      currentUserId,
    ],
  );

  // ── Selection ────────────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const isSelecting = selectedIds.size > 0;

  // ── Shot detail ──────────────────────────────────────────────────

  const [selectedShot, setSelectedShot] = useState<ShotWithJoins | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);

  const selectedShotIndex = selectedShot
    ? filteredShots.findIndex((s) => s.id === selectedShot.id)
    : undefined;

  // ── Row action handlers ──────────────────────────────────────────

  const handleRowOpen = useCallback((shot: ShotWithJoins) => {
    setSelectedShot(shot);
  }, []);

  const handleToggleReference = useCallback(
    (id: string) => {
      const shot = data.find((s) => s.id === id);
      if (!shot || !canMutate(shot)) return;
      toggleReference.mutate(id, {
        onSuccess: (updatedShot) => {
          setSelectedShot((prev) =>
            prev?.id === id
              ? { ...prev, isReferenceShot: updatedShot.isReferenceShot }
              : prev,
          );
        },
      });
    },
    [toggleReference, canMutate, data],
  );

  const handleToggleHidden = useCallback(
    (id: string) => {
      const shot = data.find((s) => s.id === id);
      if (!shot || !canMutate(shot)) return;
      toggleHidden.mutate(id, {
        onSuccess: (updatedShot) => {
          setSelectedShot((prev) =>
            prev?.id === id
              ? { ...prev, isHidden: updatedShot.isHidden }
              : prev,
          );
        },
      });
    },
    [toggleHidden, canMutate, data],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const shot = data.find((s) => s.id === id);
      if (!shot || !canMutate(shot)) return;
      deleteShot.mutate(id);
      setSelectedShot((prev) => (prev?.id === id ? null : prev));
    },
    [deleteShot, canMutate, data],
  );

  const handleEdit = useCallback(
    (shot: ShotWithJoins) => {
      if (!canMutate(shot)) return;
      setSelectedShot(shot);
      setOpenInEditMode(true);
    },
    [canMutate],
  );

  const handleDuplicate = useCallback(
    (shot: ShotWithJoins) => {
      if (!canMutate(shot)) return;
      const params = new URLSearchParams();
      if (shot.beanId) params.set("beanId", shot.beanId);
      if (shot.grinderId) params.set("grinderId", shot.grinderId);
      if (shot.machineId) params.set("machineId", shot.machineId);
      if (shot.doseGrams) params.set("doseGrams", shot.doseGrams);
      if (shot.yieldGrams) params.set("yieldGrams", shot.yieldGrams);
      if (shot.grindLevel) params.set("grindLevel", shot.grindLevel);
      if (shot.brewTempC) params.set("brewTempC", shot.brewTempC);
      if (shot.preInfusionDuration)
        params.set("preInfusionDuration", shot.preInfusionDuration);
      if (shot.preInfusionWaitDuration)
        params.set("preInfusionWaitDuration", shot.preInfusionWaitDuration);
      if (shot.brewPressure) params.set("brewPressure", shot.brewPressure);
      if (shot.toolsUsed && shot.toolsUsed.length > 0) {
        params.set("toolsUsed", shot.toolsUsed.join(","));
      }
      router.push(`${AppRoutes.log.path}?${params.toString()}`);
    },
    [router, canMutate],
  );

  const handleShare = useCallback(
    async (shot: ShotWithJoins) => {
      try {
        createShareLink.mutate(shot.id, {
          onSuccess: async (shareData) => {
            const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${resolvePath(AppRoutes.share.uid, { uid: shareData.id })}`;
            const shareText = buildShareText(
              {
                beanName: shot.beanName,
                beanRoastLevel: shot.beanRoastLevel,
                beanOrigin: null,
                beanRoaster: null,
                beanRoastDate: shot.beanRoastDate
                  ? new Date(shot.beanRoastDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : null,
                beanProcessingMethod: null,
                shotQuality: shot.shotQuality,
                rating: shot.rating,
                bitter: shot.bitter,
                sour: shot.sour,
                doseGrams: parseFloat(shot.doseGrams),
                yieldGrams: parseFloat(shot.yieldGrams),
                yieldActualGrams: shot.yieldActualGrams
                  ? parseFloat(shot.yieldActualGrams)
                  : null,
                brewTimeSecs: shot.brewTimeSecs
                  ? parseFloat(shot.brewTimeSecs)
                  : null,
                grindLevel: shot.grindLevel
                  ? parseFloat(shot.grindLevel)
                  : null,
                brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : null,
                brewPressure: shot.brewPressure
                  ? parseFloat(shot.brewPressure)
                  : null,
                grinderName: shot.grinderName,
                machineName: shot.machineName,
                flavors: shot.flavors,
                bodyTexture: shot.bodyTexture,
                adjectives: shot.adjectives,
                notes: shot.notes,
                url: shareUrl,
              },
              tempUnit,
            );

            const payload = { title: "Journey before Destination!", text: shareText, url: shareUrl };
            if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
              try {
                if (navigator.canShare(payload)) {
                  await navigator.share(payload);
                  return;
                }
              } catch (err) {
                if (err instanceof Error && err.name !== "AbortError") {
                  console.error("Error sharing:", err);
                }
              }
            }
            await navigator.clipboard.writeText(shareText);
            showToast("success", "Share link copied to clipboard");
          },
          onError: () => {
            showToast("error", "Failed to create share link");
          },
        });
      } catch (error) {
        console.error("Share error:", error);
        showToast("error", "Failed to share shot");
      }
    },
    [createShareLink, showToast, tempUnit],
  );

  // ── Selection handlers ───────────────────────────────────────────

  const handleToggleSelect = useCallback(
    (shot: ShotWithJoins) => {
      if (!canMutate(shot)) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(shot.id)) next.delete(shot.id);
        else next.add(shot.id);
        return next;
      });
    },
    [canMutate],
  );

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Bulk action handlers ─────────────────────────────────────────

  const handleRequestBulkDelete = useCallback(() => {
    setBulkDeleteIds(Array.from(selectedIds));
  }, [selectedIds]);

  const handleBulkReference = useCallback(() => {
    for (const id of selectedIds) {
      const shot = data.find((s) => s.id === id);
      if (shot && canMutate(shot)) toggleReference.mutate(id);
    }
  }, [selectedIds, data, canMutate, toggleReference]);

  const handleBulkHide = useCallback(() => {
    const sel = data.filter((s) => selectedIds.has(s.id) && canMutate(s));
    const anyVisible = sel.some((s) => !s.isHidden);
    for (const s of sel) {
      if (s.isHidden !== anyVisible) toggleHidden.mutate(s.id);
    }
  }, [data, selectedIds, canMutate, toggleHidden]);

  const handleBulkDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setBulkDeleteIds(null);
  }, []);

  const handleBulkDeleteConfirm = useCallback(() => {
    if (!bulkDeleteIds?.length) return;
    for (const id of bulkDeleteIds) {
      const shot = data.find((s) => s.id === id);
      if (shot && canMutate(shot)) deleteShot.mutate(id);
    }
    setSelectedIds(new Set());
    showToast(
      "success",
      bulkDeleteIds.length === 1
        ? "Shot deleted."
        : `Deleted ${bulkDeleteIds.length} shots.`,
    );
    setBulkDeleteIds(null);
  }, [bulkDeleteIds, data, canMutate, deleteShot, showToast]);

  const bulkDeleteDescription = bulkDeleteIds?.length
    ? bulkDeleteIds.length === 1
      ? "Delete this shot? This cannot be undone."
      : `Delete ${bulkDeleteIds.length} shots? This cannot be undone.`
    : "";

  // ── Shot detail handlers ─────────────────────────────────────────

  const handleDetailClose = useCallback(() => {
    setSelectedShot(null);
    setOpenInEditMode(false);
  }, []);

  const handleDetailShotChange = useCallback((shot: ShotWithJoins) => {
    setSelectedShot(shot);
    setOpenInEditMode(false);
  }, []);

  // ── Export ───────────────────────────────────────────────────────

  const csvColumns = useMemo(
    () => buildShotCsvColumns({ includeBean: includeBeanColumn }),
    [includeBeanColumn],
  );

  const handleExport = useCallback(() => {
    const rows = table.getFilteredRowModel().rows.map((r) => r.original);
    const filename = `${csvFilenamePrefix}-${new Date().toISOString().split("T")[0]}.csv`;
    exportToCsv(filename, rows, csvColumns);
  }, [table, csvFilenamePrefix, csvColumns]);

  const handleCopyForAi = useCallback(async () => {
    const rows = table.getFilteredRowModel().rows.map((r) => r.original);
    try {
      await navigator.clipboard.writeText(buildAiExportPrompt(rows));
      showToast("success", "Copied to clipboard. Paste into your AI assistant.");
    } catch {
      showToast("error", "Failed to copy to clipboard.");
    }
  }, [table, showToast]);

  // ── Return ───────────────────────────────────────────────────────

  return {
    table,
    filteredShots,
    filteredRowCount: filteredRows.length,
    shotFilterDescriptors,
    globalFilter,
    setGlobalFilter,
    tempUnit,

    selectedIds,
    isSelecting,
    canMutateShot: canMutateShotProp,

    selectedShot,
    openInEditMode,
    selectedShotIndex,

    handleRowOpen,
    handleToggleSelect,
    handleToggleReference,
    handleToggleHidden,
    handleDuplicate,
    handleEdit,
    handleShare,

    handleDeselectAll,
    handleRequestBulkDelete,
    handleBulkReference,
    handleBulkHide,

    bulkDeleteOpen: bulkDeleteIds !== null,
    bulkDeleteDescription,
    handleBulkDeleteOpenChange,
    handleBulkDeleteConfirm,

    handleDetailClose,
    handleDelete,
    handleDetailShotChange,

    handleExport,
    handleCopyForAi,
  };
}

export type ShotsHistoryController = ReturnType<typeof useShotsHistoryController>;

function alwaysTrue() {
  return true;
}

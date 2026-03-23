"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SortingState, ColumnFiltersState } from "@tanstack/react-table";
import {
  useBeansList,
  useBeans,
  useCreateBean,
  usePublicBeansSearch,
  useAddBeanToCollection,
  type BeanWithCounts,
} from "@/components/beans/hooks";
import { BeanFormModal } from "@/components/beans/BeanSelector";
import { BeanShareInvitesBanner } from "@/components/beans/BeanShareInvitesBanner";
import { ROAST_LEVELS, PROCESSING_METHODS } from "@/shared/beans/constants";
import { AppRoutes, resolvePath } from "@/app/routes";
import { exportToCsv, type CSVColumn } from "@/lib/export-csv";
import { useBeansTable } from "./_components/useBeansTable";
import { BeansPageSkeleton } from "./_components/BeansPageSkeleton";
import { BeansEmptyState } from "./_components/BeansEmptyState";
import { BeansListToolbar } from "./_components/BeansListToolbar";
import { BeansDesktopTable } from "./_components/BeansDesktopTable";
import { BeansMobileCards } from "./_components/BeansMobileCards";
import { BeansFindMoreSection } from "./_components/BeansFindMoreSection";

export default function BeansPage() {
  const router = useRouter();
  const { data: beans, isLoading } = useBeansList();
  const { data: beansForSuggestions } = useBeans();
  const createBean = useCreateBean();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "lastShotAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newRoaster, setNewRoaster] = useState("");
  const [newProcessing, setNewProcessing] = useState("");
  const [newRoast, setNewRoast] = useState<string>(ROAST_LEVELS[2]);
  const [newRoastDate, setNewRoastDate] = useState("");
  const [newOpenBagDate, setNewOpenBagDate] = useState("");
  const [newOriginDetails, setNewOriginDetails] = useState("");
  const [newIsRoastDateBestGuess, setNewIsRoastDateBestGuess] = useState(false);

  const [publicSearchQuery, setPublicSearchQuery] = useState("");
  const addToCollection = useAddBeanToCollection();

  const { data: publicBeans = [], isLoading: publicBeansLoading } =
    usePublicBeansSearch(publicSearchQuery.trim() || undefined, 15);

  const originSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          (beansForSuggestions ?? [])
            .map((b) => b.origin)
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [beansForSuggestions],
  );
  const roasterSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          (beansForSuggestions ?? [])
            .map((b) => b.roaster)
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [beansForSuggestions],
  );

  const resetCreateForm = useCallback(() => {
    setNewName("");
    setNewOrigin("");
    setNewRoaster("");
    setNewProcessing("");
    setNewRoast(ROAST_LEVELS[2]);
    setNewRoastDate("");
    setNewOpenBagDate("");
    setNewOriginDetails("");
    setNewIsRoastDateBestGuess(false);
  }, []);

  const handleCreateBean = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await createBean.mutateAsync({
        name: newName.trim(),
        origin: newOrigin.trim() || undefined,
        roaster: newRoaster.trim() || undefined,
        originDetails: newOriginDetails.trim() || undefined,
        processingMethod: newProcessing
          ? (newProcessing as (typeof PROCESSING_METHODS)[number])
          : undefined,
        roastLevel: newRoast as (typeof ROAST_LEVELS)[number],
        roastDate: newRoastDate ? new Date(newRoastDate) : undefined,
        openBagDate: newOpenBagDate ? new Date(newOpenBagDate) : undefined,
        isRoastDateBestGuess: newIsRoastDateBestGuess,
      });
      setShowCreate(false);
      resetCreateForm();
    } catch {
      // Error handled by mutation
    }
  }, [
    newName,
    newOrigin,
    newRoaster,
    newOriginDetails,
    newProcessing,
    newRoast,
    newRoastDate,
    newOpenBagDate,
    newIsRoastDateBestGuess,
    createBean,
    resetCreateForm,
  ]);

  const handleCancelCreate = useCallback(() => {
    setShowCreate(false);
    resetCreateForm();
  }, [resetCreateForm]);

  const data = useMemo(() => beans ?? [], [beans]);

  const table = useBeansTable({
    data,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const sortedRows = table.getSortedRowModel().rows;
  const pageRows = table.getRowModel().rows;

  const roasterOptions = useMemo(
    () =>
      Array.from(new Set((beans ?? []).map((b) => b.roaster).filter(Boolean) as string[]))
        .sort()
        .map((v) => ({ label: v, value: v })),
    [beans],
  );
  const originOptions = useMemo(
    () =>
      Array.from(new Set((beans ?? []).map((b) => b.origin).filter(Boolean) as string[]))
        .sort()
        .map((v) => ({ label: v, value: v })),
    [beans],
  );
  const roastLevelOptions = useMemo(
    () => ROAST_LEVELS.map((v) => ({ label: v, value: v })),
    [],
  );
  const processingOptions = useMemo(
    () => PROCESSING_METHODS.map((v) => ({ label: v, value: v })),
    [],
  );

  const handleBeanClick = useCallback(
    (bean: BeanWithCounts) => {
      router.push(resolvePath(AppRoutes.beans.beanId, { id: bean.id }));
    },
    [router],
  );

  const handleBeanEdit = useCallback(
    (bean: BeanWithCounts) => {
      router.push(
        `${resolvePath(AppRoutes.beans.beanId, { id: bean.id })}?edit=true`,
      );
    },
    [router],
  );

  const handleBeanBrew = useCallback(
    (bean: BeanWithCounts) => {
      router.push(`${AppRoutes.log.path}?beanId=${encodeURIComponent(bean.id)}`);
    },
    [router],
  );

  const handleToggleBeanSelect = useCallback((bean: BeanWithCounts) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bean.id)) {
        next.delete(bean.id);
      } else {
        next.add(bean.id);
      }
      return next;
    });
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredRows.length && filteredRows.length > 0) {
        return new Set();
      }
      return new Set(filteredRows.map((r) => r.id));
    });
  }, [filteredRows]);

  const handleCompare = useCallback(() => {
    const ids = Array.from(selectedIds).join(",");
    router.push(`${AppRoutes.beans.compare.path}?ids=${ids}`);
  }, [router, selectedIds]);

  const handleExport = useCallback(() => {
    const rows = table
      .getSortedRowModel()
      .rows.map((row) => row.original);

    const columns: CSVColumn<BeanWithCounts>[] = [
      { id: "name", header: "Name", accessorFn: (row) => row.name },
      { id: "roaster", header: "Roaster", accessorFn: (row) => row.roaster ?? "" },
      { id: "origin", header: "Origin", accessorFn: (row) => row.origin ?? "" },
      { id: "roastLevel", header: "Roast Level", accessorFn: (row) => row.roastLevel },
      {
        id: "processingMethod",
        header: "Processing Method",
        accessorFn: (row) => row.processingMethod ?? "",
      },
      {
        id: "roastDate",
        header: "Roast Date",
        accessorFn: (row) =>
          row.roastDate ? new Date(row.roastDate).toLocaleDateString() : "",
      },
      {
        id: "shotCount",
        header: "Shot Count",
        accessorFn: (row) => row.shotCount,
      },
      {
        id: "avgRating",
        header: "Avg Rating",
        accessorFn: (row) => (row.avgRating != null ? row.avgRating.toFixed(1) : ""),
      },
      {
        id: "bestRating",
        header: "Best Rating",
        accessorFn: (row) => (row.bestRating != null ? row.bestRating.toFixed(1) : ""),
      },
      {
        id: "lastShotAt",
        header: "Last Shot",
        accessorFn: (row) =>
          row.lastShotAt ? new Date(row.lastShotAt).toLocaleDateString() : "",
      },
    ];

    const filename = `coffee-beans-${new Date().toISOString().split("T")[0]}.csv`;
    exportToCsv(filename, rows, columns);
  }, [table]);

  const createBeanModal = (
    <BeanFormModal
      open={showCreate}
      onClose={handleCancelCreate}
      title="New Bean"
      submitLabel={createBean.isPending ? "Creating..." : "Create"}
      onSubmit={handleCreateBean}
      isSubmitting={createBean.isPending}
      name={newName}
      onNameChange={setNewName}
      origin={newOrigin}
      onOriginChange={setNewOrigin}
      originSuggestions={originSuggestions}
      originDetails={newOriginDetails}
      onOriginDetailsChange={setNewOriginDetails}
      roaster={newRoaster}
      onRoasterChange={setNewRoaster}
      roasterSuggestions={roasterSuggestions}
      processing={newProcessing}
      onProcessingChange={setNewProcessing}
      roast={newRoast}
      onRoastChange={setNewRoast}
      roastDate={newRoastDate}
      onRoastDateChange={setNewRoastDate}
      openBagDate={newOpenBagDate}
      onOpenBagDateChange={setNewOpenBagDate}
      isRoastDateBestGuess={newIsRoastDateBestGuess}
      onIsRoastDateBestGuessChange={setNewIsRoastDateBestGuess}
    />
  );

  return (
    <div className="space-y-4">
      <BeanShareInvitesBanner />

      {isLoading ? (
        <BeansPageSkeleton />
      ) : data.length === 0 ? (
        <BeansEmptyState
          publicSearchQuery={publicSearchQuery}
          onPublicSearchQueryChange={setPublicSearchQuery}
          publicBeansLoading={publicBeansLoading}
          publicBeans={publicBeans}
          addToCollection={addToCollection}
          onOpenCreate={() => setShowCreate(true)}
          modal={createBeanModal}
        />
      ) : (
        <>
          <BeansListToolbar
            filteredRowCount={filteredRows.length}
            onExport={handleExport}
            onOpenCreate={() => setShowCreate(true)}
            isSelecting={isSelecting}
            selectedCount={selectedIds.size}
            onCompare={handleCompare}
            onDeselectAll={handleDeselectAll}
            canCompare={selectedIds.size >= 2}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            table={table}
            filterDescriptors={[
              { columnId: "roaster", options: roasterOptions },
              { columnId: "origin", options: originOptions },
              { columnId: "roastLevel", options: roastLevelOptions },
              { columnId: "processingMethod", options: processingOptions },
              { columnId: "createdAt" },
            ]}
          />

          <BeansDesktopTable
            table={table}
            rows={pageRows}
            filteredCount={filteredRows.length}
            selectedIds={selectedIds}
            onToggleSelectAll={handleToggleSelectAllFiltered}
            onBeanClick={handleBeanClick}
            onToggleBeanSelect={handleToggleBeanSelect}
          />

          <BeansMobileCards
            rows={sortedRows}
            onBeanClick={handleBeanClick}
            onBeanEdit={handleBeanEdit}
            onBeanView={handleBeanClick}
            onBeanBrew={handleBeanBrew}
            onToggleBeanSelect={handleToggleBeanSelect}
            selectedIds={selectedIds}
            isSelecting={isSelecting}
          />

          <BeansFindMoreSection
            publicSearchQuery={publicSearchQuery}
            onPublicSearchQueryChange={setPublicSearchQuery}
            publicBeansLoading={publicBeansLoading}
            publicBeans={publicBeans}
            addToCollection={addToCollection}
          />

          {createBeanModal}
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import {
  EquipmentSpecsEditor,
  normalizeSpecsForPayload,
} from "@/components/admin/equipment/EquipmentSpecsEditor";
import { canEditEquipmentMetadata } from "@/lib/equipment-authorization";
import type { Grinder, Machine, Tool } from "@/shared/equipment/schema";
import {
  ADMIN_EQUIPMENT_TYPE_OPTIONS,
  USER_GEAR_EXTRA_TYPES,
  type EquipmentType,
  type UserGearExtraType,
  type UserGearType,
} from "@/shared/equipment/schema";
import {
  type GearCollectionEntry,
  buildAllGearCollectionEntries,
  filterGearEntriesByTypeAndSearch,
  foldExtraGearQueries,
} from "@/components/equipment/gear-collection-builders";
import {
  useGrinders,
  useGrindersBrowse,
  useAddGrinderToCollection,
  useRemoveGrinderFromCollection,
  useMachines,
  useMachinesBrowse,
  useAddMachineToCollection,
  useRemoveMachineFromCollection,
  useExtraGearList,
  useExtraGearBrowse,
  useAddExtraGearToCollection,
  useRemoveExtraGearFromCollection,
  useTools,
  useToolsBrowse,
  useAddToolToCollection,
  useRemoveToolFromCollection,
  useUploadEquipmentImage,
} from "./hooks";
import { ActionButtonBar, type ActionButtonConfig } from "@/components/shots/ActionButtonBar";
import { resizeImageFileToJpegBlob } from "@/lib/image-resize";
import { EquipmentPhotoDisplay, equipmentThumbSrc } from "./EquipmentPhotoBlock";
import { BrowseCatalogRow } from "./BrowseCatalogRow";
import { GearMetadataEditDialog } from "./GearMetadataEditDialog";

type SelectorType = "all" | EquipmentType;

type BrowseGearEntry = GearCollectionEntry;

type BrowseRow = BrowseGearEntry | { kind: "tool"; item: Tool };

type AddMutationsBundle = {
  addGrinder: {
    isPending: boolean;
    variables: unknown;
  };
  addMachine: {
    isPending: boolean;
    variables: unknown;
  };
  addTool: {
    isPending: boolean;
    variables: unknown;
  };
  addExtra: {
    isPending: boolean;
    variables: unknown;
  };
};

function typeLabel(kind: EquipmentType | UserGearType): string {
  return (
    ADMIN_EQUIPMENT_TYPE_OPTIONS.find((o) => o.value === kind)?.label ?? kind
  );
}

function browseCatalogSubtitle(item: { brand: string | null; isGlobal: boolean }): string {
  const origin = item.isGlobal ? "Catalog" : "Yours";
  const b = item.brand?.trim();
  return b ? `${b} · ${origin}` : origin;
}

function extraGearIdsInCollection(
  extraMineByType: Record<UserGearExtraType, Grinder[]>,
): Set<string> {
  const s = new Set<string>();
  for (const t of USER_GEAR_EXTRA_TYPES) {
    for (const row of extraMineByType[t]) {
      s.add(row.id);
    }
  }
  return s;
}

function filterCollectionTools(
  myTools: Tool[] | undefined,
  selectedType: SelectorType,
): Tool[] {
  const list = myTools ?? [];
  if (selectedType === "all" || selectedType === "tool") return list;
  return [];
}

function effectiveCreateKindFromSelector(
  selectedType: SelectorType,
  createKind: UserGearType,
): UserGearType {
  if (selectedType === "all") return createKind;
  if (selectedType === "tool") return "grinder";
  return selectedType;
}

function buildCatalogBrowseRows(args: {
  nameFilter: string;
  selectedType: SelectorType;
  browseTools: Tool[] | undefined;
  browseGrinders: Grinder[] | undefined;
  browseMachines: Machine[] | undefined;
  extraBrowseByType: Record<UserGearExtraType, Grinder[]>;
  myToolIds: Set<string>;
  myGrinderIds: Set<string>;
  myMachineIds: Set<string>;
  extraMyIds: Set<string>;
}): BrowseRow[] {
  const {
    nameFilter,
    selectedType,
    browseTools,
    browseGrinders,
    browseMachines,
    extraBrowseByType,
    myToolIds,
    myGrinderIds,
    myMachineIds,
    extraMyIds,
  } = args;
  const q = nameFilter.trim().toLowerCase();

  const toolRows: BrowseRow[] = (browseTools ?? [])
    .filter((t) => !myToolIds.has(t.id))
    .filter(
      (t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q),
    )
    .map((item) => ({ kind: "tool" as const, item }));

  const g = (browseGrinders ?? [])
    .filter((row) => !myGrinderIds.has(row.id))
    .filter((row) => !q || row.name.toLowerCase().includes(q))
    .map((item) => ({ kind: "grinder" as const, item }));
  const m = (browseMachines ?? [])
    .filter((row) => !myMachineIds.has(row.id))
    .filter((row) => !q || row.name.toLowerCase().includes(q))
    .map((item) => ({ kind: "machine" as const, item }));
  const extra: BrowseGearEntry[] = [];
  for (const t of USER_GEAR_EXTRA_TYPES) {
    for (const row of extraBrowseByType[t]) {
      if (extraMyIds.has(row.id)) continue;
      if (q && !row.name.toLowerCase().includes(q)) continue;
      extra.push({ kind: t, item: row });
    }
  }
  let gearRows: BrowseGearEntry[] = [...g, ...m, ...extra];

  if (selectedType === "grinder") gearRows = gearRows.filter((r) => r.kind === "grinder");
  if (selectedType === "machine") gearRows = gearRows.filter((r) => r.kind === "machine");
  if (USER_GEAR_EXTRA_TYPES.includes(selectedType as UserGearExtraType)) {
    gearRows = gearRows.filter((r) => r.kind === selectedType);
  }

  const merged: BrowseRow[] =
    selectedType === "tool"
      ? toolRows
      : selectedType === "all"
        ? [...gearRows, ...toolRows]
        : gearRows;

  return [...merged].sort((a, b) => a.item.name.localeCompare(b.item.name));
}

function mutationErrorLine(isError: boolean, error: unknown, fallback: string): string | undefined {
  if (!isError) return undefined;
  return error instanceof Error ? error.message : fallback;
}

function pendingAddErrorForKind(
  kind: UserGearType,
  addGrinder: { isError: boolean; error: unknown },
  addMachine: { isError: boolean; error: unknown },
  addExtra: { isError: boolean; error: unknown },
): string | undefined {
  if (kind === "grinder") {
    return mutationErrorLine(addGrinder.isError, addGrinder.error, "Could not add grinder");
  }
  if (kind === "machine") {
    return mutationErrorLine(addMachine.isError, addMachine.error, "Could not add machine");
  }
  return mutationErrorLine(addExtra.isError, addExtra.error, "Could not add equipment");
}

function catalogRowIsAdding(row: BrowseRow, m: AddMutationsBundle): boolean {
  if (row.kind === "grinder") {
    const v = m.addGrinder.variables;
    return (
      m.addGrinder.isPending &&
      v != null &&
      typeof v === "object" &&
      "grinderId" in v &&
      (v as { grinderId: string }).grinderId === row.item.id
    );
  }
  if (row.kind === "machine") {
    const v = m.addMachine.variables;
    return (
      m.addMachine.isPending &&
      v != null &&
      typeof v === "object" &&
      "machineId" in v &&
      (v as { machineId: string }).machineId === row.item.id
    );
  }
  if (row.kind === "tool") {
    return m.addTool.isPending && m.addTool.variables === row.item.id;
  }
  const v = m.addExtra.variables;
  return (
    m.addExtra.isPending &&
    v != null &&
    typeof v === "object" &&
    "equipmentId" in v &&
    (v as { equipmentId: string }).equipmentId === row.item.id
  );
}

function buildEmptyCatalogLabel(nameFilterTrimmed: boolean, selectedType: SelectorType): string {
  if (nameFilterTrimmed) return "No matches.";
  if (selectedType === "all") return "Everything visible is already in your collection.";
  if (selectedType === "tool") return "All visible tools are already in your collection.";
  if (selectedType === "grinder") return "Every visible grinder is already in your collection.";
  if (selectedType === "machine") return "Every visible machine is already in your collection.";
  return `Every visible ${typeLabel(selectedType).toLowerCase()} is already in your collection.`;
}

function buildEmptyCollectionMessage(selectedType: SelectorType): string {
  if (selectedType === "all") return "Nothing in your collection yet.";
  if (selectedType === "tool") return "No tools in your collection yet.";
  return `No ${typeLabel(selectedType).toLowerCase()} in your collection yet.`;
}

export function EquipmentSection() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  const { data: myGrinders, isLoading: myGrindersLoading } = useGrinders();
  const { data: myMachines, isLoading: myMachinesLoading } = useMachines();
  const myKettles = useExtraGearList("kettle");
  const myScales = useExtraGearList("scale");
  const myPourOver = useExtraGearList("pour_over");
  const myFrenchPress = useExtraGearList("french_press");
  const myMokaPot = useExtraGearList("moka_pot");
  const myColdBrew = useExtraGearList("cold_brew");

  const { data: browseGrinders, isLoading: browseGrindersLoading } = useGrindersBrowse();
  const { data: browseMachines, isLoading: browseMachinesLoading } = useMachinesBrowse();
  const browseKettles = useExtraGearBrowse("kettle");
  const browseScales = useExtraGearBrowse("scale");
  const browsePourOver = useExtraGearBrowse("pour_over");
  const browseFrenchPress = useExtraGearBrowse("french_press");
  const browseMokaPot = useExtraGearBrowse("moka_pot");
  const browseColdBrew = useExtraGearBrowse("cold_brew");

  const { data: myTools, isLoading: myToolsLoading } = useTools();
  const { data: browseTools, isLoading: browseToolsLoading } = useToolsBrowse();

  const addGrinder = useAddGrinderToCollection();
  const addMachine = useAddMachineToCollection();
  const addExtra = useAddExtraGearToCollection();
  const addTool = useAddToolToCollection();
  const removeGrinder = useRemoveGrinderFromCollection();
  const removeMachine = useRemoveMachineFromCollection();
  const removeExtra = useRemoveExtraGearFromCollection();
  const removeTool = useRemoveToolFromCollection();

  const [collectionType, setCollectionType] = useState<SelectorType>("all");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [addEquipmentType, setAddEquipmentType] = useState<SelectorType>("all");
  const [nameFilter, setNameFilter] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createKind, setCreateKind] = useState<UserGearType>("grinder");
  const [newName, setNewName] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [createSpecs, setCreateSpecs] = useState<Record<string, unknown>>({});
  const [createPhotoId, setCreatePhotoId] = useState<string | null>(null);
  const [createPhotoThumb, setCreatePhotoThumb] = useState<string | null>(null);
  const [createPhotoError, setCreatePhotoError] = useState<string | undefined>();
  const [prevEffectiveCreateKind, setPrevEffectiveCreateKind] =
    useState(effectiveCreateKindFromSelector(addEquipmentType, createKind));
  const createPhotoFileRef = useRef<HTMLInputElement>(null);
  const uploadCreatePhoto = useUploadEquipmentImage();
  const [editingTarget, setEditingTarget] = useState<GearCollectionEntry | null>(null);

  function onAddEquipmentTypeChange(v: SelectorType) {
    setAddEquipmentType(v);
    if (v !== "all" && v !== "tool") {
      setCreateKind(v);
    }
  }

  const myGrinderIds = useMemo(
    () => new Set((myGrinders ?? []).map((g) => g.id)),
    [myGrinders],
  );
  const myMachineIds = useMemo(
    () => new Set((myMachines ?? []).map((m) => m.id)),
    [myMachines],
  );
  const myToolIds = useMemo(
    () => new Set((myTools ?? []).map((t) => t.id)),
    [myTools],
  );

  const { byType: extraMineByType, isLoading: extraMineLoading } = useMemo(
    () =>
      foldExtraGearQueries({
        kettle: myKettles,
        scale: myScales,
        pour_over: myPourOver,
        french_press: myFrenchPress,
        moka_pot: myMokaPot,
        cold_brew: myColdBrew,
      }),
    [
      myKettles,
      myScales,
      myPourOver,
      myFrenchPress,
      myMokaPot,
      myColdBrew,
    ],
  );

  const { byType: extraBrowseByType, isLoading: extraBrowseLoading } = useMemo(
    () =>
      foldExtraGearQueries({
        kettle: browseKettles,
        scale: browseScales,
        pour_over: browsePourOver,
        french_press: browseFrenchPress,
        moka_pot: browseMokaPot,
        cold_brew: browseColdBrew,
      }),
    [
      browseKettles,
      browseScales,
      browsePourOver,
      browseFrenchPress,
      browseMokaPot,
      browseColdBrew,
    ],
  );

  const extraMyIds = useMemo(
    () => extraGearIdsInCollection(extraMineByType),
    [extraMineByType],
  );

  const allGearCollectionEntries = useMemo(
    () => buildAllGearCollectionEntries(myGrinders, myMachines, extraMineByType),
    [myGrinders, myMachines, extraMineByType],
  );

  const collectionGearEntries = useMemo(
    () =>
      filterGearEntriesByTypeAndSearch(
        allGearCollectionEntries,
        collectionType,
        collectionSearch,
      ),
    [allGearCollectionEntries, collectionType, collectionSearch],
  );

  const collectionTools = useMemo(() => {
    let list = filterCollectionTools(myTools, collectionType);
    const q = collectionSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
      );
    }
    return list;
  }, [myTools, collectionType, collectionSearch]);

  const catalogBrowseRows = useMemo(
    () =>
      buildCatalogBrowseRows({
        nameFilter,
        selectedType: addEquipmentType,
        browseTools,
        browseGrinders,
        browseMachines,
        extraBrowseByType,
        myToolIds,
        myGrinderIds,
        myMachineIds,
        extraMyIds,
      }),
    [
      nameFilter,
      addEquipmentType,
      browseTools,
      browseGrinders,
      browseMachines,
      extraBrowseByType,
      myToolIds,
      myGrinderIds,
      myMachineIds,
      extraMyIds,
    ],
  );

  const isLoadingCollection =
    myGrindersLoading ||
    myMachinesLoading ||
    extraMineLoading ||
    myToolsLoading;

  const browseLoading =
    browseGrindersLoading ||
    browseMachinesLoading ||
    extraBrowseLoading ||
    browseToolsLoading;

  const effectiveCreateKind = effectiveCreateKindFromSelector(addEquipmentType, createKind);

  if (prevEffectiveCreateKind !== effectiveCreateKind) {
    setPrevEffectiveCreateKind(effectiveCreateKind);
    setCreateSpecs({});
    setCreatePhotoId(null);
    setCreatePhotoThumb(null);
    setCreatePhotoError(undefined);
  }

  async function submitNew() {
    const name = newName.trim();
    if (!name) return;
    const brandTrim = newBrand.trim();
    const specsPayload = normalizeSpecsForPayload(createSpecs);
    try {
      if (effectiveCreateKind === "grinder") {
        await addGrinder.mutateAsync({
          name,
          ...(brandTrim ? { brand: brandTrim } : {}),
          ...(specsPayload ? { specs: specsPayload } : {}),
          ...(createPhotoId ? { imageId: createPhotoId } : {}),
        });
      } else if (effectiveCreateKind === "machine") {
        await addMachine.mutateAsync({
          name,
          ...(brandTrim ? { brand: brandTrim } : {}),
          ...(specsPayload ? { specs: specsPayload } : {}),
          ...(createPhotoId ? { imageId: createPhotoId } : {}),
        });
      } else {
        await addExtra.mutateAsync({
          equipmentType: effectiveCreateKind,
          name,
          ...(brandTrim ? { brand: brandTrim } : {}),
          ...(specsPayload ? { specs: specsPayload } : {}),
        });
      }
      setNewName("");
      setNewBrand("");
      setCreateSpecs({});
      setCreatePhotoId(null);
      setCreatePhotoThumb(null);
      setCreatePhotoError(undefined);
      setShowCreatePanel(false);
    } catch {
      // surfaced via mutation state
    }
  }

  async function onCreatePhotoFile(file: File) {
    setCreatePhotoError(undefined);
    try {
      const blob = await resizeImageFileToJpegBlob(file);
      const record = await uploadCreatePhoto.mutateAsync(blob);
      setCreatePhotoId(record.id);
      setCreatePhotoThumb(record.thumbnailBase64);
    } catch (e) {
      setCreatePhotoError(e instanceof Error ? e.message : "Could not upload photo");
    }
  }

  const showCreatePhotoPicker =
    effectiveCreateKind === "grinder" || effectiveCreateKind === "machine";

  const addPending = addGrinder.isPending || addMachine.isPending || addExtra.isPending;
  const addError = pendingAddErrorForKind(effectiveCreateKind, addGrinder, addMachine, addExtra);

  function removeGearEntry(kind: UserGearType, id: string) {
    if (kind === "grinder") removeGrinder.mutate(id);
    else if (kind === "machine") removeMachine.mutate(id);
    else removeExtra.mutate(id);
  }

  const removeGearPending =
    removeGrinder.isPending || removeMachine.isPending || removeExtra.isPending;

  const showKindInCatalog = addEquipmentType === "all";

  const emptyCatalogLabel = buildEmptyCatalogLabel(Boolean(nameFilter.trim()), addEquipmentType);
  const emptyCollectionMessage = collectionSearch.trim()
    ? "No gear matches your search."
    : buildEmptyCollectionMessage(collectionType);

  const hasCollectionItems =
    collectionGearEntries.length > 0 || collectionTools.length > 0;

  const addMutations: AddMutationsBundle = {
    addGrinder,
    addMachine,
    addTool,
    addExtra,
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <label
              htmlFor="eq-collection-type"
              className="shrink-0 text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Type
            </label>
            <select
              id="eq-collection-type"
              value={collectionType}
              onChange={(e) => setCollectionType(e.target.value as SelectorType)}
              className="h-10 w-full min-w-[12rem] rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 sm:max-w-xs"
            >
              <option value="all">All types</option>
              {ADMIN_EQUIPMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <label
              htmlFor="eq-collection-search"
              className="shrink-0 text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Search
            </label>
            <input
              id="eq-collection-search"
              type="search"
              value={collectionSearch}
              onChange={(e) => setCollectionSearch(e.target.value)}
              placeholder="Filter your gear by name…"
              className="h-10 w-full min-w-[12rem] rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 sm:max-w-md"
            />
          </div>
        </div>

        {isLoadingCollection ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : !hasCollectionItems ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">{emptyCollectionMessage}</p>
        ) : (
          <div className="space-y-8">
            {collectionGearEntries.length > 0 ? (
              <PhotoCardGrid
                entries={collectionGearEntries}
                userId={userId}
                role={role}
                onRemove={removeGearEntry}
                removePending={removeGearPending}
                onEditEntry={(entry) => setEditingTarget(entry)}
              />
            ) : null}
            {collectionTools.length > 0 ? (
              <ToolCollectionList
                tools={collectionTools}
                onRemove={(id) => removeTool.mutate(id)}
                removePending={removeTool.isPending}
              />
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 dark:border-stone-700 dark:bg-stone-900/20">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">Add equipment</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Search the catalog by name, pick a catalog type, or create something new. Tools can only
          be added from the catalog.
        </p>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <button
            type="button"
            onClick={() => setShowCreatePanel((open) => !open)}
            disabled={addEquipmentType === "tool"}
            title={addEquipmentType === "tool" ? "Add tools from the catalog below" : undefined}
            className={
              addEquipmentType === "tool"
                ? "h-10 cursor-not-allowed rounded-lg border border-stone-200 px-4 text-sm text-stone-400 dark:border-stone-700"
                : showCreatePanel
                  ? "h-10 shrink-0 rounded-lg bg-amber-800 px-4 text-sm font-medium text-white ring-2 ring-amber-600/80 ring-offset-2 dark:bg-amber-700 dark:ring-amber-500 dark:ring-offset-stone-900"
                  : "h-10 shrink-0 rounded-lg bg-amber-700 px-4 text-sm font-medium text-white shadow-sm hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            }
          >
            Create new
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor="eq-add-type" className="shrink-0 text-sm font-medium text-stone-700 dark:text-stone-300">
              Type
            </label>
            <select
              id="eq-add-type"
              value={addEquipmentType}
              onChange={(e) => onAddEquipmentTypeChange(e.target.value as SelectorType)}
              className="h-10 w-full min-w-[12rem] rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 sm:max-w-xs"
            >
              <option value="all">All types</option>
              {ADMIN_EQUIPMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor="eq-filter" className="shrink-0 text-sm font-medium text-stone-700 dark:text-stone-300">
              Filter
            </label>
            <input
              id="eq-filter"
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Filter catalog by name…"
              className="h-10 w-full min-w-[10rem] rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
            />
          </div>
        </div>

        {showCreatePanel && addEquipmentType !== "tool" ? (
          <CreateEquipmentPanel
            addEquipmentType={addEquipmentType}
            effectiveCreateKind={effectiveCreateKind}
            createKind={createKind}
            setCreateKind={setCreateKind}
            newName={newName}
            setNewName={setNewName}
            newBrand={newBrand}
            setNewBrand={setNewBrand}
            createSpecs={createSpecs}
            setCreateSpecs={setCreateSpecs}
            showCreatePhotoPicker={showCreatePhotoPicker}
            createPhotoFileRef={createPhotoFileRef}
            createPhotoThumb={createPhotoThumb}
            createPhotoId={createPhotoId}
            createPhotoError={createPhotoError}
            uploadCreatePhoto={uploadCreatePhoto}
            addPending={addPending}
            addError={addError}
            onSubmit={() => void submitNew()}
            onCreatePhotoFile={(file) => void onCreatePhotoFile(file)}
            onClearPhoto={() => {
              setCreatePhotoId(null);
              setCreatePhotoThumb(null);
              setCreatePhotoError(undefined);
            }}
          />
        ) : null}

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Catalog
        </h3>
        <div className="mt-2 max-h-[min(70vh,42rem)] space-y-2 overflow-y-auto rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900/40">
          {browseLoading ? (
            <p className="py-6 text-center text-sm text-stone-500">Loading…</p>
          ) : catalogBrowseRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">{emptyCatalogLabel}</p>
          ) : (
            catalogBrowseRows.map((row) => (
              <BrowseCatalogRow
                key={`${row.kind}-${row.item.id}`}
                type={row.kind}
                name={row.item.name}
                kindLabel={showKindInCatalog ? typeLabel(row.kind) : undefined}
                detail={browseCatalogSubtitle(row.item)}
                thumbnailSrc={equipmentThumbSrc(row.item)}
                onAdd={() => {
                  if (row.kind === "grinder") {
                    addGrinder.mutate({ grinderId: row.item.id });
                  } else if (row.kind === "machine") {
                    addMachine.mutate({ machineId: row.item.id });
                  } else if (row.kind === "tool") {
                    addTool.mutate(row.item.id);
                  } else {
                    addExtra.mutate({
                      equipmentType: row.kind,
                      equipmentId: row.item.id,
                    });
                  }
                }}
                adding={catalogRowIsAdding(row, addMutations)}
              />
            ))
          )}
        </div>
      </section>

      <GearMetadataEditDialog
        open={editingTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTarget(null);
        }}
        target={editingTarget}
      />
    </div>
  );
}

type CreateEquipmentPanelProps = {
  addEquipmentType: SelectorType;
  effectiveCreateKind: UserGearType;
  createKind: UserGearType;
  setCreateKind: (v: UserGearType) => void;
  newName: string;
  setNewName: (v: string) => void;
  newBrand: string;
  setNewBrand: (v: string) => void;
  createSpecs: Record<string, unknown>;
  setCreateSpecs: (v: Record<string, unknown>) => void;
  showCreatePhotoPicker: boolean;
  createPhotoFileRef: RefObject<HTMLInputElement | null>;
  createPhotoThumb: string | null;
  createPhotoId: string | null;
  createPhotoError: string | undefined;
  uploadCreatePhoto: ReturnType<typeof useUploadEquipmentImage>;
  addPending: boolean;
  addError: string | undefined;
  onSubmit: () => void;
  onCreatePhotoFile: (file: File) => void;
  onClearPhoto: () => void;
};

function CreateEquipmentPanel(props: CreateEquipmentPanelProps) {
  const {
    addEquipmentType,
    effectiveCreateKind,
    createKind,
    setCreateKind,
    newName,
    setNewName,
    newBrand,
    setNewBrand,
    createSpecs,
    setCreateSpecs,
    showCreatePhotoPicker,
    createPhotoFileRef,
    createPhotoThumb,
    createPhotoId,
    createPhotoError,
    uploadCreatePhoto,
    addPending,
    addError,
    onSubmit,
    onCreatePhotoFile,
    onClearPhoto,
  } = props;

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
        Create and add to your collection
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {addEquipmentType === "all" ? (
          <>
            <label htmlFor="eq-create-kind" className="sr-only">
              Equipment type
            </label>
            <select
              id="eq-create-kind"
              value={createKind}
              onChange={(e) => setCreateKind(e.target.value as UserGearType)}
              className="h-10 min-w-[11rem] rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            >
              {ADMIN_EQUIPMENT_TYPE_OPTIONS.filter((o) => o.value !== "tool").map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        ) : null}
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          className="min-w-[12rem] flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
        />
        <input
          type="text"
          value={newBrand}
          onChange={(e) => setNewBrand(e.target.value)}
          placeholder="Brand (optional)"
          className="min-w-[10rem] flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
        />
        <button
          type="button"
          disabled={addPending || !newName.trim()}
          onClick={onSubmit}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {addPending ? "…" : "Add to collection"}
        </button>
      </div>
      {showCreatePhotoPicker ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-stone-600 dark:text-stone-400">Photo (optional)</span>
          <input
            ref={createPhotoFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              ev.target.value = "";
              if (f) onCreatePhotoFile(f);
            }}
          />
          {createPhotoThumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- inline PNG preview from upload API
            <img
              src={`data:image/png;base64,${createPhotoThumb}`}
              alt=""
              className="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-stone-200 dark:ring-stone-600"
            />
          ) : null}
          <button
            type="button"
            disabled={uploadCreatePhoto.isPending || addPending}
            onClick={() => createPhotoFileRef.current?.click()}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
          >
            {uploadCreatePhoto.isPending ? "…" : createPhotoId ? "Change photo" : "Choose photo"}
          </button>
          {createPhotoId ? (
            <button
              type="button"
              disabled={uploadCreatePhoto.isPending || addPending}
              onClick={onClearPhoto}
              className="text-sm font-medium text-stone-600 underline hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Remove photo
            </button>
          ) : null}
          {createPhotoError ? (
            <span className="text-xs text-red-600">{createPhotoError}</span>
          ) : null}
        </div>
      ) : null}
      <details className="mt-3 rounded-lg border border-amber-200/80 bg-white/60 p-3 dark:border-amber-900/40 dark:bg-stone-900/30">
        <summary className="cursor-pointer text-sm font-medium text-stone-700 dark:text-stone-300">
          Technical specifications (optional)
        </summary>
        <div className="mt-3">
          <EquipmentSpecsEditor
            type={effectiveCreateKind as EquipmentType}
            value={createSpecs}
            onChange={setCreateSpecs}
          />
        </div>
      </details>
      {addError ? <p className="mt-2 text-xs text-red-600">{addError}</p> : null}
    </div>
  );
}

function ToolCollectionList({
  tools,
  onRemove,
  removePending,
}: {
  tools: Tool[];
  onRemove: (id: string) => void;
  removePending: boolean;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Tools
      </h3>
      <ul className="mt-2 divide-y divide-stone-200 rounded-xl border border-stone-200 dark:divide-stone-700 dark:border-stone-700">
        {tools.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm dark:bg-stone-900/40"
          >
            <span className="font-medium text-stone-800 dark:text-stone-200">{t.name}</span>
            <button
              type="button"
              disabled={removePending}
              onClick={() => onRemove(t.id)}
              className="text-xs font-medium text-red-700 hover:underline dark:text-red-400"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhotoCardGrid({
  entries,
  userId,
  role,
  onRemove,
  removePending,
  onEditEntry,
}: {
  entries: GearCollectionEntry[];
  userId: string | undefined;
  role: string | undefined;
  onRemove: (kind: UserGearType, id: string) => void;
  removePending: boolean;
  onEditEntry: (entry: GearCollectionEntry) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Brew gear
      </h3>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const { kind, item } = entry;
          const canEditMeta =
            Boolean(userId) &&
            canEditEquipmentMetadata({
              userId: userId!,
              role,
              equipmentCreatedBy: item.createdBy,
            });
          const actions: ActionButtonConfig[] = [];
          actions.push({
            key: "remove",
            icon: TrashIcon,
            onClick: () => {
              if (removePending) return;
              onRemove(kind, item.id);
            },
            title: "Remove from collection",
            variant: "danger",
            className: removePending ? "pointer-events-none opacity-50" : undefined,
          });
          if (canEditMeta) {
            actions.push({
              key: "edit",
              icon: PencilSquareIcon,
              onClick: () => onEditEntry(entry),
              title: "Edit gear details",
              variant: "active",
            });
          }
          return (
          <article
            key={`${kind}-${item.id}`}
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900"
          >
            <div className="shrink-0">
              <EquipmentPhotoDisplay item={item} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-400">
                  {typeLabel(kind)}
                </p>
                <h3 className="truncate font-medium text-stone-900 dark:text-stone-100">
                  {item.name}
                </h3>
                {item.brand?.trim() ? (
                  <p className="truncate text-xs text-stone-600 dark:text-stone-400">
                    {item.brand.trim()}
                  </p>
                ) : null}
                <p className="text-xs text-stone-500">
                  {item.isGlobal ? "Catalog" : "Yours"}
                </p>
              </div>
              <div
                className="mt-auto shrink-0 border-t border-stone-100 pt-2 dark:border-stone-800"
                onClick={(e) => e.stopPropagation()}
              >
                <ActionButtonBar actions={actions} />
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
}

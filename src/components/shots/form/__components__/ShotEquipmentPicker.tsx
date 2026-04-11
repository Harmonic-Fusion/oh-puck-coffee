"use client";

import { useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  ADMIN_EQUIPMENT_TYPE_OPTIONS,
  type EquipmentType,
} from "@/shared/equipment/schema";
import {
  buildAllGearCollectionEntries,
  filterGearEntriesByTypeAndSearch,
  foldExtraGearQueries,
  labelForGearEntryKind,
  type GearCollectionEntry,
} from "@/components/equipment/gear-collection-builders";
import {
  useGrinders,
  useMachines,
  useExtraGearList,
} from "@/components/equipment/hooks";

type FilterType = "all" | EquipmentType;

interface ShotEquipmentPickerProps {
  value: string[];
  onChange: (orderedIds: string[]) => void;
  id?: string;
}

export function ShotEquipmentPicker({
  value,
  onChange,
  id,
}: ShotEquipmentPickerProps) {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const { data: myGrinders } = useGrinders();
  const { data: myMachines } = useMachines();
  const myKettles = useExtraGearList("kettle");
  const myScales = useExtraGearList("scale");
  const myPourOver = useExtraGearList("pour_over");
  const myFrenchPress = useExtraGearList("french_press");
  const myMokaPot = useExtraGearList("moka_pot");
  const myColdBrew = useExtraGearList("cold_brew");

  const { byType: extraMineByType } = useMemo(
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

  const allEntries = useMemo(
    () => buildAllGearCollectionEntries(myGrinders, myMachines, extraMineByType),
    [myGrinders, myMachines, extraMineByType],
  );

  const visibleEntries = useMemo(
    () => filterGearEntriesByTypeAndSearch(allEntries, filterType, search),
    [allEntries, filterType, search],
  );

  const idToEntry = useMemo(() => {
    const m = new Map<string, GearCollectionEntry>();
    for (const e of allEntries) {
      m.set(e.item.id, e);
    }
    return m;
  }, [allEntries]);

  function toggleId(eqId: string) {
    if (value.includes(eqId)) {
      onChange(value.filter((x) => x !== eqId));
    } else {
      onChange([...value, eqId]);
    }
  }

  function removeId(eqId: string) {
    onChange(value.filter((x) => x !== eqId));
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <label
            htmlFor={id ? `${id}-type` : undefined}
            className="shrink-0 text-sm font-medium text-stone-800 dark:text-stone-200"
          >
            Type
          </label>
          <select
            id={id ? `${id}-type` : undefined}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="h-10 w-full min-w-[11rem] rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 sm:max-w-xs"
          >
            <option value="all">All types</option>
            {ADMIN_EQUIPMENT_TYPE_OPTIONS.filter((o) => o.value !== "tool").map(
              (o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <label
            htmlFor={id ? `${id}-search` : undefined}
            className="shrink-0 text-sm font-medium text-stone-800 dark:text-stone-200"
          >
            Search
          </label>
          <input
            id={id ? `${id}-search` : undefined}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name…"
            className="h-10 w-full min-w-[10rem] rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
          />
        </div>
      </div>

      <div className="max-h-[min(50vh,20rem)] space-y-1 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50/50 p-2 dark:border-stone-700 dark:bg-stone-900/40">
        {visibleEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">No gear matches.</p>
        ) : (
          visibleEntries.map((entry) => {
            const selected = value.includes(entry.item.id);
            return (
              <label
                key={`${entry.kind}-${entry.item.id}`}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  selected
                    ? "bg-amber-50 dark:bg-amber-950/35"
                    : "hover:bg-stone-100 dark:hover:bg-stone-800/80"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleId(entry.item.id)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-300 accent-amber-600 focus:ring-amber-500 dark:border-stone-600 dark:accent-amber-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-stone-900 dark:text-stone-100">
                    {entry.item.name}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {labelForGearEntryKind(entry.kind)}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>

      {value.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Selected ({value.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {value.map((eqId) => {
              const entry = idToEntry.get(eqId);
              const label = entry
                ? `${entry.item.name} (${labelForGearEntryKind(entry.kind)})`
                : eqId;
              return (
                <li
                  key={eqId}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-amber-200 bg-amber-50 pl-3 pr-1 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <span className="truncate">{label}</span>
                  <button
                    type="button"
                    onClick={() => removeId(eqId)}
                    className="shrink-0 rounded-full p-1 text-amber-800 hover:bg-amber-200/80 dark:text-amber-200 dark:hover:bg-amber-900/60"
                    aria-label={`Remove ${entry?.item.name ?? "item"}`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

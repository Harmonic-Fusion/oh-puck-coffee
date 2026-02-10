"use client";

import { useMemo } from "react";
import { Modal } from "@/components/common/Modal";
import { useTools } from "@/components/equipment/hooks";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface ShotDetailProps {
  shot: ShotWithJoins | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-stone-500 dark:text-stone-400">
        {label}
      </span>
      <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
        {value}
      </span>
    </div>
  );
}

export function ShotDetail({ shot, open, onClose, onDelete }: ShotDetailProps) {
  const { data: allTools } = useTools();
  const toolMap = useMemo(() => {
    const m = new Map<string, string>();
    allTools?.forEach((t) => m.set(t.slug, t.name));
    return m;
  }, [allTools]);

  if (!shot) return null;

  const dose = parseFloat(shot.doseGrams);
  const yieldG = parseFloat(shot.yieldGrams);
  const ratio = dose > 0 ? (yieldG / dose).toFixed(2) : null;

  return (
    <Modal open={open} onClose={onClose} title="Shot Detail">
      <div className="space-y-6">
        {/* Meta */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-stone-800 dark:text-stone-200">
              {shot.beanName || "Unknown bean"}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              by {shot.userName || "Unknown user"} ·{" "}
              {new Date(shot.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {shot.isReferenceShot && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              ⭐ Reference
            </span>
          )}
        </div>

        {/* Quality */}
        <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Shot Quality
          </span>
          <span className="ml-auto text-2xl font-bold text-amber-600 dark:text-amber-400">
            {shot.shotQuality}
          </span>
          <span className="text-sm text-stone-400 dark:text-stone-500">
            / 10
          </span>
        </div>

        {/* Recipe */}
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Recipe
          </h3>
          <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 px-4 dark:divide-stone-800 dark:border-stone-700">
            <DetailRow label="Dose" value={`${shot.doseGrams}g`} />
            <DetailRow label="Yield" value={`${shot.yieldGrams}g`} />
            <DetailRow
              label="Brew Ratio"
              value={ratio ? `1:${ratio}` : null}
            />
            <DetailRow label="Grind Level" value={shot.grindLevel} />
            <DetailRow label="Brew Time" value={`${shot.brewTimeSecs}s`} />
            <DetailRow
              label="Brew Temp"
              value={shot.brewTempC ? `${shot.brewTempC}°C` : null}
            />
            <DetailRow
              label="Pre-infusion"
              value={
                shot.preInfusionDuration
                  ? `${shot.preInfusionDuration}s`
                  : null
              }
            />
            <DetailRow
              label="Flow Rate"
              value={shot.flowRate ? `${shot.flowRate} g/s` : null}
            />
            <DetailRow label="Grinder" value={shot.grinderName} />
            <DetailRow label="Machine" value={shot.machineName} />
            <DetailRow
              label="Days Post Roast"
              value={shot.daysPostRoast}
            />
          </div>
        </div>

        {/* Tasting */}
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Tasting
          </h3>
          <div className="space-y-3">
            {shot.flavorWheelBody && (
              <div>
                <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                  Body
                </p>
                <span className="rounded-full border border-stone-200 px-2.5 py-0.5 text-xs text-stone-700 dark:border-stone-700 dark:text-stone-300">
                  {shot.flavorWheelBody}
                </span>
              </div>
            )}

            {shot.toolsUsed && shot.toolsUsed.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                  Tools Used
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {shot.toolsUsed.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                    >
                      {toolMap.get(t) || t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {shot.notes && (
              <div>
                <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                  Notes
                </p>
                <p className="text-sm text-stone-700 dark:text-stone-300">
                  {shot.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Flavor Wheel Detail */}
        {shot.flavorWheelCategories &&
          Object.keys(shot.flavorWheelCategories).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Flavor Wheel
              </h3>
              <div className="space-y-2">
                {Object.entries(shot.flavorWheelCategories).map(
                  ([key, flavors]) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                        {key}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(flavors as string[]).map((f) => (
                          <span
                            key={f}
                            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {shot.flavorWheelAdjectives &&
          shot.flavorWheelAdjectives.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
                Adjectives
              </p>
              <div className="flex flex-wrap gap-1.5">
                {shot.flavorWheelAdjectives.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Actions */}
        {onDelete && (
          <div className="border-t border-stone-200 pt-4 dark:border-stone-700">
            <button
              onClick={() => {
                if (confirm("Delete this shot?")) {
                  onDelete(shot.id);
                  onClose();
                }
              }}
              className="w-full rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              Delete Shot
            </button>
          </div>
        )}

      </div>
    </Modal>
  );
}

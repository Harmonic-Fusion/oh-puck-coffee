"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { QRCode } from "@/components/common/QRCode";
import { useTools } from "@/components/equipment/hooks";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { AppRoutes } from "@/app/routes";

interface ShotDetailProps {
  shot: ShotWithJoins | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onToggleReference?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
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

export function ShotDetail({ 
  shot, 
  open, 
  onClose, 
  onDelete,
  onToggleReference,
  onToggleHidden,
}: ShotDetailProps) {
  const router = useRouter();
  const { data: allTools } = useTools();
  const toolMap = useMemo(() => {
    const m = new Map<string, string>();
    allTools?.forEach((t) => m.set(t.slug, t.name));
    return m;
  }, [allTools]);

  const [duplicateUrl, setDuplicateUrl] = useState<string>("");

  useEffect(() => {
    if (shot && typeof window !== "undefined") {
      const params = new URLSearchParams();
      if (shot.beanId) params.set("beanId", shot.beanId);
      if (shot.grinderId) params.set("grinderId", shot.grinderId);
      if (shot.machineId) params.set("machineId", shot.machineId);
      if (shot.doseGrams) params.set("doseGrams", shot.doseGrams);
      if (shot.yieldGrams) params.set("yieldGrams", shot.yieldGrams);
      if (shot.grindLevel) params.set("grindLevel", shot.grindLevel);
      if (shot.brewTempC) params.set("brewTempC", shot.brewTempC);
      if (shot.preInfusionDuration) params.set("preInfusionDuration", shot.preInfusionDuration);
      if (shot.brewPressure) params.set("brewPressure", shot.brewPressure);
      if (shot.toolsUsed && shot.toolsUsed.length > 0) {
        params.set("toolsUsed", shot.toolsUsed.join(","));
      }
      
      const url = `${window.location.origin}${AppRoutes.log.path}?${params.toString()}`;
      setDuplicateUrl(url);
    }
  }, [shot]);

  if (!shot) return null;

  const handleDuplicate = () => {
    if (duplicateUrl) {
      onClose();
      router.push(duplicateUrl);
    } else {
      // Fallback to sessionStorage for backward compatibility
      const duplicateData = {
        beanId: shot.beanId,
        grinderId: shot.grinderId,
        machineId: shot.machineId || undefined,
        doseGrams: shot.doseGrams ? parseFloat(shot.doseGrams) : undefined,
        yieldGrams: shot.yieldGrams ? parseFloat(shot.yieldGrams) : undefined,
        grindLevel: shot.grindLevel ? parseFloat(shot.grindLevel) : undefined,
        brewTempC: shot.brewTempC ? parseFloat(shot.brewTempC) : undefined,
        preInfusionDuration: shot.preInfusionDuration ? parseFloat(shot.preInfusionDuration) : undefined,
        brewPressure: shot.brewPressure ? parseFloat(shot.brewPressure) : undefined,
        toolsUsed: shot.toolsUsed || [],
      };
      sessionStorage.setItem("duplicateShot", JSON.stringify(duplicateData));
      onClose();
      router.push(AppRoutes.log.path);
    }
  };

  const handleDelete = () => {
    if (confirm("Delete this shot?")) {
      if (onDelete) {
        onDelete(shot.id);
      }
      onClose();
    }
  };

  const handleToggleReference = () => {
    if (onToggleReference) {
      onToggleReference(shot.id);
    }
  };

  const handleToggleHidden = () => {
    if (onToggleHidden) {
      onToggleHidden(shot.id);
    }
  };

  const dose = parseFloat(shot.doseGrams);
  const yieldG = parseFloat(shot.yieldGrams);
  const yieldActual = shot.yieldActualGrams ? parseFloat(shot.yieldActualGrams) : null;
  const ratio = dose > 0 ? parseFloat((yieldG / dose).toFixed(2)) : null;
  const actualRatio = dose > 0 && yieldActual ? parseFloat((yieldActual / dose).toFixed(2)) : null;

  const footer = (
    <div className="flex items-center gap-2">
      {onDelete ? (
        <Button
          variant="danger"
          size="md"
          onClick={handleDelete}
          className="flex-1"
          title="Delete shot"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </Button>
      ) : (
        <div className="flex-1" />
      )}
      {onToggleReference && (
        <Button
          variant={shot.isReferenceShot ? "primary" : "secondary"}
          size="md"
          onClick={handleToggleReference}
          className="flex-1"
          title={shot.isReferenceShot ? "Remove reference shot" : "Mark as reference shot"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={shot.isReferenceShot ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </Button>
      )}
      {onToggleHidden && (
        <Button
          variant={shot.isHidden ? "secondary" : "ghost"}
          size="md"
          onClick={handleToggleHidden}
          className="flex-1"
          title={shot.isHidden ? "Show shot" : "Hide shot"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {shot.isHidden ? (
              <>
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </>
            ) : (
              <>
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </Button>
      )}
      <Button
        variant="secondary"
        size="md"
        onClick={handleDuplicate}
        className="flex-1"
        title="Duplicate shot"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </Button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Shot Detail" footer={footer}>
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
            / 5
          </span>
        </div>

        {/* Rating */}
        {shot.rating != null && (
          <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-4 py-3 dark:bg-stone-800">
            <span className="text-sm text-stone-500 dark:text-stone-400">
              Rating
            </span>
            <span className="ml-auto text-2xl font-bold text-blue-600 dark:text-blue-400">
              {shot.rating}
            </span>
            <span className="text-sm text-stone-400 dark:text-stone-500">
              / 5
            </span>
          </div>
        )}

        {/* Recipe */}
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Recipe
          </h3>
          <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 px-4 dark:divide-stone-800 dark:border-stone-700">
            <DetailRow label="Dose" value={`${shot.doseGrams}g`} />
            <DetailRow label="Target Yield" value={`${shot.yieldGrams}g${ratio ? ` (1:${ratio})` : ""}`} />
            <DetailRow label="Grind Level" value={shot.grindLevel} />
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
              label="Brew Pressure"
              value={shot.brewPressure ? `${shot.brewPressure} bar` : null}
            />
            <DetailRow label="Grinder" value={shot.grinderName} />
            <DetailRow label="Machine" value={shot.machineName} />
            <DetailRow
              label="Days Post Roast"
              value={shot.daysPostRoast}
            />
          </div>
        </div>

        {/* Results */}
        {(shot.brewTimeSecs || shot.yieldActualGrams) && (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Results
            </h3>
            <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 px-4 dark:divide-stone-800 dark:border-stone-700">
              {shot.yieldActualGrams && (
                <DetailRow 
                  label="Actual Yield" 
                  value={`${shot.yieldActualGrams}g${actualRatio ? ` (1:${actualRatio})` : ""}`} 
                />
              )}
              {shot.brewTimeSecs && (
                <DetailRow 
                  label="Brew Time" 
                  value={`${shot.brewTimeSecs}s${shot.flowRate ? ` · ${shot.flowRate} g/s` : ""}`} 
                />
              )}
            </div>
          </div>
        )}

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
                <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">
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

        {/* QR Code for Duplicate */}
        {duplicateUrl && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Duplicate Shot
            </h3>
            <p className="text-center text-xs text-stone-500 dark:text-stone-400">
              Scan to duplicate this shot recipe
            </p>
            <QRCode value={duplicateUrl} size={200} title="Duplicate Shot Recipe" />
          </div>
        )}

      </div>
    </Modal>
  );
}

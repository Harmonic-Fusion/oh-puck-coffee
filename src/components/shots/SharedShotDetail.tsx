"use client";

import { useMemo } from "react";
import { ShotDetail } from "@/components/shots/ShotDetail";
import type { ShotWithJoins } from "@/components/shots/hooks";

interface SharedShotData {
  id: string;
  userName: string | null;
  userImage: string | null;
  beanName: string | null;
  beanRoastLevel: string | null;
  beanRoastDate: Date | string | null;
  grinderName: string | null;
  machineName: string | null;
  doseGrams: string | null;
  yieldGrams: string | null;
  yieldActualGrams: string | null;
  grindLevel: string | null;
  brewTimeSecs: string | null;
  brewTempC: string | null;
  preInfusionDuration: string | null;
  brewPressure: string | null;
  estimateMaxPressure: string | null;
  flowControl: string | null;
  flowRate: string | null;
  shotQuality: string | null;
  rating: string | null;
  bitter: string | null;
  sour: string | null;
  notes: string | null;
  flavors: string[] | null;
  bodyTexture: string[] | null;
  adjectives: string[] | null;
  toolsUsed: string[] | null;
  isReferenceShot: boolean;
  createdAt: Date | string;
  brewRatio: number | null;
  daysPostRoast: number | null;
}

interface SharedShotDetailProps {
  shot: SharedShotData;
}

export function SharedShotDetail({ shot }: SharedShotDetailProps) {
  // Transform server data to ShotWithJoins format
  const shotWithJoins: ShotWithJoins = useMemo(() => ({
    id: shot.id,
    userId: "", // Not needed for read-only
    userName: shot.userName,
    beanId: "", // Not needed for read-only
    beanName: shot.beanName,
    beanRoastDate: shot.beanRoastDate ? (typeof shot.beanRoastDate === "string" ? shot.beanRoastDate : shot.beanRoastDate.toISOString()) : null,
    beanRoastLevel: shot.beanRoastLevel,
    grinderId: "", // Not needed for read-only
    grinderName: shot.grinderName,
    machineId: null, // Not needed for read-only
    machineName: shot.machineName,
    doseGrams: shot.doseGrams ?? "0",
    yieldGrams: shot.yieldGrams ?? "0",
    sizeOz: null, // Not available in shared shot data
    yieldActualGrams: shot.yieldActualGrams,
    grindLevel: shot.grindLevel || "",
    brewTimeSecs: shot.brewTimeSecs,
    brewTempC: shot.brewTempC,
    preInfusionDuration: shot.preInfusionDuration,
    brewPressure: shot.brewPressure,
    brewRatio: shot.brewRatio,
    estimateMaxPressure: shot.estimateMaxPressure,
    flowControl: shot.flowControl,
    flowRate: shot.flowRate,
    daysPostRoast: shot.daysPostRoast,
    shotQuality: shot.shotQuality ? parseFloat(shot.shotQuality) : 0,
    rating: shot.rating ? parseFloat(shot.rating) : null,
    bitter: shot.bitter ? parseFloat(shot.bitter) : null,
    sour: shot.sour ? parseFloat(shot.sour) : null,
    toolsUsed: shot.toolsUsed,
    notes: shot.notes,
    flavors: shot.flavors,
    bodyTexture: shot.bodyTexture,
    adjectives: shot.adjectives,
    isReferenceShot: shot.isReferenceShot,
    isHidden: false, // Not relevant for shared shots
    createdAt: typeof shot.createdAt === "string" ? shot.createdAt : shot.createdAt.toISOString(),
    updatedAt: typeof shot.createdAt === "string" ? shot.createdAt : shot.createdAt.toISOString(),
  }), [shot]);

  return (
    <ShotDetail
      shot={shotWithJoins}
      open={true}
      onClose={() => {}} // No-op for share page
      readOnly={true}
    />
  );
}

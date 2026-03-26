import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { shots, beans, users, grinders, machines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SharedShotDetail } from "@/components/shots/SharedShotDetail";
import {
  listImagesForShot,
  thumbnailBufferToBase64,
} from "@/lib/images";
import type { ShotImageListItem } from "@/shared/images/schema";

interface SharePageProps {
  params: Promise<{ uid: string }>;
}

async function getSharedShot(uid: string) {
  const [result] = await db
    .select({
      id: shots.id,
      userName: users.name,
      userImage: users.image,
      beanName: beans.name,
      beanRoastLevel: beans.roastLevel,
      beanRoastDate: beans.roastDate,
      grinderName: grinders.name,
      machineName: machines.name,
      doseGrams: shots.doseGrams,
      yieldGrams: shots.yieldGrams,
      yieldActualGrams: shots.yieldActualGrams,
      grindLevel: shots.grindLevel,
      brewTimeSecs: shots.brewTimeSecs,
      brewTempC: shots.brewTempC,
      preInfusionDuration: shots.preInfusionDuration,
      preInfusionWaitDuration: shots.preInfusionWaitDuration,
      brewPressure: shots.brewPressure,
      estimateMaxPressure: shots.estimateMaxPressure,
      flowControl: shots.flowControl,
      flowRate: shots.flowRate,
      shotQuality: shots.shotQuality,
      rating: shots.rating,
      bitter: shots.bitter,
      sour: shots.sour,
      notes: shots.notes,
      flavors: shots.flavors,
      bodyTexture: shots.bodyTexture,
      adjectives: shots.adjectives,
      toolsUsed: shots.toolsUsed,
      isReferenceShot: shots.isReferenceShot,
      createdAt: shots.createdAt,
    })
    .from(shots)
    .leftJoin(users, eq(shots.userId, users.id))
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .leftJoin(grinders, eq(shots.grinderId, grinders.id))
    .leftJoin(machines, eq(shots.machineId, machines.id))
    .where(eq(shots.shareSlug, uid))
    .limit(1);

  if (!result) return null;

  const imageRows = await listImagesForShot(result.id);
  const shotImages: ShotImageListItem[] = imageRows.map((r) => ({
    id: r.id,
    url: `/api/images/${r.id}`,
    thumbnailBase64: thumbnailBufferToBase64(r.thumbnail),
    sizeBytes: r.sizeBytes,
    attachedAt: r.attachedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  // Compute derived fields
  const dose = result.doseGrams ? parseFloat(result.doseGrams) : null;
  const yieldG = result.yieldGrams ? parseFloat(result.yieldGrams) : null;
  const brewRatio =
    dose !== null && yieldG !== null && dose > 0
      ? parseFloat((yieldG / dose).toFixed(2))
      : null;

  let daysPostRoast: number | null = null;
  if (result.beanRoastDate) {
    const shotDate = new Date(result.createdAt);
    const roastDate = new Date(result.beanRoastDate);
    daysPostRoast = Math.floor(
      (shotDate.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    ...result,
    bitter: result.bitter ?? null,
    sour: result.sour ?? null,
    brewRatio,
    daysPostRoast,
    shotImages,
  };
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { uid } = await params;
  const shot = await getSharedShot(uid);

  if (!shot) {
    return { title: "Shot Not Found — Coffee Tracker" };
  }

  const description = [
    shot.beanName && `Bean: ${shot.beanName}`,
    `${shot.doseGrams}g in → ${shot.yieldGrams}g out`,
    shot.brewTimeSecs && `${shot.brewTimeSecs}s`,
    `Quality: ${shot.shotQuality}/5`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${shot.userName ?? "Someone"}'s Espresso Shot — Coffee Tracker`,
    description,
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { uid } = await params;
  const shot = await getSharedShot(uid);

  if (!shot) {
    notFound();
  }

  const { shotImages, ...sharedShot } = shot;

  return (
    <SharedShotDetail shot={sharedShot} shotImages={shotImages} />
  );
}

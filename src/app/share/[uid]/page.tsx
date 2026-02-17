import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { shotShares, shots, beans, users, grinders, machines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SharedShotView } from "@/components/shots/SharedShotView";

interface SharePageProps {
  params: Promise<{ uid: string }>;
}

async function getSharedShot(uid: string) {
  // Look up the share
  const [share] = await db
    .select()
    .from(shotShares)
    .where(eq(shotShares.id, uid))
    .limit(1);

  if (!share) return null;

  // Fetch shot with related data
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
      grindLevel: shots.grindLevel,
      brewTimeSecs: shots.brewTimeSecs,
      brewTempC: shots.brewTempC,
      preInfusionDuration: shots.preInfusionDuration,
      brewPressure: shots.brewPressure,
      estimateMaxPressure: shots.estimateMaxPressure,
      flowControl: shots.flowControl,
      flowRate: shots.flowRate,
      shotQuality: shots.shotQuality,
      rating: shots.rating,
      notes: shots.notes,
      flavorWheelCategories: shots.flavorWheelCategories,
      flavorWheelBody: shots.flavorWheelBody,
      flavorWheelAdjectives: shots.flavorWheelAdjectives,
      isReferenceShot: shots.isReferenceShot,
      createdAt: shots.createdAt,
    })
    .from(shots)
    .leftJoin(users, eq(shots.userId, users.id))
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .leftJoin(grinders, eq(shots.grinderId, grinders.id))
    .leftJoin(machines, eq(shots.machineId, machines.id))
    .where(eq(shots.id, share.shotId))
    .limit(1);

  if (!result) return null;

  // Compute derived fields
  const dose = parseFloat(result.doseGrams);
  const yieldG = parseFloat(result.yieldGrams);
  const brewRatio = dose > 0 ? parseFloat((yieldG / dose).toFixed(2)) : null;

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
    brewRatio,
    daysPostRoast,
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

  return <SharedShotView shot={shot} />;
}

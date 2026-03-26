"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AppRoutes } from "@/app/routes";

const { puckingAdmin } = AppRoutes;
const equipmentRoutes = puckingAdmin.equipment as typeof puckingAdmin.equipment & {
  grinders: { path: string };
  machines: { path: string };
};

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
    >
      {children}
    </Link>
  );
}

interface ShotDetail {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  beanId: string;
  beanName: string | null;
  grinderId: string | null;
  grinderName: string | null;
  machineId: string | null;
  machineName: string | null;
  doseGrams: string | null;
  yieldGrams: string | null;
  yieldActualGrams: string | null;
  grindLevel: string | null;
  brewTempC: string | null;
  preInfusionDuration: string | null;
  preInfusionWaitDuration: string | null;
  brewPressure: string | null;
  brewTimeSecs: string | null;
  estimateMaxPressure: string | null;
  flowControl: string | null;
  flowRate: string | null;
  rating: string | null;
  shotQuality: string | null;
  bitter: string | null;
  sour: string | null;
  flavors: string[] | null;
  bodyTexture: string[] | null;
  adjectives: string[] | null;
  toolsUsed: string[] | null;
  notes: string | null;
  isReferenceShot: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-stone-100 py-2.5 last:border-0 dark:border-stone-800">
      <span className="text-sm text-stone-500 dark:text-stone-400">{label}</span>
      <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
        {value ?? "—"}
      </span>
    </div>
  );
}

function TagList({ items }: { items: string[] | null }) {
  if (!items || items.length === 0) return <span className="text-stone-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function AdminShotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery<ShotDetail>({
    queryKey: ["admin-shot-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/shots/${id}`);
      if (!res.ok) throw new Error("Failed to fetch shot details");
      return res.json();
    },
  });

  return (
    <div>
      <AdminBreadcrumb
        segments={[
          { label: "Shots", href: AppRoutes.puckingAdmin.shots.path },
          { label: isLoading ? "..." : id.slice(0, 8) + "..." },
        ]}
      />

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load shot details.
        </div>
      )}

      {isLoading && (
        <div className="h-64 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
      )}

      {data && (
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Recipe */}
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Recipe
            </h2>
            <InfoRow label="Bean" value={
              data.beanId ? (
                <AdminLink href={`${puckingAdmin.beans.path}/${data.beanId}`}>
                  {data.beanName ?? data.beanId.slice(0, 8)}
                </AdminLink>
              ) : null
            } />
            <InfoRow label="Grinder" value={
              data.grinderId ? (
                <AdminLink href={`${equipmentRoutes.grinders.path}/${data.grinderId}`}>
                  {data.grinderName ?? data.grinderId.slice(0, 8)}
                </AdminLink>
              ) : null
            } />
            <InfoRow label="Machine" value={
              data.machineId ? (
                <AdminLink href={`${equipmentRoutes.machines.path}/${data.machineId}`}>
                  {data.machineName ?? data.machineId.slice(0, 8)}
                </AdminLink>
              ) : null
            } />
            <InfoRow label="Dose" value={data.doseGrams ? `${data.doseGrams}g` : null} />
            <InfoRow label="Target Yield" value={data.yieldGrams ? `${data.yieldGrams}g` : null} />
            <InfoRow label="Grind Level" value={data.grindLevel} />
            <InfoRow label="Brew Temp" value={data.brewTempC ? `${data.brewTempC}°C` : null} />
            <InfoRow label="Pre-infusion start" value={data.preInfusionDuration ? `${data.preInfusionDuration}s` : null} />
            <InfoRow label="Pre-infusion wait" value={data.preInfusionWaitDuration ? `${data.preInfusionWaitDuration}s` : null} />
            <InfoRow label="Brew Pressure" value={data.brewPressure ? `${data.brewPressure} bar` : null} />
          </div>

          {/* Results */}
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Results
            </h2>
            <InfoRow label="Actual Yield" value={data.yieldActualGrams ? `${data.yieldActualGrams}g` : null} />
            <InfoRow label="Brew Time" value={data.brewTimeSecs ? `${data.brewTimeSecs}s` : null} />
            <InfoRow label="Flow Rate" value={data.flowRate ? `${data.flowRate} g/s` : null} />
            <InfoRow label="Max Pressure" value={data.estimateMaxPressure ? `${data.estimateMaxPressure} bar` : null} />
            <InfoRow label="Flow Control" value={data.flowControl} />
          </div>

          {/* Ratings */}
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Ratings
            </h2>
            <InfoRow label="Rating" value={data.rating} />
            <InfoRow label="Shot Quality" value={data.shotQuality} />
            <InfoRow label="Bitter" value={data.bitter} />
            <InfoRow label="Sour" value={data.sour} />
          </div>

          {/* Metadata */}
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Metadata
            </h2>
            <InfoRow label="User" value={
              <AdminLink href={`${puckingAdmin.users.path}/${data.userId}`}>
                <span className="font-mono text-xs">{data.userEmail ?? data.userName ?? data.userId.slice(0, 8)}</span>
              </AdminLink>
            } />
            <InfoRow label="Reference Shot" value={data.isReferenceShot ? "Yes" : "No"} />
            <InfoRow label="Hidden" value={data.isHidden ? "Yes" : "No"} />
            <InfoRow label="Created" value={new Date(data.createdAt).toLocaleString()} />
            <InfoRow label="Updated" value={new Date(data.updatedAt).toLocaleString()} />
          </div>

          {/* Tasting Notes */}
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:col-span-2 dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Tasting Notes
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-stone-500 dark:text-stone-400">Flavors</span>
                <div className="mt-1"><TagList items={data.flavors} /></div>
              </div>
              <div>
                <span className="text-xs text-stone-500 dark:text-stone-400">Body & Texture</span>
                <div className="mt-1"><TagList items={data.bodyTexture} /></div>
              </div>
              <div>
                <span className="text-xs text-stone-500 dark:text-stone-400">Adjectives</span>
                <div className="mt-1"><TagList items={data.adjectives} /></div>
              </div>
              <div>
                <span className="text-xs text-stone-500 dark:text-stone-400">Tools Used</span>
                <div className="mt-1"><TagList items={data.toolsUsed} /></div>
              </div>
              {data.notes && (
                <div>
                  <span className="text-xs text-stone-500 dark:text-stone-400">Notes</span>
                  <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">{data.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

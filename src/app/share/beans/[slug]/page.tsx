import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/auth";
import { config } from "@/shared/config";
import { ApiRoutes, AppRoutes, resolvePath } from "@/app/routes";
import { ShareBeanVisitorActions } from "./ShareBeanVisitorActions";

interface ShareBeanPageProps {
  params: Promise<{ slug: string }>;
}

interface SharedBeanPayload {
  id: string;
  name: string;
  origin: string | null;
  roaster: string | null;
  originDetails: string | null;
  processingMethod: string | null;
  roastLevel: string;
  roastDate: string | null;
  isRoastDateBestGuess: boolean;
  createdBy: string;
  generalAccess: string;
  generalAccessShareShots: boolean;
  shareSlug: string | null;
  createdAt: string;
}

interface SharedShotPayload {
  id: string;
  doseGrams: string | null;
  yieldGrams: string | null;
  grindLevel: string | null;
  brewTimeSecs: string | null;
  brewTempC: string | null;
  shotQuality: string | null;
  rating: string | null;
  bitter: string | null;
  sour: string | null;
  notes: string | null;
  flavors: string[] | null;
  bodyTexture: string[] | null;
  adjectives: string[] | null;
  isReferenceShot: boolean;
  createdAt: string;
  userName: string | null;
  userImage: string | null;
  grinderName: string | null;
  machineName: string | null;
}

async function getSharedBean(slug: string): Promise<{
  bean: SharedBeanPayload;
  shots: SharedShotPayload[];
} | null> {
  const base = config.nextAuthUrl ?? "http://localhost:3000";
  const slugRoute = (ApiRoutes.shares.beans as unknown as {
    slug: { path: string };
  }).slug;
  const path = resolvePath(slugRoute, { slug });
  const url = `${base}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

interface PublicBeanStats {
  shotCount: number;
  followerCount: number;
  averageRating: number | null;
  flavorsByAverageRating: {
    flavor: string;
    averageRating: number;
    shotCount: number;
  }[];
}

async function getSharedBeanStats(slug: string): Promise<PublicBeanStats | null> {
  const base = config.nextAuthUrl ?? "http://localhost:3000";
  const statsRoute = (ApiRoutes.shares.beans as unknown as {
    slug: { stats: { path: string } };
  }).slug.stats;
  const path = resolvePath(statsRoute, { slug });
  const url = `${base}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: ShareBeanPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSharedBean(slug);
  if (!data) {
    return { title: "Bean Not Found — Coffee Tracker" };
  }
  const { bean } = data;
  const description = [
    bean.roaster && `Roaster: ${bean.roaster}`,
    bean.origin && `Origin: ${bean.origin}`,
    `Roast: ${bean.roastLevel}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title: `${bean.name} — Shared Bean — Coffee Tracker`,
    description,
  };
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtNum(v: string | number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "—" : n.toFixed(decimals);
}

export default async function ShareBeanPage({ params }: ShareBeanPageProps) {
  const { slug } = await params;
  const [data, stats, session] = await Promise.all([
    getSharedBean(slug),
    getSharedBeanStats(slug),
    getSession(),
  ]);

  if (!data) {
    notFound();
  }

  const { bean, shots } = data;
  const isOwner = session?.user?.id != null && session.user.id === bean.createdBy;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
          <Link
            href={AppRoutes.home.path}
            className="hover:text-stone-700 dark:hover:text-stone-300"
          >
            Coffee Tracker
            </Link>
            {" · "}
            Shared bean
          </p>

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
            {bean.name}
          </h1>
          {bean.roaster && (
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {bean.roaster}
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Roast Level
              </p>
              <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">
                {bean.roastLevel}
              </p>
            </div>
            {bean.origin && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Origin
                </p>
                <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">
                  {bean.origin}
                </p>
              </div>
            )}
            {bean.originDetails && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Origin Details
                </p>
                <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">
                  {bean.originDetails}
                </p>
              </div>
            )}
            {bean.processingMethod && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Processing
                </p>
                <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">
                  {bean.processingMethod}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {bean.isRoastDateBestGuess ? "Roast Date (est.)" : "Roast Date"}
              </p>
              <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">
                {bean.roastDate ? fmtDate(bean.roastDate) : "—"}
              </p>
            </div>
          </div>
        </div>

        {stats != null && (
          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Stats
            </h2>
            <div className="mt-3 flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold text-stone-800 dark:text-stone-200">
                  {stats.shotCount}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Shots
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800 dark:text-stone-200">
                  {stats.followerCount}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Followers
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800 dark:text-stone-200">
                  {stats.averageRating != null
                    ? fmtNum(stats.averageRating)
                    : "—"}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Avg rating
                </p>
              </div>
            </div>
            {stats.flavorsByAverageRating.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Flavors by rating
                </p>
                <ul className="mt-2 space-y-1">
                  {stats.flavorsByAverageRating.map((f) => (
                    <li
                      key={f.flavor}
                      className="flex justify-between text-sm text-stone-700 dark:text-stone-300"
                    >
                      <span>{f.flavor}</span>
                      <span className="text-stone-500 dark:text-stone-400">
                        ★ {fmtNum(f.averageRating)} ({f.shotCount})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {session == null && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
              Sign in to follow this bean and add it to your collection
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              <Link
                href={AppRoutes.login.path}
                className="font-medium text-amber-700 underline hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Log in
              </Link>
              {" or "}
              <Link
                href={AppRoutes.login.path}
                className="font-medium text-amber-700 underline hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              >
                create an account
              </Link>
            </p>
          </div>
        )}

        {session != null && isOwner && (
          <div className="mt-6">
            <Link
              href={resolvePath(AppRoutes.beans.beanId, { id: bean.id }, { sharing: "true" })}
              className="inline-flex items-center text-sm font-medium text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Manage sharing →
            </Link>
          </div>
        )}

        {session != null && !isOwner && (
          <div className="mt-6">
            <ShareBeanVisitorActions beanId={bean.id} slug={slug} />
          </div>
        )}

        {shots.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-stone-800 dark:text-stone-200">
              Shot log
            </h2>
            <ul className="space-y-3">
              {shots.map((shot) => {
                const dose = shot.doseGrams ? parseFloat(shot.doseGrams) : null;
                const yieldG = shot.yieldGrams
                  ? parseFloat(shot.yieldGrams)
                  : null;
                const ratio =
                  dose !== null && yieldG !== null && dose > 0
                    ? (yieldG / dose).toFixed(2)
                    : null;
                return (
                  <li
                    key={shot.id}
                    className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {fmtDate(shot.createdAt)}
                      </span>
                      {shot.rating != null && (
                        <span className="text-stone-500 dark:text-stone-400">
                          ★ {fmtNum(shot.rating)}
                        </span>
                      )}
                      {dose != null && (
                        <span className="text-stone-500 dark:text-stone-400">
                          {fmtNum(dose)}g → {yieldG != null ? fmtNum(yieldG) : "—"}g
                          {ratio != null && ` (${ratio})`}
                        </span>
                      )}
                      {shot.brewTimeSecs != null && (
                        <span className="text-stone-500 dark:text-stone-400">
                          {fmtNum(shot.brewTimeSecs)}s
                        </span>
                      )}
                    </div>
                    {(shot.notes || (shot.flavors && shot.flavors.length > 0)) && (
                      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                        {shot.flavors && shot.flavors.length > 0 && (
                          <span>
                            {shot.flavors.join(", ")}
                            {shot.notes ? " · " : ""}
                          </span>
                        )}
                        {shot.notes}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {shots.length === 0 && bean.generalAccessShareShots && (
          <p className="mt-8 text-center text-sm text-stone-500 dark:text-stone-400">
            No shots shared for this bean yet.
          </p>
        )}
      </div>
    </div>
  );
}

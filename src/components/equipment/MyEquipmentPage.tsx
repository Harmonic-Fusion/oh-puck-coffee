"use client";

import Link from "next/link";
import { AppRoutes } from "@/app/routes";
import { EquipmentSection } from "./EquipmentSection";

export function MyEquipmentPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:pb-8">
      <div className="mb-2">
        <Link
          href={AppRoutes.log.path}
          className="text-sm font-medium text-amber-800 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
        >
          ← Back to log shot
        </Link>
      </div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">My Equipment</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Your gear collection, then add from the catalog or create new equipment below.
        </p>
      </header>

      <EquipmentSection />
    </div>
  );
}

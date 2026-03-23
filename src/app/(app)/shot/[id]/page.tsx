"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useShot, useDeleteShot, useToggleReference, useToggleHidden } from "@/components/shots/hooks";
import { ShotDetail } from "@/components/shots/ShotDetail";
import { AppRoutes } from "@/app/routes";

export default function ShotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialEditMode = searchParams.get("edit") === "1";

  const { data: shot, isLoading, isError } = useShot(id ?? null);
  const deleteShot = useDeleteShot();
  const toggleReference = useToggleReference();
  const toggleHidden = useToggleHidden();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-48 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      </div>
    );
  }

  if (isError || !shot) {
    return (
      <div className="py-16 text-center text-stone-500 dark:text-stone-400">
        Shot not found.
      </div>
    );
  }

  return (
    <ShotDetail
      shot={shot}
      open
      initialEditMode={initialEditMode}
      onClose={() => router.push(AppRoutes.shots.path)}
      onDelete={async (deletedId) => {
        await deleteShot.mutateAsync(deletedId);
        router.push(AppRoutes.shots.path);
      }}
      onToggleReference={(refId) => {
        toggleReference.mutate(refId);
      }}
      onToggleHidden={(hiddenId) => {
        toggleHidden.mutate(hiddenId);
      }}
    />
  );
}

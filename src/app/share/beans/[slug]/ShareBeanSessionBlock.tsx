"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useBean } from "@/components/beans/hooks";
import { AppRoutes, resolvePath } from "@/app/routes";
import { ShareBeanVisitorActions } from "./ShareBeanVisitorActions";

interface ShareBeanSessionBlockProps {
  beanId: string;
  slug: string;
}

/**
 * When the user is logged in, shows either "Manage sharing" (owner) or
 * ShareBeanVisitorActions (follower/visitor). Uses useBean to determine ownership.
 */
export function ShareBeanSessionBlock({
  beanId,
  slug,
}: ShareBeanSessionBlockProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { data: bean, isLoading } = useBean(beanId);

  if (sessionStatus !== "authenticated" || !session?.user) {
    return null;
  }

  if (isLoading || !bean) {
    return (
      <div className="mt-6 h-20 animate-pulse rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/30" />
    );
  }

  const isOwner = bean.userBean?.status === "owner";

  if (isOwner) {
    return (
      <div className="mt-6">
        <Link
          href={resolvePath(AppRoutes.beans.beanId, { id: beanId }, { sharing: "true" })}
          className="inline-flex items-center text-sm font-medium text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Manage sharing →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <ShareBeanVisitorActions beanId={beanId} slug={slug} />
    </div>
  );
}

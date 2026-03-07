"use client";

import Image from "next/image";
import { useBeanShares } from "@/components/beans/hooks";

interface SharedWithProps {
  beanId: string;
  circleWidth?: number;
  overlapFactor?: number;
}

export function SharedWith({
  beanId,
  circleWidth = 32,
  overlapFactor = 0.2,
}: SharedWithProps) {
  const { data: sharesData, isLoading } = useBeanShares(beanId);

  if (isLoading || !sharesData) return null;

  const { members, createdBy, generalAccess } = sharesData;
  const isPublic =
    generalAccess === "public" || generalAccess === "anyone_with_link";
  // Exclude the owner row from the display count — show only followers
  const followers = members.filter((m) => m.userId !== createdBy);
  const sharedUsersCount = followers.length;

  if (!isPublic && sharedUsersCount === 0) {
    return null;
  }

  const displayShares = followers.slice(0, 3);

  // Total width: (N-1) circles adding the overlap factor each + 1 full circle
  const totalCircles = displayShares.length + 1;
  const totalWidth =
    circleWidth * overlapFactor * (totalCircles - 1) + circleWidth;

  return (
    <div
      className="relative mr-2"
      style={{ width: `${totalWidth}px`, height: `${circleWidth}px` }}
    >
      {displayShares.map((share, index) => (
        <div
          key={share.id}
          style={{
            zIndex: index + 1,
            position: "absolute",
            left: `${circleWidth * overlapFactor * index}px`,
            top: 0,
            width: `${circleWidth}px`,
            height: `${circleWidth}px`,
          }}
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-stone-200 dark:border-stone-900 dark:bg-stone-700"
        >
          {share.userImage ? (
            <Image
              src={share.userImage}
              alt=""
              fill
              className="object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
              {(share.userName ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      ))}
      <div
        style={{
          zIndex: displayShares.length + 1,
          position: "absolute",
          left: `${circleWidth * overlapFactor * displayShares.length}px`,
          top: 0,
          width: `${circleWidth}px`,
          height: `${circleWidth}px`,
        }}
        className="flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-stone-100 dark:border-stone-900 dark:bg-stone-800"
      >
        {isPublic ? (
          <span className="mb-0.5 text-xl leading-none text-stone-500 dark:text-stone-400">
            ∞
          </span>
        ) : (
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
            {sharedUsersCount}
          </span>
        )}
      </div>
    </div>
  );
}

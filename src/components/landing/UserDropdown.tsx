"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { AppRoutes } from "@/app/routes";

type UserDropdownProps = {
  userName: string | null | undefined;
  userImage: string | null | undefined;
};

export function UserDropdown({ userName, userImage }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
      >
        {userImage ? (
          <img
            src={userImage}
            alt=""
            className="h-6 w-6 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            {userName?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
        )}
        <span className="hidden sm:inline">{userName ?? "Account"}</span>
        <svg
          className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-48 origin-top-right rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
          <Link
            href={AppRoutes.log.path}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Log Shot
          </Link>
          <Link
            href={AppRoutes.history.path}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            History
          </Link>
          <Link
            href={AppRoutes.dashboard.path}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Dashboard
          </Link>
          <Link
            href={AppRoutes.settings.path}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Profile
          </Link>
          <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
          <button
            onClick={() => signOut({ callbackUrl: AppRoutes.login.path })}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

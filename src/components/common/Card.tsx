"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900 ${className}`}
    >
      {children}
    </div>
  );
}

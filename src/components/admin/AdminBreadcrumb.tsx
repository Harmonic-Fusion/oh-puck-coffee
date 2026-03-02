import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface AdminBreadcrumbProps {
  segments: BreadcrumbSegment[];
}

export function AdminBreadcrumb({ segments }: AdminBreadcrumbProps) {
  const allSegments: BreadcrumbSegment[] = [
    { label: "Admin", href: AppRoutes.puckingAdmin.path },
    ...segments,
  ];

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm">
        {allSegments.map((segment, i) => {
          const isLast = i === allSegments.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRightIcon className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
              )}
              {isLast || !segment.href ? (
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {segment.label}
                </span>
              ) : (
                <Link
                  href={segment.href}
                  className="text-stone-500 hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-400"
                >
                  {segment.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

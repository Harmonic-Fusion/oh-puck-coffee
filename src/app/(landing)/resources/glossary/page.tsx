"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppRoutes } from "@/app/routes";

interface GlossaryTerm {
  term: string;
  definition: string;
  common: string;
  slug: string;
}

function getCommonRatingDescription(rating: string): string {
  switch (rating) {
    case "★★★★★":
      return "Near-universal";
    case "★★★★☆":
      return "Very common";
    case "★★★☆☆":
      return "Common among enthusiasts";
    case "★★☆☆☆":
      return "Specialty/niche";
    case "★☆☆☆☆":
      return "Rare/technical";
    default:
      return "";
  }
}

function groupTermsByLetter(
  terms: GlossaryTerm[]
): Map<string, GlossaryTerm[]> {
  const grouped = new Map<string, GlossaryTerm[]>();
  for (const term of terms) {
    const firstLetter = term.term.charAt(0).toLowerCase();
    if (!grouped.has(firstLetter)) {
      grouped.set(firstLetter, []);
    }
    grouped.get(firstLetter)!.push(term);
  }
  return grouped;
}

function getAllLetters(): string[] {
  return Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
}

function useGlossary() {
  return useQuery<GlossaryTerm[]>({
    queryKey: ["assets", "glossary"],
    queryFn: async () => {
      const res = await fetch("/assets/data/glossary.json");
      if (!res.ok) throw new Error("Failed to fetch glossary data");
      return res.json();
    },
  });
}

export default function GlossaryPage() {
  const { data: terms, isLoading, error } = useGlossary();
  const allLetters = getAllLetters();
  const groupedTerms = terms
    ? groupTermsByLetter(terms)
    : new Map<string, GlossaryTerm[]>();

  return (
    <div className="relative">
      {/* Fixed vertical navigation bar on the left */}
      <div className="fixed left-0 top-16 z-10 h-[calc(100vh-4rem)] w-14 border-r border-stone-200 bg-white/95 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-950/95">
        <div className="flex h-full flex-col items-center justify-center overflow-x-hidden px-2">
          <div className="flex h-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden py-4 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {allLetters.map((letter) => {
              const hasTerms = groupedTerms.has(letter);
              return (
                <a
                  key={letter}
                  href={`#${letter}`}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
                    hasTerms
                      ? "bg-stone-100 text-stone-900 hover:scale-110 hover:bg-amber-100 hover:text-amber-900 active:scale-95 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
                      : "text-stone-300 dark:text-stone-700"
                  }`}
                >
                  {letter.toUpperCase()}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 sm:right-6 lg:right-8">
        <Link
          href={AppRoutes.resources.path}
          className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        >
          ← Resources
        </Link>
      </div>
      <div className="mx-auto max-w-7xl pl-16 pr-8 py-12 sm:pr-12 lg:pr-16">
        {/* Main content */}
        <main className="min-w-0 flex-1">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
            Espresso Glossary
          </h1>
          <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
            100 essential terms for espresso making, listed alphabetically.
          </p>

          {/* Loading State */}
          {isLoading && (
            <div className="mt-12 flex justify-center">
              <div className="text-stone-500 dark:text-stone-400">
                Loading glossary…
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mt-12 rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              Failed to load glossary data. Please try refreshing.
            </div>
          )}

          {/* Glossary Terms by Letter */}
          {terms && (
            <div className="mt-12 space-y-12">
              {allLetters.map((letter) => {
                const letterTerms = groupedTerms.get(letter);
                if (!letterTerms) return null;

                return (
                  <section key={letter} id={letter} className="scroll-mt-24">
                    <h2 className="mb-6 border-b-2 border-stone-200 pb-3 text-3xl font-bold text-stone-900 dark:border-stone-700 dark:text-stone-100">
                      {letter.toUpperCase()}
                    </h2>
                    <div className="space-y-6">
                      {letterTerms.map((item) => (
                        <div
                          key={item.term}
                          id={item.slug}
                          className="scroll-mt-36 rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
                                <a
                                  href={`#${item.slug}`}
                                  className="transition-colors hover:text-amber-600 dark:hover:text-amber-400"
                                >
                                  {item.term}
                                </a>
                              </h3>
                              <p className="mt-2 text-stone-600 dark:text-stone-400">
                                {item.definition}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="font-mono text-sm text-stone-500 dark:text-stone-400">
                                {item.common}
                              </div>
                              <div className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                                {getCommonRatingDescription(item.common)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* Rating Legend */}
          <div className="mt-16 rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-900">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Common Rating
            </p>
            <div className="grid gap-2 text-sm text-stone-600 dark:text-stone-400 sm:grid-cols-2 md:grid-cols-5">
              <div>
                <span className="font-mono">★★★★★</span> = Near-universal
              </div>
              <div>
                <span className="font-mono">★★★★☆</span> = Very common
              </div>
              <div>
                <span className="font-mono">★★★☆☆</span> = Common among
                enthusiasts
              </div>
              <div>
                <span className="font-mono">★★☆☆☆</span> = Specialty/niche
              </div>
              <div>
                <span className="font-mono">★☆☆☆☆</span> = Rare/technical
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

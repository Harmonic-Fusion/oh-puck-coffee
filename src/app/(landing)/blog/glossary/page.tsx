import Link from "next/link";
import { AppRoutes } from "@/app/routes";
import glossaryData from "./glossary.json";

interface GlossaryTerm {
  term: string;
  definition: string;
  common: string;
  slug: string;
}

const GLOSSARY_TERMS = glossaryData as GlossaryTerm[];

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

function groupTermsByLetter(terms: GlossaryTerm[]): Map<string, GlossaryTerm[]> {
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

export default function GlossaryPage() {
  const groupedTerms = groupTermsByLetter(GLOSSARY_TERMS);
  const allLetters = getAllLetters();
  const lettersWithTerms = allLetters.filter((letter) =>
    groupedTerms.has(letter)
  );

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href={AppRoutes.home.path}
              className="flex items-center gap-2"
            >
              <img
                src="/logos/logo_complex.png"
                alt="Coffee Tracker Logo"
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Coffee Tracker
              </span>
            </Link>
            <Link
              href={AppRoutes.blog.path}
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            >
              ← Blog
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Main content */}
        <main className="min-w-0 flex-1">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
            Espresso Glossary
          </h1>
          <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
            100 essential terms for espresso making, listed alphabetically.
          </p>

          {/* Alphabetical Navigation - Sticky */}
          <div className="sticky top-16 z-10 -mx-4 -mt-8 border-b border-stone-200 bg-white/95 px-4 py-4 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-950/95 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                Jump to Letter
              </p>
              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-2 pb-2">
                  {allLetters.map((letter) => {
                    const hasTerms = groupedTerms.has(letter);
                    return (
                      <a
                        key={letter}
                        href={`#${letter}`}
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                          hasTerms
                            ? "bg-stone-100 text-stone-900 hover:bg-amber-100 hover:text-amber-900 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
                            : "text-stone-400 dark:text-stone-600"
                        }`}
                      >
                        {letter.toUpperCase()}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Glossary Terms by Letter */}
          <div className="mt-12 space-y-12">
            {allLetters.map((letter) => {
              const terms = groupedTerms.get(letter);
              if (!terms) return null;

              return (
                <section
                  key={letter}
                  id={letter}
                  className="scroll-mt-36"
                >
                  <h2 className="mb-6 border-b-2 border-stone-200 pb-3 text-3xl font-bold text-stone-900 dark:border-stone-700 dark:text-stone-100">
                    {letter.toUpperCase()}
                  </h2>
                  <div className="space-y-6">
                    {terms.map((item) => (
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

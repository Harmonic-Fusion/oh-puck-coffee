import Link from "next/link";
import { AppRoutes } from "@/app/routes";

const BLOG_POSTS = [
  {
    title: "Shot Log Guide",
    description:
      "Everything you need to know about logging espresso shots — from choosing beans and dialing in your grinder to capturing results and tasting notes.",
    href: AppRoutes.blog.shotLog.path,
    emoji: "📖",
    tags: ["Getting Started", "Guide"],
  },
  {
    title: "Espresso Glossary",
    description:
      "100 essential terms for espresso making, from basic concepts like brew ratio and extraction to advanced techniques like pressure profiling and WDT.",
    href: AppRoutes.blog.glossary.path,
    emoji: "📚",
    tags: ["Reference", "Glossary"],
  },
] as const;

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      {/* Navigation */}
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/80">
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
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-b from-amber-50 to-white py-16 dark:from-stone-900 dark:to-stone-950">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
            Blog
          </h1>
          <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
            Guides, tips, and everything you need to get the most out of Coffee
            Tracker.
          </p>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:border-amber-300 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-amber-700"
            >
              <span className="text-4xl">{post.emoji}</span>
              <h2 className="mt-4 text-xl font-bold text-stone-900 group-hover:text-amber-700 dark:text-stone-100 dark:group-hover:text-amber-400">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                {post.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

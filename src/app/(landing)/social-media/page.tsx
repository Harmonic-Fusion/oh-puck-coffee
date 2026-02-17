import Link from "next/link";
import { AppRoutes } from "@/app/routes";

export default function SocialMediaPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      {/* Navigation */}
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href={AppRoutes.home.path} className="flex items-center gap-2">
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

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 p-8 text-center shadow-xl dark:from-amber-700 dark:to-orange-700">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Stop scrolling and start making espresso!
          </h1>
        </div>

        {/* GIF Section */}
        <div className="mt-12 flex justify-center">
          <div className="rounded-2xl bg-stone-100 p-4 dark:bg-stone-800">
            <img
              src="https://media.giphy.com/media/l0MYC0LajDoPo0BIc/giphy.gif"
              alt="Funny espresso gif"
              className="max-w-full rounded-lg"
              style={{ maxHeight: "500px" }}
            />
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <p className="text-lg leading-8 text-stone-600 dark:text-stone-400">
            Ready to track your shots instead of scrolling?
          </p>
          <div className="mt-6">
            <Link
              href={AppRoutes.home.path}
              className="inline-block rounded-lg bg-amber-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

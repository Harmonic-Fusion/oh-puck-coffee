import Link from "next/link";
import { AppRoutes } from "@/app/routes";

export default function CompanyPage() {
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
        <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
          About Coffee Tracker
        </h1>
        
        <div className="mt-12 space-y-12">
          {/* Mission */}
          <section>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              Our Mission
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              We believe that perfect espresso is not an art—it's a science. Coffee Tracker was born from the frustration of trying to remember that one magical shot you pulled three weeks ago. You know the one: 18.5g in, 36.2g out, grind setting 12, 94°C, 28 seconds, and it tasted like liquid gold.
            </p>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              Our mission is simple: eliminate the guesswork, eliminate the "I think it was..." moments, and give you the data-driven insights you need to consistently dial in perfection. Every shot logged is a data point. Every data point is a step closer to your perfect cup.
            </p>
          </section>

          {/* Philosophy */}
          <section>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              The Philosophy
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              We're not here to replace your palate—we're here to augment it. The best baristas combine sensory experience with quantitative data. That's why Coffee Tracker tracks everything: from the precise grind setting to the subjective flavor notes on the SCA Flavors.
            </p>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              We believe in <strong className="text-stone-900 dark:text-stone-100">open data</strong>. Your shots are yours. Export to Google Sheets, analyze in your own way, share with your team. We're just the platform that makes it all possible.
            </p>
          </section>

          {/* Call to Action */}
          <section className="rounded-2xl bg-amber-50 p-8 dark:bg-amber-900/20">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              Join the Experiment
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              Ready to turn your coffee routine into a data-driven pursuit of perfection? Start tracking your shots today and join a community of coffee enthusiasts who believe that the best cup is the one you can consistently reproduce.
            </p>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              Because in the end, it's not just about coffee—it's about the pursuit of excellence, one shot at a time.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

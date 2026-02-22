import Link from "next/link";
import { AppRoutes } from "@/app/routes";

const SECTIONS = [
  { id: "Bean", label: "Bean" },
  { id: "Grinder", label: "Grinder" },
  { id: "Machine", label: "Machine" },
  { id: "Recipe", label: "Recipe" },
  { id: "Results", label: "Results" },
] as const;

export default function ShotLogBlogPage() {
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

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-28">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              On this page
            </p>
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
            Shot Log Guide
          </h1>
          <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
            Everything you need to know about logging espresso shots with Coffee
            Tracker. This guide walks through each section of the shot form to
            help you capture the data that matters most.
          </p>

          <div className="mt-12 space-y-16">
            {/* Bean */}
            <section id="Bean">
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                ☕ Bean
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
                Select the coffee beans you're using for this shot. The bean
                selection is the foundation of every shot log — knowing which
                coffee you used lets you compare results across different beans
                and track how a specific roast evolves over time.
              </p>
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-900">
                <h3 className="font-semibold text-stone-800 dark:text-stone-200">
                  Tips
                </h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-stone-600 dark:text-stone-400">
                  <li>
                    Add the roaster name and roast date when creating a new bean
                    for easy identification later.
                  </li>
                  <li>
                    Track &ldquo;days post roast&rdquo; to learn how your beans
                    taste as they age.
                  </li>
                  <li>
                    Use the search to quickly find previously added beans.
                  </li>
                </ul>
              </div>
            </section>

            {/* Grinder */}
            <section id="Grinder">
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                ⚙️ Grinder
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
                Choose the grinder you're using. The grind is arguably the most
                important variable in espresso — different grinders produce
                different particle distributions, and even the same numeric
                grind setting can mean very different things across models.
              </p>
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-900">
                <h3 className="font-semibold text-stone-800 dark:text-stone-200">
                  Tips
                </h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-stone-600 dark:text-stone-400">
                  <li>
                    Select &ldquo;Pre-ground&rdquo; if you're using
                    pre-ground coffee — the grind level field will be hidden
                    automatically.
                  </li>
                  <li>
                    Add multiple grinders if you switch between them to compare
                    results.
                  </li>
                  <li>
                    Grind level is a numeric setting on your grinder (e.g., 12
                    on a Niche Zero or 2.5 on a Comandante).
                  </li>
                </ul>
              </div>
            </section>

            {/* Machine */}
            <section id="Machine">
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                🔧 Machine
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
                Select your espresso machine. Different machines have different
                boiler types, pressure profiles, and temperature stability — all
                of which affect extraction. Tracking the machine helps you
                understand results in context.
              </p>
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-900">
                <h3 className="font-semibold text-stone-800 dark:text-stone-200">
                  Tips
                </h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-stone-600 dark:text-stone-400">
                  <li>
                    This field is optional — useful if you always use the same
                    machine, but important if you have access to multiple.
                  </li>
                  <li>
                    Add a new machine any time from the dropdown.
                  </li>
                </ul>
              </div>
            </section>

            {/* Recipe */}
            <section id="Recipe">
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                📝 Recipe
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
                The recipe defines your input parameters — the variables you
                control before and during the shot. Getting the recipe right is
                the key to reproducible espresso.
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                    Dose
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The weight of ground coffee in grams (typically 16–22g for
                    espresso). Use the quick-select buttons for common doses or
                    dial in an exact value with the stepper.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                    Target Yield
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The target weight of liquid espresso in your cup, in grams.
                    The ratio buttons (1:1, 1:2, 1:3, 1:4) auto-calculate yield
                    from your dose. A 1:2 ratio (e.g., 18g in → 36g out) is a
                    common starting point.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                    Brew Temperature
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The water temperature for brewing, shown in °F or °C. Use
                    the quick-select buttons to switch units. Higher temperatures
                    generally extract more, while lower temperatures can
                    highlight delicate flavors.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                    Pre-infusion & Pressure
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Pre-infusion is a low-pressure soak before full extraction,
                    measured in seconds. Brew pressure is the extraction pressure
                    in bars (typically 6–12 bar). Both fields are hidden by
                    default — enable them from the recipe menu if your machine
                    supports these features.
                  </p>
                </div>
              </div>
            </section>

            {/* Results */}
            <section id="Results">
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                📊 Results
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
                Results capture what actually happened during the shot — the
                measurable outcomes and your subjective evaluation.
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                    Actual Yield & Brew Time
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The actual weight of espresso produced and how long the shot
                    took. The calculated ratio and flow rate are shown
                    automatically based on these values. Use the built-in timer
                    to track brew time hands-free.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                    Rating & Quality
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Rate your shot from 1–5 and optionally describe the overall
                    shot quality (e.g., balanced, sour, bitter). The star rating
                    helps you quickly spot your best shots in the history.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                    Flavors, Body & Adjectives
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Use the SCA-inspired flavor wheel to tag specific tasting
                    notes (chocolate, citrus, floral, etc.). The body selector
                    captures mouthfeel, and adjectives let you describe
                    intensifiers like &ldquo;bright&rdquo; or
                    &ldquo;heavy.&rdquo; These fields are hidden by default —
                    enable them from the results menu.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl bg-amber-50 p-8 dark:bg-amber-900/20">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              Ready to Log Your First Shot?
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              Start tracking your espresso journey and watch your shots improve
              over time with data-driven insights.
            </p>
            <Link
              href={AppRoutes.log.path}
              className="mt-6 inline-block rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
            >
              Log a Shot →
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

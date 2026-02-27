import Link from "next/link";
import { PlusIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { AppRoutes } from "@/app/routes";

const SECTIONS = [
  { id: "Setup", label: "Setup" },
  { id: "Recipe", label: "Recipe" },
  { id: "Results", label: "Results" },
  { id: "Tasting-Notes", label: "Tasting Notes" },
] as const;

function HiddenFieldIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <PlusIcon className={`${className} font-bold`} strokeWidth={2.5} />
  );
}

function HiddenFieldLink({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <a
      href="#hidden-fields-note"
      className="text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
      aria-label="This field is hidden by default and can be enabled"
    >
      <HiddenFieldIcon className={className} />
    </a>
  );
}

function GlossaryLink({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`${AppRoutes.resources.glossary.path}#${slug}`}
      className="font-medium text-amber-600 underline transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
    >
      {children}
    </Link>
  );
}

export default function ShotLogResourcePage() {
  return (
    <div className="relative">
      <div className="absolute top-4 right-4 sm:right-6 lg:right-8">
        <Link
          href={AppRoutes.resources.path}
          className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        >
          ← Resources
        </Link>
      </div>
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

          {/* Hidden Fields Note */}
          <div id="hidden-fields-note" className="scroll-mt-24 mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Hidden Fields
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                  Some fields are hidden by default to keep the form clean. You can enable them from the section menu (three-dot icon) in each section. Fields that can be enabled are marked with a{" "}
                  <HiddenFieldIcon className="inline h-4 w-4 align-text-bottom" /> icon next to their name.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-20">
            {/* Setup */}
            <section id="Setup" className="scroll-mt-24">
              <h2 className="mb-8 border-b-2 border-stone-200 pb-4 text-3xl font-bold text-stone-900 dark:border-stone-700 dark:text-stone-100">
                Setup
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
                Configure your equipment and beans before pulling the shot. These
                selections form the foundation of every shot log and help you
                understand results in context.
              </p>

              <div className="mt-8 space-y-8">
                <div>
                  <h3 id="bean" className="scroll-mt-24 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Bean
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Select the coffee beans you're using for this shot. The bean
                    selection is the foundation of every shot log — knowing which
                    coffee you used lets you compare results across different beans
                    and track how a specific roast evolves over time.
                  </p>
                  <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      💡 Tips
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-600 dark:text-stone-400">
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
                </div>

                <div>
                  <h3 id="grinder" className="scroll-mt-24 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Grinder
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Choose the grinder you're using. The grind is arguably the most
                    important variable in espresso — different grinders produce
                    different particle distributions, and even the same numeric
                    grind setting can mean very different things across models.
                  </p>
                  <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      💡 Tips
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-600 dark:text-stone-400">
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
                </div>

                <div>
                  <h3 id="machine" className="scroll-mt-24 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Machine
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Select your espresso machine. Different machines have different
                    boiler types, pressure profiles, and temperature stability — all
                    of which affect extraction. Tracking the machine helps you
                    understand results in context.
                  </p>
                  <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      💡 Tips
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-600 dark:text-stone-400">
                      <li>
                        This field is optional — useful if you always use the same
                        machine, but important if you have access to multiple.
                      </li>
                      <li>
                        Add a new machine any time from the dropdown.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Recipe */}
            <section id="Recipe" className="scroll-mt-24">
              <h2 className="mb-8 border-b-2 border-stone-200 pb-4 text-3xl font-bold text-stone-900 dark:border-stone-700 dark:text-stone-100">
                Recipe
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
                The recipe defines your input parameters — the variables you
                control before and during the shot. Getting the recipe right is
                the key to reproducible espresso.
              </p>

              <div className="mt-8 space-y-8">
                <div>
                  <h3 id="dose" className="scroll-mt-24 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Dose
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The weight of ground coffee in grams (typically 16–22g for
                    espresso). Use the quick-select buttons for common doses or
                    dial in an exact value with the stepper. Learn more about{" "}
                    <GlossaryLink slug="dose">dose</GlossaryLink> in the glossary.
                  </p>
                </div>
                <div>
                  <h3 id="target-yield" className="scroll-mt-24 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Target Yield
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The target weight of liquid espresso in your cup, in grams.
                    The ratio buttons (1:1, 1:2, 1:3, 1:4) auto-calculate yield
                    from your dose. A 1:2 ratio (e.g., 18g in → 36g out) is a
                    common starting point. Lower ratios like 1:1 are called{" "}
                    <GlossaryLink slug="ristretto">ristretto</GlossaryLink> (syrupy and intense),
                    while higher ratios like 1:3–1:4 are called{" "}
                    <GlossaryLink slug="lungo">lungo</GlossaryLink> (thinner but can reveal different flavors).
                    Learn more about <GlossaryLink slug="brew-ratio">brew ratios</GlossaryLink> in the glossary.
                  </p>
                </div>
                <div>
                  <h3 id="grind-level" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Grind Level
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The numeric grind setting on your grinder. The grind level is
                    specific to each grinder model and helps you dial in your shots.
                  </p>
                </div>
                <div>
                  <h3 id="brew-temperature" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Brew Temperature
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The water temperature for brewing, shown in °F or °C. Use
                    the quick-select buttons to switch units. Higher temperatures
                    generally extract more, while lower temperatures can
                    highlight delicate flavors. Learn more about{" "}
                    <GlossaryLink slug="brew-temperature">brew temperature</GlossaryLink> in the glossary.
                  </p>
                  <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      💡 Common Starting Point
                    </p>
                    <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                      <strong>200–205°F (93–96°C)</strong> is a good starting point for most coffees. This range provides balanced extraction and works well across different roast levels.
                    </p>
                  </div>
                  <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      🌡️ Example Temperatures
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-600 dark:text-stone-400">
                      <li>
                        <strong>195–200°F (90–93°C):</strong> Lower temperatures highlight delicate, bright flavors and reduce bitterness. Ideal for light roasts or when you want to preserve fruity, floral notes.
                      </li>
                      <li>
                        <strong>200–205°F (93–96°C):</strong> The standard range for balanced extraction. A reliable starting point that works for most coffees and roast levels.
                      </li>
                      <li>
                        <strong>205–212°F (96–100°C):</strong> Higher temperatures increase extraction and enhance body. Useful for dark roasts, under-extracted shots, or when you want more intensity and richness.
                      </li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 id="brew-pressure" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Brew Pressure
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The extraction pressure in bars (typically 6–12 bar). Enable
                    this field if your machine supports pressure control. Learn more about{" "}
                    <GlossaryLink slug="pressure">pressure</GlossaryLink> in the glossary.
                  </p>
                </div>
                <div>
                  <h3 id="pre-infusion" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Pre-infusion
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    A low-pressure soak before full extraction, measured in seconds.
                    Enable this field if your machine supports pre-infusion. Learn more about{" "}
                    <GlossaryLink slug="pre-infusion">pre-infusion</GlossaryLink> in the glossary.
                  </p>
                </div>
                <div>
                  <h3 id="tools-used" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Tools Used
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Select any tools you used during preparation (e.g., WDT tool,
                    distribution tool, leveler).
                  </p>
                </div>
              </div>
            </section>

            {/* Results */}
            <section id="Results" className="scroll-mt-24">
              <h2 className="mb-8 border-b-2 border-stone-200 pb-4 text-3xl font-bold text-stone-900 dark:border-stone-700 dark:text-stone-100">
                Results
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
                Results capture the measurable outcomes of your shot — what
                actually happened during extraction. These objective measurements
                help you understand the technical performance of your shot.
              </p>

              <div className="mt-8 space-y-8">
                <div>
                  <h3 id="actual-yield" className="scroll-mt-24 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Actual Yield
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The actual weight of espresso produced in grams. The
                    calculated ratio (e.g., 1:2) is shown automatically based on
                    your dose and actual yield. Use the quick button to copy your
                    target yield if it matches. Learn more about{" "}
                    <GlossaryLink slug="yield">yield</GlossaryLink> in the glossary.
                  </p>
                </div>
                <div>
                  <h3 id="brew-time" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Brew Time
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    How long the shot took from start to finish, in seconds. The
                    calculated flow rate (g/s) is shown automatically. Use the
                    built-in timer to track brew time hands-free.
                  </p>
                </div>
                <div>
                  <h3 id="est-max-pressure" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Est. Max Pressure
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    The estimated maximum pressure reached during extraction, in
                    bars. Enable this field if you want to track pressure profiles.
                  </p>
                </div>
                <div>
                  <h3 id="shot-quality" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Shot Quality
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Rate the technical quality of the extraction from 1–5. This
                    measures extraction evenness, not taste. Enable this field to track
                    extraction quality separately from taste.
                  </p>
                  <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-6 dark:border-stone-700 dark:bg-stone-900">
                    <h4 className="mb-3 text-lg font-semibold text-stone-800 dark:text-stone-200">
                      Understanding Shot Quality
                    </h4>
                    <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
                      Shot quality ratings help you assess <GlossaryLink slug="extraction">extraction</GlossaryLink> evenness:
                    </p>
                    <div className="mb-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                        <img
                          src="/images/shot-quality/poor_extraction.png"
                          alt="Poor extraction showing severe channeling and spraying"
                          className="mb-3 max-h-48 w-full rounded object-cover"
                        />
                        <p className="mb-1 text-sm font-semibold text-stone-800 dark:text-stone-200">
                          1-2: Poor — Severe <GlossaryLink slug="channeling">Channeling</GlossaryLink>
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-400">
                          This image demonstrates a failed extraction. Notice the severe <GlossaryLink slug="channeling">channeling</GlossaryLink> and spraying, with multiple thin, uneven streams of coffee. The flow is turbulent and messy, and a proper crema has failed to form, indicating a lack of pressure and even extraction.
                        </p>
                      </div>
                      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                        <img
                          src="/images/shot-quality/moderate_extraction.png"
                          alt="Moderate extraction showing some channeling"
                          className="mb-3 max-h-48 w-full rounded object-cover"
                        />
                        <p className="mb-1 text-sm font-semibold text-stone-800 dark:text-stone-200">
                          3: Moderate — Some <GlossaryLink slug="channeling">Channeling</GlossaryLink>
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-400">
                          This shot shows a moderate level of quality. While it&apos;s a significant improvement over the poor shot, there are still visible signs of <GlossaryLink slug="channeling">channeling</GlossaryLink> and unevenness. The flow is not a single, consistent stream, and the crema is thin and patchy, indicating partial extraction issues.
                        </p>
                      </div>
                      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                        <img
                          src="/images/shot-quality/excellent_extraction.png"
                          alt="Excellent extraction showing even flow and rich crema"
                          className="mb-3 max-h-48 w-full rounded object-cover"
                        />
                        <p className="mb-1 text-sm font-semibold text-stone-800 dark:text-stone-200">
                          4-5: Excellent — Good to Excellent Even Extraction
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-400">
                          This image depicts an excellent espresso shot. There is no visible <GlossaryLink slug="channeling">channeling</GlossaryLink>. The flow is a single, consistent, honey-like stream, and a thick, rich, uniform crema with a beautiful reddish-brown hue has formed on top, indicating a perfect and even <GlossaryLink slug="extraction">extraction</GlossaryLink>.
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                      For detailed guidance on understanding espresso extraction quality, channeling, and what makes a good shot, see these resources:{" "}
                      <a
                        href="https://craftcoffeespot.com/espresso/espresso-channeling/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-amber-600 underline transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        Craft Coffee Spot
                      </a>
                      {", "}
                      <a
                        href="https://coffeemachinetools.com/7-proven-ways-to-eliminate-channeling-in-espresso-extraction/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-amber-600 underline transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        Coffee Machine Tools
                      </a>
                      {", "}
                      <a
                        href="https://mycoffeeexplorer.com/blog/espresso-channeling-explained"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-amber-600 underline transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        My Coffee Explorer
                      </a>
                      {", and "}
                      <a
                        href="https://www.beanground.com/espresso-channeling/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-amber-600 underline transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        Bean Ground
                      </a>
                      {" "}which explain how to identify, diagnose, and fix channeling issues that affect shot quality.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Tasting Notes */}
            <section id="Tasting-Notes" className="scroll-mt-24">
              <h2 className="mb-8 border-b-2 border-stone-200 pb-4 text-3xl font-bold text-stone-900 dark:border-stone-700 dark:text-stone-100">
                Tasting Notes
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
                Tasting notes capture your subjective experience of the shot —
                what it tastes like, how it feels, and your overall enjoyment.
                These fields help you develop your palate and identify what you
                like.
              </p>

              <div className="mt-8 space-y-8">
                <div>
                  <h3 id="flavors" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Flavors
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Use the SCA-inspired flavor wheel to tag specific tasting
                    notes (chocolate, citrus, floral, etc.). Navigate through
                    categories to find the flavors you detect.
                  </p>
                </div>
                <div>
                  <h3 id="body-texture" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Body / Texture
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Capture the mouthfeel and texture of the shot (e.g., creamy,
                    thin, syrupy, velvety). Learn more about{" "}
                    <GlossaryLink slug="body">body</GlossaryLink> in the glossary.
                  </p>
                </div>
                <div>
                  <h3 id="adjectives-intensifiers" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Adjectives & Intensifiers
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Describe intensifiers like &ldquo;bright,&rdquo;
                    &ldquo;heavy,&rdquo; &ldquo;balanced,&rdquo; or
                    &ldquo;complex.&rdquo;
                  </p>
                </div>
                <div>
                  <h3 id="rating" className="scroll-mt-24 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Rating
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Rate your overall enjoyment of the shot from 1–5 (Undrinkable, Didn't Enjoy, Enjoyed, Really Enjoyed, Loved It). This is
                    your subjective rating of how much you liked it, separate
                    from technical quality. The rating helps you quickly
                    spot your best shots in the history.
                  </p>
                </div>
                <div>
                  <h3 id="bitter" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Bitter
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Rate the bitterness of the shot on a 1–5 scale. The slider uses a colored dot that transitions from neutral gray (1) to dark brown (5), providing visual feedback that matches the taste characteristic. Use this to track bitterness levels across different shots and recipes.
                  </p>
                  <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      📊 Scale Guide
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-600 dark:text-stone-400">
                      <li><strong>1:</strong> Not bitter</li>
                      <li><strong>2:</strong> Slightly bitter</li>
                      <li><strong>3:</strong> Moderately bitter</li>
                      <li><strong>4:</strong> Very bitter</li>
                      <li><strong>5:</strong> Extremely bitter</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 id="sour" className="scroll-mt-24 flex items-center gap-2 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Sour
                    <HiddenFieldLink />
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Rate the sourness (acidity) of the shot on a 1–5 scale. The slider uses a colored dot that transitions from neutral gray (1) to bright yellow (5), providing visual feedback that matches the taste characteristic. Use this to track acidity levels and understand how different recipes affect sourness.
                  </p>
                  <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      📊 Scale Guide
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-600 dark:text-stone-400">
                      <li><strong>1:</strong> Not sour</li>
                      <li><strong>2:</strong> Slightly sour</li>
                      <li><strong>3:</strong> Moderately sour</li>
                      <li><strong>4:</strong> Very sour</li>
                      <li><strong>5:</strong> Extremely sour</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 id="notes" className="scroll-mt-24 text-xl font-semibold text-stone-800 dark:text-stone-200">
                    Notes
                  </h3>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Any additional observations, thoughts, or context about the
                    shot. Use this for free-form notes that don&apos;t fit into
                    the structured fields above.
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

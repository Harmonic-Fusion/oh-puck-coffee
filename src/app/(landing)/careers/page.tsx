import Link from "next/link";
import { AppRoutes } from "@/app/routes";

export default function CareersPage() {
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
          Careers
        </h1>
        
        <div className="mt-12 space-y-12">
          {/* Opening */}
          <section>
            <p className="text-lg leading-8 text-stone-600 dark:text-stone-400">
              Ya, of course you want to work with us but no jobs listed.
            </p>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              We're a small, passionate team building tools for coffee enthusiasts. Right now, we're focused on making Coffee Tracker the best it can be, but we're always open to connecting with talented people who share our love for great coffee and great code.
            </p>
          </section>

          {/* What We're Looking For */}
          <section>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              What We're Looking For
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              We're not actively hiring right now, but we're always interested in hearing from people who:
            </p>
            <ul className="mt-6 space-y-3 text-lg leading-8 text-stone-600 dark:text-stone-400">
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span>Love both coffee and code (or at least one of them passionately)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span>Get excited about TypeScript, Next.js, and PostgreSQL</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span>Believe in the power of data to improve experiences</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span>Care about building products that people actually use and love</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span>Want to work on something that matters to a passionate community</span>
              </li>
            </ul>
          </section>

          {/* Our Culture */}
          <section>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              Our Culture
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              We're a remote-first team that values:
            </p>
            <ul className="mt-6 space-y-3 text-lg leading-8 text-stone-600 dark:text-stone-400">
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span><strong className="text-stone-900 dark:text-stone-100">Autonomy</strong> — We trust you to do great work and manage your time</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span><strong className="text-stone-900 dark:text-stone-100">Quality</strong> — We ship code we're proud of, not code that "works"</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span><strong className="text-stone-900 dark:text-stone-100">Learning</strong> — We're always experimenting with new approaches and technologies</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span><strong className="text-stone-900 dark:text-stone-100">Coffee</strong> — Obviously. We take our espresso seriously</span>
              </li>
            </ul>
          </section>

          {/* What We're Building */}
          <section>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              What We're Building
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              Coffee Tracker is more than just a shot logging app—it's a platform for discovery. We're building features that help people understand their coffee better, from flavor profiling to statistical analysis to integrations with smart equipment.
            </p>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              Every feature we ship is used by real people who care deeply about their coffee. There's something special about building tools for a community that's as passionate as you are.
            </p>
          </section>

          {/* How to Stay in Touch */}
          <section>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              How to Stay in Touch
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              While we don't have open positions right now, we'd love to hear from you. Send us a message through our <Link href={AppRoutes.contact.path} className="text-amber-700 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400 underline">contact form</Link> and let us know:
            </p>
            <ul className="mt-6 space-y-3 text-lg leading-8 text-stone-600 dark:text-stone-400">
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span>What you're passionate about (coffee, code, or both)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span>What you'd love to work on</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-amber-600 dark:text-amber-500">▸</span>
                <span>Your favorite espresso recipe (we're genuinely curious)</span>
              </li>
            </ul>
            <p className="mt-6 text-lg leading-8 text-stone-600 dark:text-stone-400">
              We'll keep your info on file and reach out when we're ready to grow the team. In the meantime, keep pulling great shots and writing great code.
            </p>
          </section>

          {/* Call to Action */}
          <section className="rounded-2xl bg-amber-50 p-8 dark:bg-amber-900/20">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              Ready to Join Us?
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
              Even though we're not hiring right now, we're always excited to connect with people who share our passion. Drop us a line and let's chat about coffee, code, and the future of Coffee Tracker.
            </p>
            <div className="mt-6">
              <Link
                href={AppRoutes.contact.path}
                className="inline-block rounded-lg bg-amber-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
              >
                Get in Touch
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

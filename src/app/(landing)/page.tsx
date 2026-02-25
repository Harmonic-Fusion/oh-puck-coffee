import { auth } from "@/auth";
import { AppRoutes } from "@/app/routes";
import { SignInButton } from "@/components/auth/SignInButton";
import { Button } from "@/components/common/Button";
import Link from "next/link";

export default async function LandingPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-6xl lg:text-7xl">
              Track Your Espresso Shots
              <span className="block text-amber-700 dark:text-amber-500">
                Dial In Perfection
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-stone-600 dark:text-stone-400 sm:text-xl">
              Log every shot, track your progress, and discover the perfect recipe for your favorite beans. 
              Transform your coffee journey with data-driven insights.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {user ? (
                <Link
                  href={AppRoutes.log.path}
                  className="inline-flex items-center justify-center rounded-lg bg-amber-700 px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-amber-800"
                >
                  Go to App →
                </Link>
              ) : (
                <SignInButton />
              )}
              <Link href="#features">
                <Button variant="secondary" size="lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
              Everything You Need to Perfect Your Shot
            </h2>
            <p className="mt-2 text-lg leading-8 text-stone-600 dark:text-stone-400">
              Comprehensive tracking tools designed for coffee enthusiasts and professionals.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-stone-900 dark:text-stone-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                  Detailed Shot Logging
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-stone-600 dark:text-stone-400">
                  <p className="flex-auto">
                    Record dose, yield, grind size, temperature, pressure, and more. 
                    Capture every detail that matters for perfect espresso.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-stone-900 dark:text-stone-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  Visual Analytics
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-stone-600 dark:text-stone-400">
                  <p className="flex-auto">
                    Track your progress with beautiful charts and statistics. 
                    Identify trends, compare beans, and optimize your technique.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-stone-900 dark:text-stone-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                  </div>
                  Flavor Profiling
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-stone-600 dark:text-stone-400">
                  <p className="flex-auto">
                    Use the interactive flavor wheel to document taste notes. 
                    Build a comprehensive profile of each bean and shot.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-stone-900 dark:text-stone-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  </div>
                  Bean Management
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-stone-600 dark:text-stone-400">
                  <p className="flex-auto">
                    Organize your coffee collection. Track roast dates, origins, 
                    and tasting notes for every bean in your inventory.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-stone-900 dark:text-stone-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  Equipment Tracking
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-stone-600 dark:text-stone-400">
                  <p className="flex-auto">
                    Manage your grinders, machines, and tools. 
                    Understand how different equipment affects your results.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-stone-900 dark:text-stone-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.645-5.963-1.8A8.967 8.967 0 016 18.72m3 0a5.971 5.971 0 014.93-5.94 5.971 5.971 0 00-4.93 5.94m3 0v-.372c0-.496.033-.985.095-1.465a5.971 5.971 0 00-4.93-5.94 5.971 5.971 0 014.93 5.94v.372m0 0v.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.645-5.963-1.8A8.967 8.967 0 016 18.72v-.031m6 0v-.031c0 .225-.012.447-.037.666a11.944 11.944 0 01-2.07-.666 5.971 5.971 0 004.93-5.94v-.372m0 0v-.031c0-.225.012-.447.037-.666a5.971 5.971 0 00-4.93-5.94v.372m0 0v.031c0 .225.012.447.037.666a5.971 5.971 0 004.93 5.94v.372" />
                    </svg>
                  </div>
                  Google Sheets Integration
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-stone-600 dark:text-stone-400">
                  <p className="flex-auto">
                    Sync your data to Google Sheets for advanced analysis. 
                    Export and share your coffee journey with ease.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-amber-700 dark:bg-amber-800">
        <div className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to perfect your espresso?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-amber-100">
              Start tracking your shots today and join a community of coffee enthusiasts 
              who are dialing in perfection, one shot at a time.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {user ? (
                <Link
                  href={AppRoutes.log.path}
                  className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-base font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-50"
                >
                  Log a Shot →
                </Link>
              ) : (
                <SignInButton />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-stone-950" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8">
              <div className="flex items-center gap-2">
                <img
                  src="/logos/logo_complex.png"
                  alt="Coffee Tracker Logo"
                  className="h-8 w-8"
                />
                <span className="text-xl font-bold text-stone-900 dark:text-stone-100">
                  Coffee Tracker
                </span>
              </div>
              <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
                Track your espresso shots and dial in perfection. 
                Built for coffee enthusiasts who find wonder in every shot.
              </p>
              <div className="mt-6">
                <Link
                  href={AppRoutes.socialMedia.path}
                  className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                  aria-label="Instagram"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Instagram</span>
                </Link>
              </div>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 xl:col-span-2 xl:mt-0">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-stone-900 dark:text-stone-100">
                  Company
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={AppRoutes.company.path} className="text-sm leading-6 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href={AppRoutes.careers.path} className="text-sm leading-6 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link href={AppRoutes.contact.path} className="text-sm leading-6 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-stone-900/10 pt-8 dark:border-stone-100/10 sm:mt-20 lg:mt-24">
            <p className="text-xs leading-5 text-stone-500 dark:text-stone-400">
              &copy; {new Date().getFullYear()} Coffee Tracker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

import { auth } from "@/auth";
import { AppRoutes } from "@/app/routes";
import { SignInButton } from "@/components/auth/SignInButton";
import { UserDropdown } from "@/components/landing/UserDropdown";
import Link from "next/link";

export async function LandingNav() {
  const session = await auth();
  const user = session?.user;

  return (
    <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/80">
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
          <div className="flex items-center gap-4">
            <Link
              href={AppRoutes.resources.path}
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            >
              Resources
            </Link>
            {user ? (
              <UserDropdown userName={user.name} userImage={user.image} />
            ) : (
              <SignInButton />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

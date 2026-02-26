import Link from "next/link";
import { AppRoutes } from "@/app/routes";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-lg dark:border-stone-700 dark:bg-stone-900">
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl">☕</span>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
            Coffee Tracker
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Track your espresso shots and dial in perfection
          </p>
        </div>
        <GoogleSignInButton callbackUrl={callbackUrl} />
      </div>
      <Link
        href={AppRoutes.home.path}
        className="text-sm text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        ← Back to Home
      </Link>
    </div>
  );
}

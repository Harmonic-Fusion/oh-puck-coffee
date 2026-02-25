import Link from "next/link";
import { AppRoutes } from "@/app/routes";

type SignInButtonProps = {
  callbackUrl?: string;
};

export function SignInButton({ callbackUrl }: SignInButtonProps) {
  const loginHref = callbackUrl
    ? `${AppRoutes.login.path}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : AppRoutes.login.path;

  return (
    <Link
      href={loginHref}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
    >
      Sign In
    </Link>
  );
}

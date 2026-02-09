import { SignInButton } from "@/components/auth/SignInButton";

export default function LoginPage() {
  return (
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
      <SignInButton />
    </div>
  );
}

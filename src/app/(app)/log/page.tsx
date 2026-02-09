import { ShotForm } from "@/components/shots/form/ShotForm";

export default function LogPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Log a Shot
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Record your espresso shot details and tasting notes
        </p>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <ShotForm />
      </div>
    </div>
  );
}

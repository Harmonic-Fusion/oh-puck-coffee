export function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">
        {value}
      </p>
    </div>
  );
}

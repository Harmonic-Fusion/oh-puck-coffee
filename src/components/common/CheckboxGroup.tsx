"use client";

interface CheckboxGroupProps {
  label?: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  columns?: number;
}

export function CheckboxGroup({
  label,
  options,
  value,
  onChange,
  error,
  columns = 2,
}: CheckboxGroupProps) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
          {label}
        </span>
      )}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <input
              type="checkbox"
              checked={value.includes(option)}
              onChange={() => toggle(option)}
              className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-stone-700 dark:text-stone-300">{option}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

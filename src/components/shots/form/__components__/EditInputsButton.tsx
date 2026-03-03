interface EditInputsButtonProps {
  onClick: () => void;
}

export function EditInputsButton({ onClick }: EditInputsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-stone-200 py-2 text-sm text-stone-500 transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800/50 dark:hover:text-stone-300"
    >
      Edit inputs
    </button>
  );
}

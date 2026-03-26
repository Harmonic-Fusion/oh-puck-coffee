export interface ReorderableStepConfig<TId extends string> {
  id: TId;
  label: string;
  description?: string;
  visible: boolean;
  required?: true;
}

export function getRequiredStepIds<TId extends string>(
  steps: ReadonlyArray<{ id: TId; required?: true }>,
): TId[] {
  return steps.filter((step) => step.required).map((step) => step.id);
}

"use client";

import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";

interface OrderItem {
  id: string;
  label: string;
  description?: string;
}

interface CategoryConfig<TId extends string> {
  id: string;
  title: string;
  items: { id: TId; label: string; description?: string }[];
  order: TId[];
  visibility: Record<TId, boolean>;
  defaultOrder: TId[];
  defaultVisibility: Record<TId, boolean>;
  requiredFields: TId[];
  onChange: (order: TId[], visibility: Record<TId, boolean>) => void;
  onReset: () => void;
}

interface EditInputsModalProps {
  open: boolean;
  onClose: () => void;
  initialCategory?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: CategoryConfig<any>[];
}

function SortableOrderItem({
  id,
  label,
  description,
  isVisible,
  onToggleVisibility,
  isRequired = false,
}: {
  id: string;
  label: string;
  description?: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  isRequired?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
        isDragging
          ? "border-amber-500 bg-amber-50 shadow-lg opacity-75 dark:border-amber-400 dark:bg-amber-900/20"
          : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing select-none flex-shrink-0 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </div>
      <label
        className={`flex flex-1 items-center gap-2 ${
          isRequired ? "" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={isVisible}
          onChange={onToggleVisibility}
          disabled={isRequired}
          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-stone-600"
        />
        <span className={`flex-1 min-w-0 ${isRequired ? "opacity-75" : ""}`}>
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-medium text-stone-800 dark:text-stone-200 shrink-0">
              {label}
            </span>
            {description && (
              <span
                title={description}
                className="text-xs text-stone-400 dark:text-stone-500 truncate min-w-0"
              >
                {description}
              </span>
            )}
            {isRequired && (
              <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">
                (required)
              </span>
            )}
          </span>
        </span>
      </label>
    </div>
  );
}

export function EditInputsModal({
  open,
  onClose,
  initialCategory,
  categories,
}: EditInputsModalProps) {
  const [localStates, setLocalStates] = useState<
    Record<
      string,
      { order: string[]; visibility: Record<string, boolean> }
    >
  >({});
  const [prevOpen, setPrevOpen] = useState(open);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sync local state when modal opens
  if (open && !prevOpen) {
    setPrevOpen(true);
    const initialStates: typeof localStates = {};
    categories.forEach((cat) => {
      initialStates[cat.id] = {
        order: cat.order,
        visibility: cat.visibility,
      };
    });
    setLocalStates(initialStates);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Scroll to initial category when modal opens
  useEffect(() => {
    if (open && initialCategory && categoryRefs.current[initialCategory]) {
      // Use a small timeout to ensure the modal content is rendered and scrollable
      const timeoutId = setTimeout(() => {
        categoryRefs.current[initialCategory]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [open, initialCategory]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (categoryId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalStates((prev) => {
      const catState = prev[categoryId];
      if (!catState) return prev;

      const oldIndex = catState.order.indexOf(active.id.toString());
      const newIndex = catState.order.indexOf(over.id.toString());

      return {
        ...prev,
        [categoryId]: {
          ...catState,
          order: arrayMove(catState.order, oldIndex, newIndex),
        },
      };
    });
  };

  const toggleVisibility = (categoryId: string, itemId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category?.requiredFields.includes(itemId)) return;

    setLocalStates((prev) => {
      const catState = prev[categoryId];
      if (!catState) return prev;

      return {
        ...prev,
        [categoryId]: {
          ...catState,
          visibility: {
            ...catState.visibility,
            [itemId]: !catState.visibility[itemId],
          },
        },
      };
    });
  };

  const handleSave = () => {
    categories.forEach((cat) => {
      const state = localStates[cat.id];
      if (state) {
        // Ensure required fields are visible
        const finalVisibility = { ...state.visibility };
        cat.requiredFields.forEach((id) => {
          finalVisibility[id] = true;
        });
        cat.onChange(state.order, finalVisibility);
      }
    });
    onClose();
  };

  const handleReset = () => {
    const resetStates: typeof localStates = {};
    categories.forEach((cat) => {
      resetStates[cat.id] = {
        order: cat.defaultOrder,
        visibility: cat.defaultVisibility,
      };
      cat.onReset();
    });
    setLocalStates(resetStates);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Inputs"
      footer={
        <div className="flex justify-between w-full">
          <Button type="button" variant="ghost" onClick={handleReset}>
            Reset All
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      }
    >
      <div
        ref={scrollContainerRef}
        className="max-h-[60vh] overflow-y-auto pr-2 -mr-2 space-y-8"
      >
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Drag items to reorder and toggle visibility for each section.
        </p>

        {categories.map((category) => {
          const state = localStates[category.id];
          if (!state) return null;

          const orderedItems = state.order
            .map((id) => category.items.find((item) => item.id === id))
            .filter((item): item is OrderItem => item !== undefined);

          return (
            <div
              key={category.id}
              ref={(el) => { categoryRefs.current[category.id] = el; }}
              className="space-y-4 scroll-mt-4"
            >
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 border-b border-stone-100 dark:border-stone-800 pb-2">
                {category.title}
              </h3>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(category.id, event)}
              >
                <SortableContext
                  items={state.order}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {orderedItems.map((item) => (
                      <SortableOrderItem
                        key={item.id}
                        id={item.id}
                        label={item.label}
                        description={item.description}
                        isVisible={state.visibility[item.id] ?? false}
                        onToggleVisibility={() =>
                          toggleVisibility(category.id, item.id)
                        }
                        isRequired={category.requiredFields.includes(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

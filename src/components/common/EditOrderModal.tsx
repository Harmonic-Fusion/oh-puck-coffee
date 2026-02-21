"use client";

import { useState, useEffect } from "react";
// EditOrderModal - reusable drag-and-drop order modal component
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
}

interface EditOrderModalProps<T extends OrderItem, TId extends string = string> {
  open: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  order: TId[];
  visibility: Record<TId, boolean>;
  defaultOrder: TId[];
  defaultVisibility: Record<TId, boolean>;
  onChange: (order: TId[], visibility: Record<TId, boolean>) => void;
  onReset: () => void;
}

/**
 * Individual sortable item in the Edit Order modal
 */
function SortableOrderItem({
  item,
  isVisible,
  onToggleVisibility,
}: {
  item: OrderItem;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

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
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </div>
      <label className="flex flex-1 items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isVisible}
          onChange={onToggleVisibility}
          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-600"
        />
        <span className="flex-1 text-sm font-medium text-stone-800 dark:text-stone-200">
          {item.label}
        </span>
      </label>
    </div>
  );
}

/**
 * Reusable Edit Order modal component using dnd-kit for drag and drop
 * Used by both Recipe and Results sections
 */
export function EditOrderModal<T extends OrderItem, TId extends string = string>({
  open,
  onClose,
  title,
  items,
  order,
  visibility,
  defaultOrder,
  defaultVisibility,
  onChange,
  onReset,
}: EditOrderModalProps<T, TId>) {
  const [localOrder, setLocalOrder] = useState<TId[]>(order);
  const [localVisibility, setLocalVisibility] = useState<Record<TId, boolean>>(visibility);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync local state when modal opens or props change
  useEffect(() => {
    if (open) {
      setLocalOrder(order);
      setLocalVisibility(visibility);
    }
  }, [open, order, visibility]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id.toString() as TId;
    const overId = over.id.toString() as TId;

    if (activeId !== overId) {
      setLocalOrder((items) => {
        const oldIndex = items.indexOf(activeId);
        const newIndex = items.indexOf(overId);
        return arrayMove(items, oldIndex, newIndex) as TId[];
      });
    }
  };

  const toggleVisibility = (itemId: TId) => {
    setLocalVisibility((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSave = () => {
    onChange(localOrder, localVisibility);
    onClose();
  };

  const handleReset = () => {
    setLocalOrder(defaultOrder);
    setLocalVisibility(defaultVisibility);
    onReset();
  };

  // Get items in the current order
  const orderedItems = localOrder
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is T => item !== undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Drag items to reorder and show or hide items. Changes are saved automatically.
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localOrder}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {orderedItems.map((item) => (
                <SortableOrderItem
                  key={item.id}
                  item={item}
                  isVisible={localVisibility[item.id] ?? false}
                  onToggleVisibility={() => toggleVisibility(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </Modal>
  );
}

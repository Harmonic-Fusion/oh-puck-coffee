"use client";

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
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface BadgeItem {
  label: string;
  color: string;
  key?: string;
  className?: string;
}

interface SelectedBadgesProps {
  title: string;
  items: BadgeItem[];
  onClear?: () => void;
  allowOrdering?: boolean;
  onReorder?: (reorderedItems: BadgeItem[]) => void;
}

/**
 * Individual sortable badge item
 */
function SortableBadge({
  item,
  index,
}: {
  item: BadgeItem;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key ?? index.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: item.color }}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-stone-900 dark:text-stone-100 select-none cursor-grab active:cursor-grabbing ${item.className ?? ""}`}
      {...attributes}
      {...listeners}
    >
      <span>{item.label}</span>
    </div>
  );
}

/**
 * Reusable component for displaying selected items as badges
 * Used across flavor wheel, body selector, and adjectives selector
 */
export function SelectedBadges({
  title,
  items,
  onClear,
  allowOrdering,
  onReorder,
}: SelectedBadgesProps) {
  // Infer allowOrdering from onReorder if not explicitly provided
  const inferredAllowOrdering = allowOrdering ?? onReorder !== undefined;

  if (items.length === 0) {
    return null;
  }

  const showOrdering = inferredAllowOrdering && items.length > 1;

  // Configure sensors for drag and drop (pointer for mouse/touch, keyboard for accessibility)
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || !onReorder) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId !== overId) {
      const oldIndex = items.findIndex(
        (item, idx) => (item.key ?? idx.toString()) === activeId
      );
      const newIndex = items.findIndex(
        (item, idx) => (item.key ?? idx.toString()) === overId
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);
      }
    }
  }

  const itemIds = items.map((item, index) => item.key ?? index.toString());

  return (
    <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
          {title}
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {showOrdering ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itemIds}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex flex-wrap items-center gap-2">
              {items.map((item, index) => (
                <SortableBadge
                  key={item.key ?? index}
                  item={item}
                  index={index}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => (
            <div
              key={item.key ?? index}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-stone-900 dark:text-stone-100 ${item.className ?? ""}`}
              style={{ backgroundColor: item.color }}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

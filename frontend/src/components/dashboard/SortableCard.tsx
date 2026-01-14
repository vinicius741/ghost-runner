import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { DashboardCardId } from '@/types';

interface SortableCardProps {
  id: DashboardCardId;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SortableCard({ id, children, disabled = false }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? 'shadow-2xl scale-[1.02] z-50' : ''}`}
    >
      {/* Drag handle - visible on hover */}
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -top-3 -right-3 z-10 p-1.5 rounded-lg bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
}

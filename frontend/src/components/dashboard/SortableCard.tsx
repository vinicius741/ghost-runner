import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { DashboardCardId } from '@/types';
import { CardMinimizeButton } from './CardMinimizeButton';

interface SortableCardProps {
  id: DashboardCardId;
  children: React.ReactNode;
  disabled?: boolean;
  onMinimize?: () => void;
  title?: string;
}

export function SortableCard({ id, children, disabled = false, onMinimize, title }: SortableCardProps) {
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
      {/* Minimize button - visible on hover */}
      {onMinimize && (
        <CardMinimizeButton
          onMinimize={onMinimize}
          ariaLabel={`Minimize ${title || 'card'}`}
        />
      )}

      {/* Drag handle - visible on hover */}
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -top-3 -right-3 z-10 p-1.5 rounded-lg bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          type="button"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
}

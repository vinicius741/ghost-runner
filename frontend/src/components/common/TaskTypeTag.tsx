import type { TaskType } from '@shared/types';
import { cn } from '@/lib/utils';

const DOT: Record<TaskType, string> = {
  public: 'bg-success',
  private: 'bg-warning',
  root: 'bg-faint',
};

/** Quiet inline label: a coloured dot plus the lowercase type name. */
export function TaskTypeTag({ type, className }: { type: TaskType; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[type])} aria-hidden="true" />
      {type}
    </span>
  );
}

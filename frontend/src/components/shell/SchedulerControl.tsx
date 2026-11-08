import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNextTaskState } from '@/contexts/NextTaskContext';
import { formatCountdown } from '@/lib/schedule';
import { cn } from '@/lib/utils';

interface SchedulerControlProps {
  running: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** Scheduler state, next queued run, and the start/stop toggle. */
export function SchedulerControl({ running, onStart, onStop }: SchedulerControlProps) {
  const { nextTask, remainingMs } = useNextTaskState();

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Scheduler</span>
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', running ? 'text-success' : 'text-faint')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', running ? 'bg-success' : 'bg-faint')} aria-hidden="true" />
          {running ? 'Running' : 'Stopped'}
        </span>
      </div>

      <p className="mt-1.5 truncate text-xs text-faint">
        {!running ? (
          'Scheduled tasks are paused.'
        ) : nextTask && remainingMs !== null ? (
          <>
            <span className="text-foreground/90">{nextTask.task}</span>{' '}
            in <span className="font-mono tabular-nums">{formatCountdown(remainingMs)}</span>
          </>
        ) : (
          'Nothing queued.'
        )}
      </p>

      <Button
        variant="secondary"
        size="sm"
        className="mt-2.5 w-full"
        onClick={running ? onStop : onStart}
      >
        {running ? <Square className="!size-3" /> : <Play className="!size-3" />}
        {running ? 'Stop scheduler' : 'Start scheduler'}
      </Button>
    </div>
  );
}

/** Compact variant for the narrow-window top bar. */
export function SchedulerToggleCompact({ running, onStart, onStop, className }: SchedulerControlProps & { className?: string }) {
  const { nextTask, remainingMs } = useNextTaskState();

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs text-faint">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', running ? 'bg-success' : 'bg-faint')} aria-hidden="true" />
        <span className={running ? 'text-success' : undefined}>{running ? 'Running' : 'Stopped'}</span>
        {running && nextTask && remainingMs !== null && (
          <span className="hidden truncate sm:inline">
            · {nextTask.task} in <span className="font-mono tabular-nums">{formatCountdown(remainingMs)}</span>
          </span>
        )}
      </span>
      <Button variant="secondary" size="sm" onClick={running ? onStop : onStart}>
        {running ? 'Stop scheduler' : 'Start scheduler'}
      </Button>
    </div>
  );
}

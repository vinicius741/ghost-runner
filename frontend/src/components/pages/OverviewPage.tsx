import { useMemo, type ReactNode } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Circle } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useNextTaskState } from '@/contexts/NextTaskContext';
import { useNow } from '@/hooks/useNow';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LogsConsole } from '@/components/dashboard/LogsConsole';
import { LocationWarning } from '@/components/dashboard/LocationWarning';
import { describeSchedule, formatAgo, formatCountdown, getNextRun } from '@/lib/schedule';
import { getFailureType } from '@/lib/failureTypes';
import { cn } from '@/lib/utils';
import type { PageId } from '@/components/shell/navigation';

interface OverviewPageProps {
  onNavigate: (page: PageId) => void;
  onRecordTask: () => void;
}

function Stat({
  label,
  value,
  detail,
  action,
  onClick,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
  valueClassName?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {action}
      </div>
      <div className={cn('mt-2 text-2xl font-semibold tracking-[-0.02em] text-foreground tabular-nums', valueClassName)}>
        {value}
      </div>
      <div className="mt-1 truncate text-xs text-faint">{detail}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 rounded-lg border border-border bg-card p-4 text-left transition-colors duration-100 hover:border-border-strong hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {content}
      </button>
    );
  }
  return <div className="min-w-0 rounded-lg border border-border bg-card p-4">{content}</div>;
}

export function OverviewPage({ onNavigate, onRecordTask }: OverviewPageProps) {
  const {
    tasks,
    schedule,
    logs,
    failures,
    schedulerStatus,
    runningTasks,
    showLocationWarning,
    dismissLocationWarning,
    startScheduler,
    stopScheduler,
    clearLogs,
  } = useDashboard();
  const { nextTask, remainingMs } = useNextTaskState();
  const now = useNow(30_000);

  const upcoming = useMemo(() => {
    return schedule
      .map((item) => ({ item, next: getNextRun(item, now) }))
      .filter((row): row is { item: typeof row.item; next: Date } => row.next !== null)
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 6);
  }, [schedule, now]);

  const failureGroups = useMemo(() => {
    const latestByTask = new Map<string, { failure: (typeof failures)[number]; total: number }>();
    for (const failure of failures) {
      const entry = latestByTask.get(failure.taskName);
      if (!entry) {
        latestByTask.set(failure.taskName, { failure, total: failure.count });
      } else {
        entry.total += failure.count;
        if (new Date(failure.lastSeen) > new Date(entry.failure.lastSeen)) entry.failure = failure;
      }
    }
    return [...latestByTask.values()]
      .sort((a, b) => new Date(b.failure.lastSeen).getTime() - new Date(a.failure.lastSeen).getTime())
      .slice(0, 4);
  }, [failures]);

  const publicCount = tasks.filter((t) => t.type === 'public').length;
  const privateCount = tasks.filter((t) => t.type === 'private').length;
  const affectedTasks = new Set(failures.map((f) => f.taskName)).size;
  const nextRunTime = nextTask
    ? new Date(nextTask.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        actions={
          <Button variant="outline" onClick={onRecordTask}>
            <Circle className="fill-destructive text-destructive" />
            Record task
          </Button>
        }
      />

      {showLocationWarning && (
        <LocationWarning onDismiss={dismissLocationWarning} onGoToSettings={() => onNavigate('settings')} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Scheduler"
          value={
            <span className="inline-flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', schedulerStatus ? 'bg-success' : 'bg-faint')} aria-hidden="true" />
              {schedulerStatus ? 'Running' : 'Stopped'}
            </span>
          }
          detail={`${schedule.length} schedule${schedule.length !== 1 ? 's' : ''} configured`}
          action={
            <Button
              variant="outline"
              size="sm"
              className="-mr-1 -mt-1 h-6 px-2"
              onClick={schedulerStatus ? stopScheduler : startScheduler}
            >
              {schedulerStatus ? 'Stop' : 'Start'}
            </Button>
          }
        />
        <Stat
          label="Next run"
          value={
            <span className="font-mono text-[22px]">
              {schedulerStatus && remainingMs !== null ? formatCountdown(remainingMs) : '—'}
            </span>
          }
          detail={
            !schedulerStatus
              ? 'Scheduler is stopped'
              : nextTask
                ? <><span className="text-muted-foreground">{nextTask.task}</span> at {nextRunTime}</>
                : 'Nothing queued'
          }
        />
        <Stat
          label="Tasks"
          value={tasks.length}
          detail={
            runningTasks.size > 0
              ? <span className="text-primary">{runningTasks.size} running now</span>
              : `${publicCount} public · ${privateCount} private`
          }
          onClick={() => onNavigate('tasks')}
        />
        <Stat
          label="Failures"
          value={failures.length}
          valueClassName={failures.length > 0 ? 'text-destructive' : undefined}
          detail={failures.length > 0 ? `${affectedTasks} task${affectedTasks !== 1 ? 's' : ''} affected` : 'Nothing has failed'}
          onClick={() => onNavigate('failures')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Upcoming</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('schedule')}>
                Schedule
                <ArrowRight />
              </Button>
            </CardHeader>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nothing scheduled" className="py-8" />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map(({ item, next }, i) => (
                  <li key={`${item.task}-${i}`} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-24 shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
                      {next.toDateString() !== now.toDateString() && (
                        <span className="text-faint">{next.toLocaleDateString([], { weekday: 'short' })} </span>
                      )}
                      {next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{item.task}</span>
                    <span className="shrink-0 truncate text-xs text-faint">{describeSchedule(item)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Recent failures</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('failures')}>
                All failures
                <ArrowRight />
              </Button>
            </CardHeader>
            {failureGroups.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No failures" className="py-8" />
            ) : (
              <ul className="divide-y divide-border">
                {failureGroups.map(({ failure, total }) => {
                  const type = getFailureType(failure.errorType);
                  return (
                    <li key={failure.taskName} className="flex items-center gap-3 px-4 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-foreground">{failure.taskName}</span>
                        <span className={cn('block truncate text-xs', type.tone)}>{type.label}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-faint">
                        <span className="block font-mono text-destructive">{total}×</span>
                        {formatAgo(failure.lastSeen)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <LogsConsole
          title="Activity"
          logs={logs}
          onClearLogs={clearLogs}
          limit={300}
          className="min-h-[420px]"
          bodyClassName="flex-1 h-0 min-h-[360px]"
        />
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { describeSchedule, formatDayTime, getNextRun, isSameSchedule } from '@/lib/schedule';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/utils';
import type { ScheduleItem } from './types';

interface ScheduleListProps {
  schedule: ScheduleItem[];
  onDeleteSchedule: (index: number) => void;
  className?: string;
}

/** Active schedules, soonest first. Deleting asks for confirmation. */
export function ScheduleList({ schedule, onDeleteSchedule, className }: ScheduleListProps) {
  // Hold the entry itself, not its index: the list can change (e.g. a
  // one-time run completes) while the confirmation is open.
  const [pendingItem, setPendingItem] = useState<ScheduleItem | null>(null);
  const now = useNow(30_000);

  const rows = useMemo(() => {
    return schedule
      .map((item, index) => ({ item, index, next: getNextRun(item, now) }))
      .sort((a, b) => (a.next?.getTime() ?? Infinity) - (b.next?.getTime() ?? Infinity));
  }, [schedule, now]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <CardTitle>
          Active schedules
          <span className="font-mono text-xs font-normal text-faint tabular-nums">{schedule.length}</span>
        </CardTitle>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled"
          description="Pick a task and a rule to add the first schedule."
        />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ item, index, next }) => (
            <li key={`${item.task}-${index}`} className="group flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[13px] font-medium text-foreground">{item.task}</span>
                  <span className="truncate text-xs text-muted-foreground">{describeSchedule(item)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-faint">
                  {next ? (
                    <span>Next {formatDayTime(next, now)}</span>
                  ) : item.executeAt ? (
                    <span className="text-warning">Overdue</span>
                  ) : (
                    <span>No upcoming run</span>
                  )}
                  {item.cron && <span className="font-mono">{item.cron}</span>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPendingItem(item)}
                aria-label={`Delete schedule for ${item.task}`}
                title="Delete schedule"
                className="hover:text-destructive"
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingItem !== null}
        onOpenChange={(open) => !open && setPendingItem(null)}
        title="Delete schedule?"
        description={
          pendingItem
            ? `${pendingItem.task} (${describeSchedule(pendingItem).toLowerCase()}) will no longer run.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (!pendingItem) return;
          const index = schedule.findIndex((entry) => isSameSchedule(entry, pendingItem));
          if (index !== -1) onDeleteSchedule(index);
        }}
      />
    </Card>
  );
}

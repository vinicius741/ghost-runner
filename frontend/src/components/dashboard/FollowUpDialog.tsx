import { useState, type FormEvent } from 'react';
import type { Task } from '@shared/types';
import { AlarmClockPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { useNow } from '@/hooks/useNow';
import { formatDayTime } from '@/lib/schedule';
import {
  FOLLOW_UP_PRESETS,
  followUpExecuteAt,
  formatDelay,
  loadFollowUp,
  toDelayMinutes,
  type FollowUp,
} from '@/lib/followUp';

interface FollowUpDialogProps {
  /** Task the dialog was opened from; null keeps it closed. */
  sourceTask: string | null;
  tasks: Task[];
  /** When the source task is already running, the dialog only schedules. */
  sourceRunning: boolean;
  schedulerRunning: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (sourceTask: string, followUp: FollowUp, runNow: boolean) => void;
}

/**
 * Run a task now and queue a one-time follow-up run in the same step, so the
 * common "run it, then again in an hour" routine needs no trip to Schedule.
 */
export function FollowUpDialog({ sourceTask, onOpenChange, ...rest }: FollowUpDialogProps) {
  return (
    <Dialog open={sourceTask !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        {/* Keyed so each opening starts from that task's remembered follow-up. */}
        {sourceTask !== null && <FollowUpForm key={sourceTask} sourceTask={sourceTask} onOpenChange={onOpenChange} {...rest} />}
      </DialogContent>
    </Dialog>
  );
}

type DelayChoice = `${(typeof FOLLOW_UP_PRESETS)[number]}` | 'custom';

function FollowUpForm({
  sourceTask,
  tasks,
  sourceRunning,
  schedulerRunning,
  onOpenChange,
  onConfirm,
}: Omit<FollowUpDialogProps, 'sourceTask'> & { sourceTask: string }) {
  const [initial] = useState(() => loadFollowUp(sourceTask, tasks));
  const initialIsPreset = (FOLLOW_UP_PRESETS as readonly number[]).includes(initial.delayMinutes);

  const [followUpTask, setFollowUpTask] = useState(initial.task);
  const [choice, setChoice] = useState<DelayChoice>(
    initialIsPreset ? (String(initial.delayMinutes) as DelayChoice) : 'custom'
  );
  const [customHours, setCustomHours] = useState(Math.floor(initial.delayMinutes / 60));
  const [customMinutes, setCustomMinutes] = useState(initial.delayMinutes % 60);
  const now = useNow(15_000);

  const delayMinutes = choice === 'custom' ? toDelayMinutes(customHours, customMinutes) : Number(choice);
  const valid = delayMinutes >= 1 && followUpTask !== '';
  const runsAt = followUpExecuteAt(delayMinutes, now);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onConfirm(sourceTask, { task: followUpTask, delayMinutes }, !sourceRunning);
    onOpenChange(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{sourceRunning ? 'Schedule a follow-up' : 'Run with follow-up'}</DialogTitle>
        <DialogDescription>
          {sourceRunning ? (
            <>
              <span className="font-medium text-foreground">{sourceTask}</span> is already running. Queue a
              one-time run to follow it.
            </>
          ) : (
            <>
              Runs <span className="font-medium text-foreground">{sourceTask}</span> now and queues a one-time
              follow-up.
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="follow-up-task">Follow-up task</Label>
        <Select value={followUpTask} onValueChange={setFollowUpTask}>
          <SelectTrigger id="follow-up-task">
            <SelectValue placeholder="Choose a task" />
          </SelectTrigger>
          <SelectContent>
            {tasks.map((t) => (
              <SelectItem key={`${t.name}-${t.type}`} value={t.name}>
                {t.name === sourceTask ? `${t.name} (same task)` : t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label id="follow-up-delay-label">Run it in</Label>
        <SegmentedControl
          ariaLabelledBy="follow-up-delay-label"
          className="flex w-full"
          value={choice}
          onChange={(value) => {
            if (value === 'custom' && choice !== 'custom') {
              // Start the custom fields from the preset being replaced.
              setCustomHours(Math.floor(delayMinutes / 60));
              setCustomMinutes(delayMinutes % 60);
            }
            setChoice(value);
          }}
          options={[
            ...FOLLOW_UP_PRESETS.map((minutes) => ({
              value: String(minutes) as DelayChoice,
              label: formatDelay(minutes),
            })),
            { value: 'custom' as const, label: 'Custom' },
          ]}
        />
        {choice === 'custom' && (
          <div className="flex items-center gap-2 pt-1 text-[13px] text-muted-foreground">
            <Input
              type="number"
              min={0}
              value={customHours}
              onChange={(e) => setCustomHours(parseInt(e.target.value) || 0)}
              className="h-8 w-16 text-center tabular-nums"
              aria-label="Hours from now"
            />
            <span>h</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 0)}
              className="h-8 w-16 text-center tabular-nums"
              aria-label="Minutes from now"
            />
            <span>m</span>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border bg-background px-3 py-2 text-[13px] text-muted-foreground">
        {valid ? (
          <>
            <span className="text-foreground">{followUpTask}</span> runs{' '}
            <span className="font-mono tabular-nums text-foreground">{formatDayTime(runsAt, now)}</span>
          </>
        ) : (
          'Choose a delay of at least one minute.'
        )}
        {!schedulerRunning && (
          <p className="mt-1 text-xs text-warning">The scheduler is stopped. It will be started so this runs.</p>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          <AlarmClockPlus />
          {sourceRunning ? 'Schedule follow-up' : 'Run now + follow up'}
        </Button>
      </DialogFooter>
    </form>
  );
}

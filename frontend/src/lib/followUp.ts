import type { Task } from '@shared/types';

/** A one-time run scheduled relative to running another task. */
export interface FollowUp {
  /** Task to run later. Often the task just run, but can be any task. */
  task: string;
  /** Minutes from now. Always a whole number of at least 1. */
  delayMinutes: number;
}

/** Delay shortcuts offered in the follow-up dialog, in minutes. */
export const FOLLOW_UP_PRESETS = [30, 60, 90, 120] as const;

export const DEFAULT_FOLLOW_UP_DELAY_MINUTES = 60;

const STORAGE_KEY = 'ghost-runner-follow-ups';

/** "30m", "1h", "1h 30m". */
export function formatDelay(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Whole minutes from an hours/minutes pair, ignoring blanks and negatives. */
export function toDelayMinutes(hours: number, minutes: number): number {
  const safe = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
  return safe(hours) * 60 + safe(minutes);
}

export function followUpExecuteAt(delayMinutes: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + delayMinutes * 60_000);
}

function readAll(): Record<string, FollowUp> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, FollowUp>) : {};
  } catch {
    return {};
  }
}

/**
 * The follow-up last used after running `sourceTask`, so a repeated routine
 * needs no re-entry. Falls back to the same task in one hour, and ignores a
 * remembered follow-up task that no longer exists.
 */
export function loadFollowUp(sourceTask: string, tasks: Task[]): FollowUp {
  const fallback: FollowUp = { task: sourceTask, delayMinutes: DEFAULT_FOLLOW_UP_DELAY_MINUTES };
  const stored = readAll()[sourceTask];
  if (!stored || typeof stored !== 'object') return fallback;

  const task =
    typeof stored.task === 'string' && tasks.some((t) => t.name === stored.task) ? stored.task : sourceTask;
  const delayMinutes =
    typeof stored.delayMinutes === 'number' && Number.isFinite(stored.delayMinutes) && stored.delayMinutes >= 1
      ? Math.floor(stored.delayMinutes)
      : DEFAULT_FOLLOW_UP_DELAY_MINUTES;
  return { task, delayMinutes };
}

export function saveFollowUp(sourceTask: string, followUp: FollowUp): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [sourceTask]: followUp }));
  } catch {
    // Remembering is a convenience; the follow-up itself is already scheduled.
  }
}

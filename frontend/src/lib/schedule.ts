import { CronExpressionParser } from 'cron-parser';
import type { ScheduleItem } from '@shared/types';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Turn a schedule entry into a short human sentence. Falls back to the raw
 * cron expression for patterns the builder does not produce.
 */
export function describeSchedule(item: ScheduleItem): string {
  if (item.executeAt) {
    const date = new Date(item.executeAt);
    if (Number.isNaN(date.getTime())) return 'Once';
    return `Once, ${formatDayTime(date)}`;
  }

  if (!item.cron) return 'No rule';

  const parts = item.cron.trim().split(/\s+/);
  if (parts.length === 5) {
    const [min, hour, dom, mon, dow] = parts;
    const restIsWild = dom === '*' && mon === '*' && dow === '*';

    if (restIsWild && hour === '*' && min === '*') return 'Every minute';

    const everyN = /^\*\/(\d+)$/.exec(min);
    if (restIsWild && hour === '*' && everyN) {
      const n = Number(everyN[1]);
      return n === 1 ? 'Every minute' : `Every ${n} minutes`;
    }

    if (restIsWild && hour === '*' && /^\d+$/.test(min)) {
      return `Hourly at :${pad(Number(min))}`;
    }

    if (restIsWild && /^\d+$/.test(hour) && /^\d+$/.test(min)) {
      return `Daily at ${pad(Number(hour))}:${pad(Number(min))}`;
    }
  }

  return item.cron;
}

/** Next time a schedule entry fires after `from`, or null when it never will. */
export function getNextRun(item: ScheduleItem, from: Date = new Date()): Date | null {
  if (item.executeAt) {
    const date = new Date(item.executeAt);
    // A one-time run in the past will not fire again.
    return Number.isNaN(date.getTime()) || date.getTime() < from.getTime() ? null : date;
  }

  if (!item.cron) return null;

  try {
    return CronExpressionParser.parse(item.cron, { currentDate: from }).next().toDate();
  } catch {
    return null;
  }
}

/** "Today 14:05", "Tomorrow 09:00", or "Mon 3 Feb 09:00". */
export function formatDayTime(date: Date, now: Date = new Date()): string {
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);

  if (dayDiff === 0) return `today ${time}`;
  if (dayDiff === 1) return `tomorrow ${time}`;
  if (dayDiff === -1) return `yesterday ${time}`;

  const day = date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} ${time}`;
}

/** Compact countdown: "2h 05m", "12m 31s", "45s". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}

/** Relative past time: "just now", "5m ago", "3h ago", or a date. */
export function formatAgo(timestamp: string, now: Date = new Date()): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'unknown';

  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** Same task and rule. Used to find an entry again after the list changes. */
export function isSameSchedule(a: ScheduleItem, b: ScheduleItem): boolean {
  return a.task === b.task && a.cron === b.cron && a.executeAt === b.executeAt;
}

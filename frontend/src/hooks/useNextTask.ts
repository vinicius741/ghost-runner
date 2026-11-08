import { useCallback, useEffect, useState } from 'react';
import type { NextTask } from '@shared/types';
import { apiClient } from '@/lib/apiClient';

const POLL_MS = 30_000;

export interface NextTaskState {
  nextTask: NextTask | null;
  /** Milliseconds until the next run, or null when nothing is queued. */
  remainingMs: number | null;
}

/**
 * Polls the scheduler for the next queued task while it is running and
 * ticks a once-per-second countdown toward it.
 */
export function useNextTask(schedulerRunning: boolean): NextTaskState {
  const [nextTask, setNextTask] = useState<NextTask | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchNextTask = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/scheduler/next-task');
      setNextTask(res.data.nextTask ?? null);
    } catch {
      // apiClient already logs request failures.
    }
  }, []);

  useEffect(() => {
    if (!schedulerRunning) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNextTask(null);
      return;
    }

    void fetchNextTask();
    const interval = setInterval(() => void fetchNextTask(), POLL_MS);
    return () => clearInterval(interval);
  }, [schedulerRunning, fetchNextTask]);

  useEffect(() => {
    if (!nextTask) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [nextTask]);

  const target = nextTask ? new Date(nextTask.nextRun).getTime() : null;
  const remainingMs = target === null || Number.isNaN(target) ? null : target - now;

  // Once the target passes, ask the server for the following run.
  const isDue = remainingMs !== null && remainingMs <= 0;
  useEffect(() => {
    if (!isDue) return;
    const timeout = setTimeout(() => void fetchNextTask(), 1500);
    return () => clearTimeout(timeout);
  }, [isDue, fetchNextTask]);

  return { nextTask, remainingMs };
}

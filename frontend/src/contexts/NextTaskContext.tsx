/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react';
import { useNextTask, type NextTaskState } from '@/hooks/useNextTask';

const NextTaskContext = createContext<NextTaskState>({ nextTask: null, remainingMs: null });

/**
 * Owns the single next-task poller and countdown. Its once-per-second
 * updates re-render only components that read it, not the whole shell.
 */
export function NextTaskProvider({ schedulerRunning, children }: { schedulerRunning: boolean; children: ReactNode }) {
  const state = useNextTask(schedulerRunning);
  return <NextTaskContext.Provider value={state}>{children}</NextTaskContext.Provider>;
}

export function useNextTaskState(): NextTaskState {
  return useContext(NextTaskContext);
}

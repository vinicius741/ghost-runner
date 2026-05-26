import { useState, useCallback, useEffect } from 'react';
import type { FailureRecord } from '@shared/types';
import { getSocket } from './dashboardSocket';
import type { LogType } from './useDashboardLogs';

/**
 * Hook to manage task failure records state and actions.
 */
export function useDashboardFailures(addLog: (message: string, type?: LogType) => void) {
  const [failures, setFailures] = useState<FailureRecord[]>([]);

  const fetchFailures = useCallback(async () => {
    try {
      const res = await fetch('/api/failures');
      const data = await res.json();
      setFailures(data.failures || []);
    } catch (error) {
      addLog('Error fetching failures', 'error');
      console.error('Error fetching failures:', error);
    }
  }, [addLog]);

  const clearFailures = useCallback(async () => {
    try {
      const res = await fetch('/api/failures', { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFailures([]);
      addLog('All failures cleared', 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error clearing failures: ${message}`, 'error');
    }
  }, [addLog]);

  const dismissFailure = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/failures/${id}/dismiss`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFailures((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error dismissing failure: ${message}`, 'error');
    }
  }, [addLog]);

  // Set up socket event listeners and initial fetch
  useEffect(() => {
    fetchFailures();

    const socket = getSocket();

    const handleFailureRecorded = (failure: FailureRecord) => {
      setFailures((prev) => [...prev, failure]);
      addLog(`Task failure recorded: ${failure.taskName}`, 'error');
    };

    const handleFailuresCleared = () => {
      setFailures([]);
      addLog('All failures cleared', 'system');
    };

    const handleFailureDismissed = (id: string) => {
      setFailures((prev) => prev.filter((f) => f.id !== id));
    };

    socket.on('failure-recorded', handleFailureRecorded);
    socket.on('failures-cleared', handleFailuresCleared);
    socket.on('failure-dismissed', handleFailureDismissed);

    return () => {
      socket.off('failure-recorded', handleFailureRecorded);
      socket.off('failures-cleared', handleFailuresCleared);
      socket.off('failure-dismissed', handleFailureDismissed);
    };
  }, [fetchFailures, addLog]);

  return {
    failures,
    clearFailures,
    dismissFailure,
  };
}
